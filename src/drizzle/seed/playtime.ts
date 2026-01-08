import { db } from "@/drizzle";
import { PlaytimeOptionsTable } from "@/drizzle/schemas/kids/playtime-options-table";
import { randomCreatedUpdated, SEED_ACTOR_EMAIL } from "./utils";

export async function seedPlaytimeOptions() {
    // 3 main reservation times
    const options = [
        { name: "30 minutes", durationMinutes: 30, price: 30 },
        { name: "60 minutes", durationMinutes: 60, price: 50 },
        { name: "90 minutes", durationMinutes: 90, price: 70 },
    ];

    const inserted: Array<{
        id: string;
        name: string;
        price: number;
        durationMinutes: number;
    }> = [];
    for (const o of options) {
        const { createdAt, updatedAt } = randomCreatedUpdated({ yearsBack: 2 });
        const row = await db
            .insert(PlaytimeOptionsTable)
            .values({
                name: o.name,
                durationMinutes: o.durationMinutes,
                price: o.price,
                createdBy: "seed",
                updatedBy: SEED_ACTOR_EMAIL,
                createdAt,
                updatedAt,
            })
            .returning()
            .then((r) => r[0]);

        inserted.push(row);
    }

    return inserted;
}
