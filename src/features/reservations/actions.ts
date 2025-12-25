"use server";

import { Buffer } from "node:buffer";
import { createHash } from "crypto";
import { and, between, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { HumeClient } from "hume";
import { revalidatePath } from "next/cache";

import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { env } from "@/data/env/server";
import { db } from "@/drizzle";
import { type Reservation, ReservationsTable } from "@/drizzle/schema";
import { TTSCacheTable } from "@/drizzle/schemas/kids/tts-cache-table";
import { insertOrGetCustomer } from "@/features/helpers";
import {
    type ReservationFormValues,
    reservationFormSchema,
} from "@/features/reservations/schemas";
import { generateReservationCode } from "@/features/reservations/utils";
import { getT } from "@/lib/i18n/actions";
import { getFileDownloadURL, uploadFile } from "@/services/firebase/actions";
import type { ServerActionResponse } from "@/types/server-actions";

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

export async function createReservation(
    data: ReservationFormValues,
): Promise<ServerActionResponse<Reservation>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "create")) {
            return { error: true, message: "Unauthorized" };
        }

        const { success, data: reservationData } =
            reservationFormSchema.safeParse(data);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        const { customer } = await insertOrGetCustomer({
            createdBy: user.email,
            customerName: reservationData.customerName,
            customerPhone: reservationData.customerPhone,
            totalSpent: reservationData.totalPaid,
        });

        const reservation = await db
            .insert(ReservationsTable)
            .values({
                createdBy: user.email,
                customerId: customer.id,
                ...reservationData,
            })
            .returning()
            .then((res) => res[0]);

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
    data: Partial<ReservationFormValues> & { ids: string[] },
): Promise<ServerActionResponse<Reservation>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "reservations", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const { ids, ...payload } = data;
        const { success, data: reservationData } = reservationFormSchema
            .partial()
            .safeParse(payload);

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

export async function getTTSUrl(name: string) {
    const text = `Attention please: ${name.trim()} has finished the playtime in the kids’ area. Would the parents please come to pick them up?`;

    const cached = await db
        .select()
        .from(TTSCacheTable)
        .where(eq(TTSCacheTable.text, text))
        .limit(1);

    if (cached.length > 0) {
        return cached[0].url;
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
                description: "The voice is warm, clear, and professional. Speak with calm authority, as if making a public announcement in a shopping mall. Maintain a polite and reassuring tone, with natural pacing and clear pronunciation in Arabic Egyptian.",
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
    const audioBinary = Buffer.from(base64Payload, "base64");

    const fileHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const storagePath = `tts/${fileHash}.mp3`;
    let url: string;
    try {
        url = await uploadFile(storagePath, audioBinary);
    } catch (error) {
        if ((error as Error).message === "File already exists at this path.") {
            url = await getFileDownloadURL(storagePath);
        } else {
            throw error;
        }
    }

    await db
        .insert(TTSCacheTable)
        .values({
            text,
            url,
        })
        .onConflictDoNothing();

    return url;
}
