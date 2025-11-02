"use server";

import { count, inArray, isNull } from "drizzle-orm";
import z from "zod";
import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { db } from "@/drizzle";
import {
    ProductsTable,
    productCategories,
    productStatuses,
    productTypes,
} from "@/drizzle/schema";
import { getT } from "@/lib/i18n/actions";

const productFormSchema = z.object({
    name: z.string(),
    description: z.string(),
    priceCents: z.number(),
    images: z.string().array(),
    type: z.enum(productTypes),
    category: z.enum(productCategories),
    status: z.enum(productStatuses),
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

export async function getStatusCounts() {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "products", "view")) {
        return [];
    }

    const { t } = await getT();

    const statusCounts = await db
        .select({
            value: ProductsTable.status,
            count: count(ProductsTable.status),
        })
        .from(ProductsTable)
        .groupBy(ProductsTable.status);

    return statusCounts.map((status) => ({
        ...status,
        label: t(`productsTranslations.statusNames`, { statusName: status.value }),
    }));
}

export async function getTypeCounts() {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "products", "view")) {
        return [];
    }

    const { t } = await getT();

    const typeCounts = await db
        .select({
            value: ProductsTable.type,
            count: count(ProductsTable.type),
        })
        .from(ProductsTable)
        .groupBy(ProductsTable.type);

    return typeCounts.map((type) => ({
        ...type,
        label: t(`productsTranslations.typeNames`, { typeName: type.value }),
    }));
}

export async function getCategoryCounts() {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "products", "view")) {
        return [];
    }

    const { t } = await getT();

    const categoryCounts = await db
        .select({
            value: ProductsTable.category,
            count: count(ProductsTable.category),
        })
        .from(ProductsTable)
        .groupBy(ProductsTable.category);

    return categoryCounts.map((category) => ({
        ...category,
        label: t(`productsTranslations.categoryNames`, { categoryName: category.value }),
    }));
}
