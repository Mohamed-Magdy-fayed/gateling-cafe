import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/drizzle";
import { type Product, ProductsTable } from "@/drizzle/schema";

type EnsureProductsInput = Array<{
    name: string;
    priceCents: number;
}>;

type SystemOptions = {
    actorEmail: string;
};

/**
 * System-level product upsert for scripts (seeding, maintenance).
 * Does not depend on Next.js auth/session.
 */
export async function ensureProductsSystem(
    input: EnsureProductsInput,
    _opts: SystemOptions,
): Promise<Product[]> {
    const results: Product[] = [];

    for (const item of input) {
        const name = item.name.trim();
        const priceCents = Math.round(item.priceCents);

        if (!name || !Number.isFinite(priceCents) || priceCents < 0) {
            throw new Error("Invalid product");
        }

        const existing = await db
            .select({ id: ProductsTable.id })
            .from(ProductsTable)
            .where(and(eq(ProductsTable.name, name), isNull(ProductsTable.deletedAt)))
            .limit(1)
            .then((r) => r[0]);

        if (existing) {
            const updated = await db
                .update(ProductsTable)
                .set({
                    priceCents,
                    updatedBy: "seed",
                    updatedAt: new Date(),
                })
                .where(eq(ProductsTable.id, existing.id))
                .returning()
                .then((r) => r[0]);

            if (updated) results.push(updated);
            continue;
        }

        const inserted = await db
            .insert(ProductsTable)
            .values({
                name,
                priceCents,
                createdBy: "seed",
                updatedBy: "seed",
            })
            .returning()
            .then((r) => r[0]);

        if (!inserted) {
            throw new Error("Failed to create product");
        }

        results.push(inserted);
    }

    return results;
}
