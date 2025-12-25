import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/drizzle";
import { ReservationsTable } from "@/drizzle/schema";
import { PlaytimeOptionsTable } from "@/drizzle/schemas/kids/playtime-options-table";
import { insertOrGetCustomer } from "@/features/helpers";

type EnsurePlaytimeOptionsInput = Array<{
    name: string;
    durationMinutes: number;
    price: number;
}>;

type SystemOptions = {
    actorEmail: string;
};

export async function ensurePlaytimeOptionsSystem(
    input: EnsurePlaytimeOptionsInput,
    _opts: SystemOptions,
) {
    for (const option of input) {
        const name = option.name.trim();
        const durationMinutes = Math.round(option.durationMinutes);
        const price = Math.round(option.price);

        if (!name || durationMinutes <= 0 || price < 0) {
            throw new Error("Invalid playtime option");
        }

        const existing = await db
            .select({ id: PlaytimeOptionsTable.id })
            .from(PlaytimeOptionsTable)
            .where(
                and(
                    eq(PlaytimeOptionsTable.durationMinutes, durationMinutes),
                    isNull(PlaytimeOptionsTable.deletedAt),
                ),
            )
            .limit(1)
            .then((r) => r[0]);

        if (existing) {
            await db
                .update(PlaytimeOptionsTable)
                .set({
                    name,
                    price,
                    updatedBy: "seed",
                    updatedAt: new Date(),
                })
                .where(eq(PlaytimeOptionsTable.id, existing.id));
        } else {
            await db.insert(PlaytimeOptionsTable).values({
                name,
                durationMinutes,
                price,
                createdBy: "seed",
                updatedBy: "seed",
            });
        }
    }
}

type CreateReservationSystemInput = {
    reservationCode: string;
    customerName: string;
    customerPhone: string;
    playtimeOptionId: string;
    totalPaid: number;
    notes?: string;
    status?: "reserved" | "started" | "ended" | "cancelled";
    startTime: Date;
    endTime: Date;
    employeeId?: string;
};

export async function createReservationSystem(
    input: CreateReservationSystemInput,
    opts: SystemOptions,
) {
    const reservationCode = input.reservationCode.trim();
    if (!reservationCode) throw new Error("Invalid reservationCode");

    const existing = await db
        .select({ id: ReservationsTable.id })
        .from(ReservationsTable)
        .where(eq(ReservationsTable.reservationCode, reservationCode))
        .limit(1)
        .then((r) => r[0]);

    if (existing) {
        const row = await db.query.ReservationsTable.findFirst({
            where: eq(ReservationsTable.id, existing.id),
        });
        if (!row) throw new Error("Failed to fetch existing reservation");
        return row;
    }

    const playtime = await db
        .select({
            id: PlaytimeOptionsTable.id,
            price: PlaytimeOptionsTable.price,
        })
        .from(PlaytimeOptionsTable)
        .where(
            and(
                eq(PlaytimeOptionsTable.id, input.playtimeOptionId),
                isNull(PlaytimeOptionsTable.deletedAt),
            ),
        )
        .limit(1)
        .then((r) => r[0]);

    if (!playtime) {
        throw new Error("Invalid playtime option");
    }

    const { customer } = await insertOrGetCustomer({
        createdBy: "seed",
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        totalSpent: input.totalPaid,
    });

    const inserted = await db
        .insert(ReservationsTable)
        .values({
            createdBy: "seed",
            updatedBy: "seed",
            employeeId: input.employeeId,
            customerId: customer.id,
            reservationCode,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            playtimeOptionId: input.playtimeOptionId,
            startTime: input.startTime,
            endTime: input.endTime,
            totalPrice: playtime.price,
            totalPaid: input.totalPaid,
            status: input.status ?? "reserved",
            notes: input.notes,
        })
        .returning()
        .then((r) => r[0]);

    if (!inserted) {
        throw new Error("Failed to create reservation");
    }

    // If an actorEmail was provided, reflect it as updater for audit trails.
    // (createdBy remains "seed" so we can safely identify seeded rows later.)
    if (opts.actorEmail) {
        await db
            .update(ReservationsTable)
            .set({ updatedBy: opts.actorEmail, updatedAt: new Date() })
            .where(eq(ReservationsTable.id, inserted.id));
    }

    return inserted;
}
