import { db } from "@/drizzle";
import { ReservationsTable } from "@/drizzle/schema";
import { PlaytimeOptionsTable } from "@/drizzle/schemas/kids/playtime-options-table";
import { insertOrGetCustomer } from "@/features/helpers";
import { seedPlaytimeOptions } from "./playtime";
import {
    buildEgyptianPhone,
    pick,
    randomDateBetween,
    SEED_ACTOR_EMAIL,
} from "./utils";

export async function seedReservations({
    yearsBack = 2,
    minPerDay = 10,
    maxPerDay = 30,
} = {}) {
    let playtimeOptions: Array<{
        id: string;
        durationMinutes: number;
        price: number;
    }> = await db
        .select()
        .from(PlaytimeOptionsTable)
        .then((r) => r);

    // Auto-seed playtime options if they are missing so reservations can always be generated.
    if (playtimeOptions.length === 0) {
        playtimeOptions = await seedPlaytimeOptions();
    }

    const kidNamesAr = [
        "يوسف",
        "عمر",
        "آدم",
        "سيف",
        "حمزة",
        "حسن",
        "علي",
        "مروان",
        "كريم",
        "مريم",
        "سارة",
        "ملك",
        "ياسمين",
        "نور",
        "فريدة",
        "ليلى",
        "زين",
        "يحيى",
        "سليم",
        "نادين",
    ] as const;

    const inserted: Array<{ id: string; reservationCode: string }> = [];
    const now = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - yearsBack);

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const perDay =
            minPerDay + Math.floor(Math.random() * (maxPerDay - minPerDay + 1));

        for (let i = 0; i < perDay; i++) {
            const option = pick(playtimeOptions) as any;
            const kidName = pick(kidNamesAr);
            const phone = buildEgyptianPhone(i + 1 + d.getDate());

            const statusRoll = Math.random();
            const status =
                statusRoll < 0.75
                    ? "ended"
                    : statusRoll < 0.9
                        ? "cancelled"
                        : "started";
            const totalPaid = status === "cancelled" ? 0 : option.price;

            const startTime = randomDateBetween(dayStart, dayEnd);
            const endTime = new Date(
                startTime.getTime() + option.durationMinutes * 60_000,
            );

            const createdAt = randomDateBetween(dayStart, dayEnd);
            const updatedAt = randomDateBetween(createdAt, now);

            const { customer } = await insertOrGetCustomer({
                customerName: kidName,
                customerPhone: phone,
                createdBy: "seed",
                totalSpent: totalPaid,
                createdAt,
                updatedAt,
                updatedBy: SEED_ACTOR_EMAIL,
            });

            const reservationCode = `RES-SEED-${String(inserted.length + 1).padStart(5, "0")}`;

            const row = await db
                .insert(ReservationsTable)
                .values({
                    reservationCode,
                    customerName: kidName,
                    customerPhone: phone,
                    playtimeOptionId: option.id,
                    totalPrice: option.price,
                    totalPaid,
                    notes: "Lavida Jungle Play",
                    status: status as any,
                    startTime,
                    endTime,
                    customerId: customer.id,
                    createdBy: "seed",
                    updatedBy: SEED_ACTOR_EMAIL,
                    createdAt,
                    updatedAt,
                })
                .returning()
                .then((r) => r[0]);

            inserted.push({ id: row.id, reservationCode });
        }
    }

    return inserted;
}
