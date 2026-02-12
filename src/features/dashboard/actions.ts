"use server";

import { and, between, DrizzleQueryError, eq, isNull, sql } from "drizzle-orm";
import z from "zod";

import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { db } from "@/drizzle";
import {
    type DailyCashClosure,
    DailyCashClosuresTable,
    OrdersTable,
    ReservationsTable,
} from "@/drizzle/schema";
import type { ServerActionResponse } from "@/types/server-actions";

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

const closeDaySchema = z.object({
    actualCashCents: z.number().int().min(0),
    notes: z.string().trim().max(500).optional(),
});

export type CloseDayInput = z.infer<typeof closeDaySchema>;

export async function openDayAction(): Promise<ServerActionResponse<DailyCashClosure>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });

        if (user.role !== "admin") {
            return { error: true, message: "Unauthorized" };
        }

        const activeShift = await db.query.DailyCashClosuresTable.findFirst({
            where: and(
                isNull(DailyCashClosuresTable.closedAt),
                isNull(DailyCashClosuresTable.deletedAt),
            ),
        });

        if (activeShift) {
            return { error: true, message: "Shift already open" };
        }

        const now = new Date();
        const closedDate = startOfDay(now);

        const opened = await db
            .insert(DailyCashClosuresTable)
            .values({
                closedDate,
                openedAt: now,
                openedBy: user.email,
                createdBy: user.email,
            })
            .returning()
            .then((rows) => rows[0]);

        if (!opened) {
            return { error: true, message: "Failed to open day" };
        }

        return { error: false, data: opened };
    } catch (error) {
        return { error: true, message: error instanceof DrizzleQueryError ? `${error.cause?.message}` : error instanceof Error ? error.message : JSON.stringify(error) };
    }
}

export async function closeDayAction(
    input: CloseDayInput,
): Promise<ServerActionResponse<DailyCashClosure>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });

        if (user.role !== "admin") {
            return { error: true, message: "Unauthorized" };
        }

        const parsed = closeDaySchema.safeParse(input);
        if (!parsed.success) {
            return { error: true, message: "Invalid payload" };
        }

        const { actualCashCents, notes } = parsed.data;

        const existingClosure = await db.query.DailyCashClosuresTable.findFirst({
            where: and(
                isNull(DailyCashClosuresTable.closedAt),
                isNull(DailyCashClosuresTable.deletedAt),
            ),
        });

        if (!existingClosure) {
            return { error: true, message: "Shift is not open" };
        }

        const now = new Date();
        const shiftStart = existingClosure.openedAt;
        const shiftEnd = now;

        const [ordersRevenue, reservationsRevenue] = await Promise.all([
            db
                .select({
                    value: sql<number>`coalesce(sum(${OrdersTable.orderTotal}), 0)`
                        .mapWith(Number)
                        .as("value"),
                })
                .from(OrdersTable)
                .where(
                    and(
                        isNull(OrdersTable.deletedAt),
                        between(OrdersTable.createdAt, shiftStart, shiftEnd),
                    ),
                )
                .then((r) => r[0]?.value ?? 0),
            db
                .select({
                    value: sql<number>`coalesce(sum(${ReservationsTable.totalPrice}), 0)`
                        .mapWith(Number)
                        .as("value"),
                })
                .from(ReservationsTable)
                .where(
                    and(
                        isNull(ReservationsTable.deletedAt),
                        between(ReservationsTable.createdAt, shiftStart, shiftEnd),
                    ),
                )
                .then((r) => r[0]?.value ?? 0),
        ]);

        const expectedTotalCents = ordersRevenue + reservationsRevenue;
        const normalizedActualCash = Math.round(actualCashCents);
        const differenceCents = normalizedActualCash - expectedTotalCents;

        const closure = await db
            .update(DailyCashClosuresTable)
            .set({
                expectedOrdersCents: ordersRevenue,
                expectedReservationsCents: reservationsRevenue,
                expectedTotalCents,
                actualCashCents: normalizedActualCash,
                differenceCents,
                notes: notes && notes.trim().length > 0 ? notes.trim() : null,
                closedAt: now,
                closedBy: user.email,
                updatedAt: now,
                updatedBy: user.email,
            })
            .where(eq(DailyCashClosuresTable.id, existingClosure.id))
            .returning()
            .then((rows) => rows[0]);

        if (!closure) {
            return { error: true, message: "Failed to save" };
        }

        return { error: false, data: closure };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}
