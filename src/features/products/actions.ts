"use server";

import { inArray, isNull } from "drizzle-orm";
import z from "zod";

import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { db } from "@/drizzle";
import {
    ProductsTable,
} from "@/drizzle/schema";

const productFormSchema = z.object({
    name: z.string(),
    priceCents: z.number(),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

export async function getProducts() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    if (!hasPermission(user, "products", "view")) {
        return { error: true, message: "Unauthorized" };
    }

    return {
        error: false,
        data: await db.query.ProductsTable.findMany({
            where: isNull(ProductsTable.deletedAt),
        })
    };
}

export async function createProduct(data: ProductFormValues) {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "products", "create")) {
            return { error: true, message: "Unauthorized" };
        }

        const { success, data: productData } = productFormSchema.safeParse(data);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        return {
            error: false,
            data: (
                await db
                    .insert(ProductsTable)
                    .values({
                        createdBy: user.email,
                        ...productData,
                    })
                    .returning()
            ).pop(),
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function editProducts(
    data: Partial<ProductFormValues> & { ids: string[] },
) {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "products", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const { ids, ...payload } = data;
        const { success, data: productData } = productFormSchema
            .partial()
            .safeParse(payload);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        const updatePayload = {
            ...productData,
            updatedBy: user.email,
        } as Partial<typeof ProductsTable.$inferInsert>;

        return {
            error: false,
            data: await db
                .update(ProductsTable)
                .set(updatePayload)
                .where(inArray(ProductsTable.id, ids))
                .returning()
                .then((res) => res[0]),
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function deleteProducts(ids: string[]) {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "products", "delete")) {
            return { error: true, message: "Unauthorized" };
        }

        return (
            await db
                .delete(ProductsTable)
                .where(inArray(ProductsTable.id, ids))
                .returning()
        ).length;
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}
