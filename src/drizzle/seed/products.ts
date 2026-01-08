import { db } from "@/drizzle";
import { ProductsTable } from "@/drizzle/schema";
import { randomCreatedUpdated, SEED_ACTOR_EMAIL } from "./utils";

export async function seedProducts() {
    // 20 products
    const products = [
        { name: "قهوة تركي", priceCents: 25 },
        { name: "قهوة فرنساوي", priceCents: 35 },
        { name: "إسبريسو", priceCents: 30 },
        { name: "كابتشينو", priceCents: 45 },
        { name: "لاتيه", priceCents: 50 },
        { name: "شاي", priceCents: 15 },
        { name: "كركديه", priceCents: 18 },
        { name: "عصير مانجو", priceCents: 45 },
        { name: "عصير فراولة", priceCents: 45 },
        { name: "ليمون بالنعناع", priceCents: 40 },
        { name: "موهيتو نعناع", priceCents: 48 },
        { name: "وافل نوتيلا", priceCents: 70 },
        { name: "كريب نوتيلا", priceCents: 65 },
        { name: "ساندوتش جبنة", priceCents: 35 },
        { name: "شوربة اليوم", priceCents: 28 },
        { name: "سلطة سيزر", priceCents: 55 },
        { name: "بان كيك", priceCents: 42 },
        { name: "سموذي توت", priceCents: 50 },
        { name: "عصير برتقال", priceCents: 38 },
        { name: "توست فرنسي", priceCents: 60 },
    ];

    const inserted: Array<{ id: string; name: string; priceCents: number }> = [];
    for (const p of products) {
        const { createdAt, updatedAt } = randomCreatedUpdated({ yearsBack: 2 });
        const row = await db
            .insert(ProductsTable)
            .values({
                name: p.name,
                priceCents: p.priceCents,
                createdBy: "seed",
                updatedBy: SEED_ACTOR_EMAIL,
                createdAt,
                updatedAt,
            })
            .returning()
            .then((r) => r[0]);

        inserted.push({ id: row.id, name: row.name, priceCents: row.priceCents });
    }

    return inserted;
}
