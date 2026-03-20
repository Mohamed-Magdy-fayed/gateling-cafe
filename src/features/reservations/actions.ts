"use server";

import { createHash } from "crypto";
import {
    and,
    between,
    count,
    desc,
    eq,
    inArray,
    isNull,
    lte,
} from "drizzle-orm";
import { HumeClient } from "hume";
import { revalidatePath } from "next/cache";

import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { env } from "@/data/env/server";
import { db } from "@/drizzle";
import { type Reservation, ReservationsTable } from "@/drizzle/schema";
import {
    type PlaytimeOption,
    PlaytimeOptionsTable,
} from "@/drizzle/schemas/kids/playtime-options-table";
import { TTSCacheTable } from "@/drizzle/schemas/kids/tts-cache-table";
import { TTSSettingsTable } from "@/drizzle/schemas/kids/tts-settings-table";
import { getActiveShift } from "@/features/dashboard/get-active-shift";
import { insertOrGetCustomer } from "@/features/helpers";
import {
    type ReservationCreateValues,
    type ReservationUpdateValues,
    reservationCreateSchema,
    reservationUpdateSchema,
} from "@/features/reservations/schemas";
import { generateReservationCode } from "@/features/reservations/utils";
import { getT } from "@/lib/i18n/actions";
import type { ServerActionResponse } from "@/types/server-actions";

const TTS_ANNOUNCEMENT_KEY = "reservations_child_pickup";
const DEFAULT_TTS_TEMPLATE_EN =
    "Attention please: {name} has finished the playtime in Lavida Jungle Play. Would the parents please come to pick them up?";
const DEFAULT_TTS_TEMPLATE_AR =
    "يرجى الانتباه: {name} انتهى وقت اللعب في Lavida Jungle Play. الرجاء من الوالدين الحضور لاستلامه.";

function applyNameTemplate(template: string, name: string) {
    return template.replaceAll("{name}", name).replaceAll("{customerName}", name);
}

const LOCAL_ANNOUNCER_URL =
    process.env.NEXT_PUBLIC_LOCAL_ANNOUNCER_URL?.trim() ||
    "http://127.0.0.1:17777";

function scheduleWithLocalAnnouncer(payload: {
    reservationId: string;
    endTimeUtc: string;
    customerName: string;
}) {
    // Fire-and-forget — don't block reservation creation if the local service is down.
    fetch(`${LOCAL_ANNOUNCER_URL}/schedule-reservation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            reservationId: payload.reservationId,
            endTimeUtc: payload.endTimeUtc,
            customerName: payload.customerName,
            duck: true,
        }),
    }).catch(() => {
        // Local service might be offline — non-fatal.
        console.warn(
            `[Announcer] Failed to schedule reservation ${payload.reservationId}`,
        );
    });
}

async function synthesizeTTSBase64ForText({
    text,
    description,
    label,
}: {
    text: string;
    description: string;
    label: string;
}) {
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 8);
    const key = `${label}-${hash}`;
    const cacheKey = `reservation_announcement:${key}`;

    // Check DB cache first to avoid redundant Hume API calls
    try {
        const cached = await db
            .select()
            .from(TTSCacheTable)
            .where(eq(TTSCacheTable.text, cacheKey))
            .limit(1);

        if (cached.length > 0 && cached[0].url.startsWith("data:audio/mpeg;base64,")) {
            console.log(`[TTS] Cache hit for "${key}"`);
            const base64 = cached[0].url.slice("data:audio/mpeg;base64,".length);
            return { key, base64, contentType: "audio/mpeg" as const };
        }
    } catch (error) {
        console.error(`[TTS] Cache lookup failed for "${key}":`, error);
        // Fall through to generate fresh audio
    }

    console.log(`[TTS] Cache miss for "${key}", calling Hume API...`);

    const client = new HumeClient({ apiKey: env.HUME_API_KEY });

    const response = await client.tts.synthesizeJson({
        format: {
            type: "mp3",
        },
        numGenerations: 1,
        utterances: [
            {
                text,
                description,
            },
        ],
        version: "1",
    });

    const rawAudio = response.generations[0]?.audio;
    if (!rawAudio) {
        console.error(`[TTS] Hume returned no audio for "${key}"`);
        throw new Error(`TTS generation failed for "${key}".`);
    }

    const base64Payload = rawAudio.includes(",")
        ? rawAudio.substring(rawAudio.indexOf(",") + 1)
        : rawAudio;

    console.log(`[TTS] Generated audio for "${key}" (${base64Payload.length} base64 chars)`);

    // Cache base64 directly in DB — no external storage needed.
    // The local announcer saves files to disk on its own.
    const dataUri = `data:audio/mpeg;base64,${base64Payload}`;

    try {
        await db
            .insert(TTSCacheTable)
            .values({ text: cacheKey, url: dataUri })
            .onConflictDoNothing();
        console.log(`[TTS] Cached "${key}" in DB`);
    } catch (error) {
        console.error(`[TTS] Failed to cache "${key}" in DB:`, error);
        // Non-fatal — still return the audio
    }

    return {
        key,
        base64: base64Payload,
        contentType: "audio/mpeg" as const,
    };
}

async function getAnnouncementTexts(name: string) {
    const trimmedName = name.trim();

    const templates = await db
        .select({
            templateEn: TTSSettingsTable.templateEn,
            templateAr: TTSSettingsTable.templateAr,
        })
        .from(TTSSettingsTable)
        .where(eq(TTSSettingsTable.key, TTS_ANNOUNCEMENT_KEY))
        .limit(1)
        .then((res) => res[0]);

    const textEn = applyNameTemplate(
        templates?.templateEn ?? DEFAULT_TTS_TEMPLATE_EN,
        trimmedName,
    );
    const textAr = applyNameTemplate(
        templates?.templateAr ?? DEFAULT_TTS_TEMPLATE_AR,
        trimmedName,
    );

    return { textEn, textAr };
}

export async function getAnnouncementTTSKeys(name: string) {
    const { textEn, textAr } = await getAnnouncementTexts(name);
    const safeName = name.trim().replace(/[^a-zA-Z0-9\u0600-\u06FF _-]/g, "").replace(/\s+/g, "_");

    return {
        enKey: `${safeName}-en-${createHash("sha256").update(textEn).digest("hex").slice(0, 8)}`,
        arKey: `${safeName}-ar-${createHash("sha256").update(textAr).digest("hex").slice(0, 8)}`,
    };
}

export async function getReservations(): Promise<
    ServerActionResponse<Reservation[]>
> {
    const user = await getCurrentUser({ redirectIfNotFound: true });

    if (!hasPermission(user, "reservations", "view")) {
        return { error: true, message: "Unauthorized" };
    }

    return {
        error: false,
        data: await db.query.ReservationsTable.findMany({
            where: isNull(ReservationsTable.deletedAt),
        }),
    };
}

export async function generateReservationCodeAction() {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const order = await db
        .select()
        .from(ReservationsTable)
        .where(and(between(ReservationsTable.createdAt, startOfDay, endOfDay)))
        .limit(1)
        .orderBy(desc(ReservationsTable.reservationCode))
        .then((res) => res[0]);

    const todayCount = order?.reservationCode
        ? parseInt(order.reservationCode.split("-")[2] || "0")
        : 0;

    return generateReservationCode(todayCount);
}

export async function getPlaytimeOptions(): Promise<
    ServerActionResponse<PlaytimeOption[]>
> {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "reservations", "create")) {
        return { error: true, message: "Unauthorized" };
    }

    return {
        error: false,
        data: await db
            .select()
            .from(PlaytimeOptionsTable)
            .where(isNull(PlaytimeOptionsTable.deletedAt))
            .orderBy(PlaytimeOptionsTable.durationMinutes),
    };
}

export async function upsertPlaytimeOption(input: {
    id?: string;
    name: string;
    durationMinutes: number;
    price: number;
}): Promise<ServerActionResponse<PlaytimeOption>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const name = input.name.trim();
        if (!name) {
            return { error: true, message: "Invalid" };
        }

        if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
            return { error: true, message: "Invalid" };
        }

        if (!Number.isFinite(input.price) || input.price < 0) {
            return { error: true, message: "Invalid" };
        }

        const values = {
            name,
            durationMinutes: Math.round(input.durationMinutes),
            price: Math.round(input.price),
            updatedBy: user.email,
        } as const;

        let row: PlaytimeOption | undefined;
        if (input.id) {
            row = await db
                .update(PlaytimeOptionsTable)
                .set({
                    ...values,
                    updatedAt: new Date(),
                })
                .where(eq(PlaytimeOptionsTable.id, input.id))
                .returning()
                .then((res) => res[0]);
        } else {
            row = await db
                .insert(PlaytimeOptionsTable)
                .values({
                    ...values,
                    createdBy: user.email,
                })
                .returning()
                .then((res) => res[0]);
        }

        if (!row) {
            return { error: true, message: "Invalid" };
        }

        revalidatePath("/reservations");
        return { error: false, data: row };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function deletePlaytimeOption(
    id: string,
): Promise<ServerActionResponse<true>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        await db
            .update(PlaytimeOptionsTable)
            .set({
                deletedAt: new Date(),
                deletedBy: user.email,
                updatedBy: user.email,
                updatedAt: new Date(),
            })
            .where(eq(PlaytimeOptionsTable.id, id));

        revalidatePath("/reservations");
        return { error: false, data: true };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function createReservation(
    data: ReservationCreateValues,
): Promise<ServerActionResponse<Reservation>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "create")) {
            return { error: true, message: "Unauthorized" };
        }

        const activeShift = await getActiveShift();
        if (!activeShift) {
            const { t } = await getT();
            return {
                error: true,
                message: t("reservationsTranslations.shiftRequired"),
            };
        }

        const { success, data: reservationData } =
            reservationCreateSchema.safeParse(data);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        const playtimeOption = await db
            .select()
            .from(PlaytimeOptionsTable)
            .where(
                and(
                    eq(PlaytimeOptionsTable.id, reservationData.playtimeOptionId),
                    isNull(PlaytimeOptionsTable.deletedAt),
                ),
            )
            .limit(1)
            .then((res) => res[0]);

        if (!playtimeOption) {
            return { error: true, message: "Invalid" };
        }

        const startTime = new Date();
        const endTime = new Date(
            startTime.getTime() + playtimeOption.durationMinutes * 60_000,
        );

        const { customer } = await insertOrGetCustomer({
            createdBy: user.email,
            customerName: reservationData.customerName,
            customerPhone: reservationData.customerPhone,
            totalSpent: playtimeOption.price,
        });

        const reservation = await db
            .insert(ReservationsTable)
            .values({
                createdBy: user.email,
                customerId: customer.id,
                reservationCode: reservationData.reservationCode,
                customerName: reservationData.customerName,
                customerPhone: reservationData.customerPhone,
                playtimeOptionId: playtimeOption.id,
                startTime,
                endTime,
                persons: reservationData.persons,
                totalPrice: playtimeOption.price * reservationData.persons,
                totalPaid: playtimeOption.price * reservationData.persons,
                status: "started",
                notes: reservationData.notes,
            })
            .returning()
            .then((res) => res[0]);

        // Schedule with local announcer — it handles TTS generation & disk caching.
        scheduleWithLocalAnnouncer({
            reservationId: reservation.id,
            endTimeUtc: endTime.toISOString(),
            customerName: reservationData.customerName.trim(),
        });

        revalidatePath("/reservations");

        return {
            error: false,
            data: reservation,
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function editReservations(
    data: Partial<ReservationUpdateValues> & { ids: string[] },
): Promise<ServerActionResponse<Reservation>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const { ids, ...payload } = data;
        const { success, data: reservationData } =
            reservationUpdateSchema.safeParse(payload);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        const updatePayload = {
            ...reservationData,
            updatedBy: user.email,
        } as Partial<typeof ReservationsTable.$inferInsert>;

        revalidatePath("/reservations");

        return {
            error: false,
            data: await db
                .update(ReservationsTable)
                .set(updatePayload)
                .where(inArray(ReservationsTable.id, ids))
                .returning()
                .then((res) => res[0]),
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

// --- Automation helpers (permission-safe for operators) ---
export async function autoStartDueReservationsAction(): Promise<
    ServerActionResponse<number>
> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "view")) {
            return { error: true, message: "Unauthorized" };
        }

        const now = new Date();

        const updated = await db
            .update(ReservationsTable)
            .set({
                status: "started",
                updatedAt: new Date(),
                updatedBy: user.email,
            })
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    eq(ReservationsTable.status, "reserved"),
                    lte(ReservationsTable.startTime, now),
                ),
            )
            .returning({ id: ReservationsTable.id });

        if (updated.length > 0) {
            revalidatePath("/reservations");
        }

        return { error: false, data: updated.length };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function endReservationIfTimedOutAction(input: {
    id: string;
}): Promise<ServerActionResponse<{ endedNow: boolean }>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "view")) {
            return { error: true, message: "Unauthorized" };
        }

        const now = new Date();

        const reservation = await db
            .select({
                id: ReservationsTable.id,
                status: ReservationsTable.status,
                endTime: ReservationsTable.endTime,
            })
            .from(ReservationsTable)
            .where(
                and(
                    eq(ReservationsTable.id, input.id),
                    isNull(ReservationsTable.deletedAt),
                ),
            )
            .limit(1)
            .then((res) => res[0]);

        if (!reservation) {
            return { error: true, message: "Not found" };
        }

        if (reservation.status === "ended" || reservation.status === "cancelled") {
            return { error: false, data: { endedNow: false } };
        }

        const endTime = new Date(reservation.endTime);
        if (Number.isNaN(endTime.getTime()) || endTime.getTime() > now.getTime()) {
            return { error: true, message: "Not timed out" };
        }

        const ended = await db
            .update(ReservationsTable)
            .set({
                status: "ended",
                updatedAt: new Date(),
                updatedBy: user.email,
            })
            .where(eq(ReservationsTable.id, input.id))
            .returning({ id: ReservationsTable.id });

        if (ended.length > 0) {
            revalidatePath("/reservations");
        }

        return { error: false, data: { endedNow: ended.length > 0 } };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function deleteReservations(
    ids: string[],
): Promise<ServerActionResponse<number>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "delete")) {
            return { error: true, message: "Unauthorized" };
        }

        return {
            error: false,
            data: (
                await db
                    .update(ReservationsTable)
                    .set({
                        deletedAt: new Date(),
                        deletedBy: user.email,
                    })
                    .where(inArray(ReservationsTable.id, ids))
                    .returning()
            ).length,
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function getStatusCounts() {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "reservations", "view")) {
        return [];
    }

    const { t } = await getT();

    const statusCounts = await db
        .select({
            value: ReservationsTable.status,
            count: count(ReservationsTable.status),
        })
        .from(ReservationsTable)
        .groupBy(ReservationsTable.status);

    return statusCounts.map((status) => ({
        ...status,
        label: t(`reservationsTranslations.statusNames`, {
            statusName: status.value,
        }),
    }));
}

export async function getAnnouncementTTSTemplates(): Promise<
    ServerActionResponse<{ templateEn: string; templateAr: string }>
> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const existing = await db
            .select({
                templateEn: TTSSettingsTable.templateEn,
                templateAr: TTSSettingsTable.templateAr,
            })
            .from(TTSSettingsTable)
            .where(eq(TTSSettingsTable.key, TTS_ANNOUNCEMENT_KEY))
            .limit(1)
            .then((res) => res[0]);

        return {
            error: false,
            data: {
                templateEn: existing?.templateEn ?? DEFAULT_TTS_TEMPLATE_EN,
                templateAr: existing?.templateAr ?? DEFAULT_TTS_TEMPLATE_AR,
            },
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function updateAnnouncementTTSTemplates(input: {
    templateEn: string;
    templateAr: string;
}): Promise<ServerActionResponse<true>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const templateEn = input.templateEn.trim();
        const templateAr = input.templateAr.trim();

        if (!templateEn || !templateAr) {
            return { error: true, message: "Both templates are required" };
        }

        await db
            .insert(TTSSettingsTable)
            .values({
                key: TTS_ANNOUNCEMENT_KEY,
                templateEn,
                templateAr,
                createdBy: user.email,
                updatedBy: user.email,
            })
            .onConflictDoUpdate({
                target: TTSSettingsTable.key,
                set: {
                    templateEn,
                    templateAr,
                    updatedBy: user.email,
                    updatedAt: new Date(),
                },
            });

        revalidatePath("/reservations");

        return { error: false, data: true };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function getAnnouncementTTSAudio(name: string) {
    const { textEn, textAr } = await getAnnouncementTexts(name);
    const safeName = name.trim().replace(/[^a-zA-Z0-9\u0600-\u06FF _-]/g, "").replace(/\s+/g, "_");

    console.log(`[TTS] Generating announcement audio for "${safeName}"`);

    const en = await synthesizeTTSBase64ForText({
        text: textEn,
        description:
            "The voice is warm, clear, and professional. Speak with calm authority, as if making a public announcement in a shopping mall. Maintain a polite and reassuring tone, with natural pacing and clear pronunciation in English.",
        label: `${safeName}-en`,
    });

    const ar = await synthesizeTTSBase64ForText({
        text: textAr,
        description:
            "The voice is warm, clear, and professional. Speak with calm authority, as if making a public announcement in a shopping mall. Maintain a polite and reassuring tone, with natural pacing and clear pronunciation in Arabic Egyptian.",
        label: `${safeName}-ar`,
    });

    console.log(`[TTS] Audio ready for "${safeName}" — en: ${en.key}, ar: ${ar.key}`);

    return {
        en,
        ar,
    };
}
