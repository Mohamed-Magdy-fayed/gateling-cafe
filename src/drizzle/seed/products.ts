import { db } from "@/drizzle";
import { ProductsTable } from "@/drizzle/schema";
import { randomCreatedUpdated, SEED_ACTOR_EMAIL } from "./utils";

export async function seedProducts() {
    // 20 products
    const products = [
        { name: "قهوة تركي", priceCents: 2000 },
        { name: "قهوة فرنساوي", priceCents: 2800 },
        { name: "إسبريسو", priceCents: 2500 },
        { name: "كابتشينو", priceCents: 3500 },
        { name: "لاتيه", priceCents: 3800 },
        { name: "شاي", priceCents: 1500 },
        { name: "كركديه", priceCents: 1800 },
        { name: "عصير مانجو", priceCents: 3200 },
        { name: "عصير فراولة", priceCents: 3200 },
        { name: "ليمون بالنعناع", priceCents: 3000 },
        { name: "موهيتو نعناع", priceCents: 3500 },
        { name: "وافل نوتيلا", priceCents: 4500 },
        { name: "كريب نوتيلا", priceCents: 4200 },
        { name: "ساندوتش جبنة", priceCents: 3000 },
        { name: "شوربة اليوم", priceCents: 2500 },
        { name: "سلطة سيزر", priceCents: 3800 },
        { name: "بان كيك", priceCents: 2900 },
        { name: "سموذي توت", priceCents: 3300 },
        { name: "عصير برتقال", priceCents: 3000 },
        { name: "توست فرنسي", priceCents: 4000 },
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
