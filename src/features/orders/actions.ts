"use server";

import { and, between, count, desc, eq, inArray, isNull } from "drizzle-orm";
import z from "zod";
import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { db } from "@/drizzle";
import {
    CustomersTable,
    type Order,
    OrdersProductsTable,
    OrdersTable,
    orderStatuses,
    ProductsTable,
} from "@/drizzle/schema";
import { generateOrderNumber } from "@/features/orders/utils";
import { getT } from "@/lib/i18n/actions";
import type { Option } from "@/types/data-table";
import type { ServerActionResponse } from "@/types/server-actions";

const orderProductSchema = z.object({
    productId: z.string().min(1),
    qty: z.number().min(1),
});

const orderFormSchema = z.object({
    orderNumber: z.string(),
    status: z.enum(orderStatuses),
    orderTotal: z.number(),
    totalPaid: z.number(),
    customerName: z.string(),
    customerPhone: z.string(),
    items: z.array(orderProductSchema).min(1),
});
type OrderFormValues = z.infer<typeof orderFormSchema>;

export async function generateOrderNumberAction() {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const order = await db
        .select()
        .from(OrdersTable)
        .where(and(between(OrdersTable.createdAt, startOfDay, endOfDay)))
        .limit(1)
        .orderBy(desc(OrdersTable.orderNumber))
        .then((res) => res[0]);

    const todayCount = order?.orderNumber
        ? parseInt(order.orderNumber.split("-")[3] || "0")
        : 0;

    return generateOrderNumber(todayCount);
}

export async function getOrders() {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "orders", "view")) {
        return { error: true, message: "Unauthorized" };
    }

    return {
        error: false,
        data: await db.query.OrdersTable.findMany({
            where: isNull(OrdersTable.deletedAt),
        }),
    };
}

export async function createOrder(
    data: OrderFormValues,
): Promise<ServerActionResponse<Order>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "orders", "create")) {
            return { error: true, message: "Unauthorized" };
        }

        const { success, data: orderData } = orderFormSchema.safeParse(data);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        const { items, ...orderFields } = orderData;

        if (!items || items.length === 0) {
            return {
                error: true,
                message: "Order must include at least one product",
            };
        }

        const existingCustomer = await db
            .select()
            .from(CustomersTable)
            .where(eq(CustomersTable.phone, orderFields.customerPhone))
            .then((res) => res[0]);

        const order = await db.transaction(async (tx) => {
            let customerId: string;

            if (existingCustomer) {
                await tx
                    .update(CustomersTable)
                    .set({
                        totalSpent: existingCustomer.totalSpent + orderFields.orderTotal,
                    })
                    .where(eq(CustomersTable.id, existingCustomer.id));

                customerId = existingCustomer.id;
            } else {
                const newCustomer = await tx
                    .insert(CustomersTable)
                    .values({
                        name: orderFields.customerName || "Guest",
                        phone: orderFields.customerPhone || "",
                        totalSpent: orderFields.orderTotal,
                        createdBy: user.email,
                    })
                    .returning()
                    .then((res) => res[0]);

                if (!newCustomer) {
                    throw new Error("Failed to create customer");
                }

                customerId = newCustomer.id;
            }

            const createdOrder = await tx
                .insert(OrdersTable)
                .values({
                    ...orderFields,
                    createdBy: user.email,
                    customerId,
                    employeeId: user.id,
                })
                .returning()
                .then((res) => res[0]);

            if (!createdOrder) {
                throw new Error("Failed to create order");
            }

            await tx.insert(OrdersProductsTable).values(
                items.map((item) => ({
                    orderId: createdOrder.id,
                    productId: item.productId,
                    qty: item.qty,
                })),
            );

            return createdOrder;
        });

        return {
            error: false,
            data: order,
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function editOrders(
    data: Partial<OrderFormValues> & { ids: string[] },
): Promise<ServerActionResponse<Order[]>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "orders", "update")) {
            return { error: true, message: "Unauthorized" };
        }

        const { ids, ...payload } = data;
        const { success, data: orderData } = orderFormSchema
            .partial()
            .safeParse(payload);

        if (!success) {
            return { error: true, message: "Invalid" };
        }

        const { items, ...orderFields } = orderData;

        const updatePayload = {
            ...Object.fromEntries(
                Object.entries(orderFields).filter(([, value]) => value !== undefined),
            ),
            updatedBy: user.email,
        } as Partial<typeof OrdersTable.$inferInsert>;

        const updatedOrders = await db.transaction(async (tx) => {
            const result = await tx
                .update(OrdersTable)
                .set(updatePayload)
                .where(inArray(OrdersTable.id, ids))
                .returning();

            if (items && ids.length !== 1) {
                throw new Error("Cannot update products for multiple orders at once");
            }

            if (items && ids[0]) {
                if (items.length === 0) {
                    throw new Error("Order must include at least one product");
                }

                const orderId = ids[0];

                await tx
                    .delete(OrdersProductsTable)
                    .where(eq(OrdersProductsTable.orderId, orderId));

                if (items.length > 0) {
                    await tx.insert(OrdersProductsTable).values(
                        items.map((item) => ({
                            orderId,
                            productId: item.productId,
                            qty: item.qty,
                        })),
                    );
                }
            }

            return result;
        });

        return {
            error: false,
            data: updatedOrders,
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function deleteOrders(ids: string[]): Promise<ServerActionResponse<number>> {
    try {
        const user = await getCurrentUser({ redirectIfNotFound: true });
        if (!hasPermission(user, "orders", "delete")) {
            return { error: true, message: "Unauthorized" };
        }

        return {
            error: false,
            data: (
                await db
                    .update(OrdersTable)
                    .set({ deletedAt: new Date(), deletedBy: user.email })
                    .where(inArray(OrdersTable.id, ids))
                    .returning()
            ).length,
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function getStatusCounts(): Promise<ServerActionResponse<Option[]>> {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "orders", "view")) {
        return { error: true, message: "Unauthorized" };
    }

    const { t } = await getT();

    const statusCounts = await db
        .select({
            value: OrdersTable.status,
            count: count(OrdersTable.status),
        })
        .from(OrdersTable)
        .groupBy(OrdersTable.status);

    return {
        error: false,
        data: statusCounts.map((status) => ({
            ...status,
            label: t(`ordersTranslations.statusNames`, { statusName: status.value }),
        })),
    };
}

export async function getOrderFormProducts() {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "orders", "view")) {
        return { error: true, message: "Unauthorized" };
    }

    const products = await db
        .select()
        .from(ProductsTable)
        .where(
            and(isNull(ProductsTable.deletedAt), eq(ProductsTable.status, "active")),
        );

    return {
        error: false,
        data: products,
    };
}

export async function getOrderProducts(
    orderId: string,
): Promise<ServerActionResponse<{ productId: string, qty: number }[]>> {
    const user = await getCurrentUser({ redirectIfNotFound: true });
    if (!hasPermission(user, "orders", "view")) {
        return { error: true, message: "Unauthorized" };
    }

    const orderProducts = await db
        .select({ productId: OrdersProductsTable.productId, qty: OrdersProductsTable.qty })
        .from(OrdersProductsTable)
        .where(eq(OrdersProductsTable.orderId, orderId));

    return {
        error: false,
        data: orderProducts,
    };
}
