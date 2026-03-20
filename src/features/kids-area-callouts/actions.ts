"use server";

import { createHash } from "crypto";
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { HumeClient } from "hume";
import { revalidatePath } from "next/cache";

import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { env } from "@/data/env/server";
import { db } from "@/drizzle";
import {
    KidsAreaCalloutPhrasesTable,
    ReservationsTable,
} from "@/drizzle/schema";
import { TTSCacheTable } from "@/drizzle/schemas/kids/tts-cache-table";
import type {
    ActiveKidInArea,
    KidsAreaCalloutPhraseDTO,
} from "@/features/kids-area-callouts/types";
import { getT } from "@/lib/i18n/actions";
import type { ServerActionResponse } from "@/types/server-actions";

function normalizeTemplate(template: string) {
    return template.replace(/\s+/g, " ").trim();
}

async function getOrCreateTTSForCalloutText({
    text,
    description,
    cacheKey,
}: {
    text: string;
    description: string;
    cacheKey: string;
}) {
    const hash = createHash("sha256").update(cacheKey).digest("hex").slice(0, 16);
    const key = `callout_${hash}`;

    // Check DB cache — if we have a record, the audio was generated before.
    // The announcer should have the file on disk already.
    const cached = await db
        .select({ url: TTSCacheTable.url })
        .from(TTSCacheTable)
        .where(eq(TTSCacheTable.text, cacheKey))
        .limit(1);

    if (cached.length > 0) {
        // Already generated — announcer has it on disk.
        return { key, base64: null as string | null };
    }

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
        throw new Error("Failed to generate audio from TTS service.");
    }

    const base64Payload = rawAudio.includes(",")
        ? rawAudio.substring(rawAudio.indexOf(",") + 1)
        : rawAudio;

    // Record in DB that this text has been generated.
    try {
        await db
            .insert(TTSCacheTable)
            .values({ text: cacheKey, url: key })
            .onConflictDoNothing();
    } catch {
        // Non-fatal
    }

    return { key, base64: base64Payload as string | null };
}

export async function getKidsAreaCalloutTTSAction(input: {
    text: string;
    locale: "en" | "ar";
}): Promise<ServerActionResponse<{ key: string; base64: string | null }>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        const { t } = await getT();

        if (!hasPermission(user, "reservations", "view")) {
            return { error: true, message: t("errors.unauthorized") };
        }

        const text = input.text.trim();
        if (!text) {
            return { error: false, data: { key: "", base64: null } };
        }

        const cacheKey = `kids_area_callout:${input.locale}:${text}`;
        const description =
            input.locale === "ar"
                ? "The voice is warm, clear, and professional. Speak with calm authority, as if making a public announcement in a shopping mall. Maintain a polite and reassuring tone, with natural pacing and clear pronunciation in Arabic Egyptian."
                : "The voice is warm, clear, and professional. Speak with calm authority, as if making a public announcement in a shopping mall. Maintain a polite and reassuring tone, with natural pacing and clear pronunciation in English.";

        const result = await getOrCreateTTSForCalloutText({
            text,
            description,
            cacheKey,
        });

        return { error: false, data: result };
    } catch {
        const { t } = await getT();
        return { error: true, message: t("errors.messageFailed") };
    }
}

export async function getActiveKidsInAreaAction(): Promise<
    ServerActionResponse<ActiveKidInArea[]>
> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        const { t } = await getT();
        if (!hasPermission(user, "reservations", "view")) {
            return { error: true, message: t("errors.unauthorized") };
        }

        const now = new Date();

        // Definition of "active in kids area": reservation is started and not yet ended.
        const rows = await db
            .select({
                id: ReservationsTable.id,
                customerName: ReservationsTable.customerName,
                reservationCode: ReservationsTable.reservationCode,
                startTime: ReservationsTable.startTime,
                endTime: ReservationsTable.endTime,
            })
            .from(ReservationsTable)
            .where(
                and(
                    isNull(ReservationsTable.deletedAt),
                    eq(ReservationsTable.status, "started"),
                    gt(ReservationsTable.endTime, now),
                ),
            )
            .orderBy(
                asc(ReservationsTable.endTime),
                asc(ReservationsTable.startTime),
            );

        return {
            error: false,
            data: rows.map((r) => ({
                reservationId: r.id,
                kidName: r.customerName.trim() ? r.customerName.trim() : null,
                reservationCode: r.reservationCode,
                startTime: new Date(r.startTime).toISOString(),
                endTime: new Date(r.endTime).toISOString(),
            })),
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function getKidsAreaCalloutPhrasesAction(): Promise<
    ServerActionResponse<KidsAreaCalloutPhraseDTO[]>
> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        const { t } = await getT();
        if (!hasPermission(user, "reservations", "view")) {
            return { error: true, message: t("errors.unauthorized") };
        }

        const rows = await db
            .select({
                id: KidsAreaCalloutPhrasesTable.id,
                template: KidsAreaCalloutPhrasesTable.template,
                sortOrder: KidsAreaCalloutPhrasesTable.sortOrder,
            })
            .from(KidsAreaCalloutPhrasesTable)
            .where(isNull(KidsAreaCalloutPhrasesTable.deletedAt))
            .orderBy(
                asc(KidsAreaCalloutPhrasesTable.sortOrder),
                asc(KidsAreaCalloutPhrasesTable.createdAt),
            );

        return { error: false, data: rows };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function saveKidsAreaCalloutPhrasesAction(input: {
    phrases: Array<{ id?: string; template: string }>;
}): Promise<ServerActionResponse<true>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        const { t } = await getT();
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: t("errors.unauthorized") };
        }

        const normalized = input.phrases
            .map((p, idx) => ({
                id: p.id?.trim() || undefined,
                template: normalizeTemplate(p.template),
                sortOrder: idx,
            }))
            .filter((p) => p.template.length > 0);

        // Load current active phrases
        const existing = await db
            .select({ id: KidsAreaCalloutPhrasesTable.id })
            .from(KidsAreaCalloutPhrasesTable)
            .where(isNull(KidsAreaCalloutPhrasesTable.deletedAt));

        const existingIds = existing.map((r) => r.id);
        const keepIds = normalized.flatMap((p) => (p.id ? [p.id] : []));

        // Soft-delete removed ones
        if (existingIds.length > 0) {
            const toDelete = existingIds.filter((id) => !keepIds.includes(id));
            if (toDelete.length > 0) {
                await db
                    .update(KidsAreaCalloutPhrasesTable)
                    .set({
                        deletedAt: new Date(),
                        deletedBy: user.email,
                        updatedAt: new Date(),
                        updatedBy: user.email,
                    })
                    .where(inArray(KidsAreaCalloutPhrasesTable.id, toDelete));
            }
        }

        // Upsert submitted ones
        for (const row of normalized) {
            if (row.id) {
                await db
                    .update(KidsAreaCalloutPhrasesTable)
                    .set({
                        template: row.template,
                        sortOrder: row.sortOrder,
                        updatedAt: new Date(),
                        updatedBy: user.email,
                        deletedAt: null,
                        deletedBy: null,
                    })
                    .where(eq(KidsAreaCalloutPhrasesTable.id, row.id));
            } else {
                await db.insert(KidsAreaCalloutPhrasesTable).values({
                    template: row.template,
                    sortOrder: row.sortOrder,
                    createdBy: user.email,
                    updatedBy: user.email,
                });
            }
        }

        revalidatePath("/playground");
        return { error: false, data: true };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}
