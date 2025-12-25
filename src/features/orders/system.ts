import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/drizzle";
import {
    type Order,
    type OrderStatus,
    OrdersProductsTable,
    OrdersTable,
    ProductsTable,
} from "@/drizzle/schema";
import { insertOrGetCustomer } from "@/features/helpers";

type SystemOptions = {
    actorEmail: string;
};

type CreateOrderItem = {
    productId: string;
    qty: number;
};

type CreateOrderSystemInput = {
    orderNumber: string;
    status: OrderStatus;
    items: CreateOrderItem[];
    totalPaid: number;
    customerName?: string;
    customerPhone?: string;
    employeeId?: string;
};

/**
 * System-level order creator for scripts (seeding, maintenance).
 * Does not depend on Next.js auth/session.
 */
export async function createOrderSystem(
    input: CreateOrderSystemInput,
    opts: SystemOptions,
): Promise<Order> {
    const orderNumber = input.orderNumber.trim();
    if (!orderNumber) throw new Error("Invalid orderNumber");

    const existing = await db
        .select({ id: OrdersTable.id })
        .from(OrdersTable)
        .where(eq(OrdersTable.orderNumber, orderNumber))
        .limit(1)
        .then((r) => r[0]);

    if (existing) {
        const row = await db.query.OrdersTable.findFirst({
            where: and(
                eq(OrdersTable.id, existing.id),
                isNull(OrdersTable.deletedAt),
            ),
        });
        if (!row) throw new Error("Failed to fetch existing order");
        return row;
    }

    if (!input.items || input.items.length === 0) {
        throw new Error("Order must include at least one product");
    }

    const uniqueProductIds = Array.from(
        new Set(input.items.map((item) => item.productId).filter(Boolean)),
    );

    const products = await db
        .select({ id: ProductsTable.id, priceCents: ProductsTable.priceCents })
        .from(ProductsTable)
        .where(
            and(
                inArray(ProductsTable.id, uniqueProductIds),
                isNull(ProductsTable.deletedAt),
            ),
        );

    const productMap = new Map(products.map((p) => [p.id, p]));
    if (productMap.size !== uniqueProductIds.length) {
        throw new Error("One or more selected products are unavailable");
    }

    const normalizedItems = input.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error("Invalid product");

        const qty = Math.max(1, Math.round(item.qty));
        const unitPriceCents = product.priceCents;
        const lineTotalCents = unitPriceCents * qty;

        return {
            productId: item.productId,
            qty,
            unitPriceCents,
            lineTotalCents,
        };
    });

    const computedOrderTotal = normalizedItems.reduce(
        (sum, item) => sum + item.lineTotalCents,
        0,
    );

    const safeTotalPaid = Math.max(
        0,
        Math.min(Math.round(input.totalPaid), computedOrderTotal),
    );

    const { customer } = await insertOrGetCustomer({
        createdBy: "seed",
        customerName: input.customerName?.trim() || "عميل",
        customerPhone: input.customerPhone?.trim() || "0000000000",
        totalSpent: computedOrderTotal,
    });

    const order = await db.transaction(async (tx) => {
        const createdOrder = await tx
            .insert(OrdersTable)
            .values({
                orderNumber,
                status: input.status,
                orderTotal: computedOrderTotal,
                totalPaid: safeTotalPaid,
                customerName: input.customerName?.trim(),
                customerPhone: input.customerPhone?.trim(),
                employeeId: input.employeeId,
                customerId: customer.id,
                createdBy: "seed",
                updatedBy: "seed",
            })
            .returning()
            .then((r) => r[0]);

        if (!createdOrder) {
            throw new Error("Failed to create order");
        }

        await tx.insert(OrdersProductsTable).values(
            normalizedItems.map((item) => ({
                orderId: createdOrder.id,
                productId: item.productId,
                qty: item.qty,
                unitPriceCents: item.unitPriceCents,
                lineTotalCents: item.lineTotalCents,
            })),
        );

        return createdOrder;
    });

    // Like reservations, keep createdBy as "seed" but record who "touched" it.
    if (opts.actorEmail) {
        await db
            .update(OrdersTable)
            .set({ updatedBy: opts.actorEmail, updatedAt: new Date() })
            .where(eq(OrdersTable.id, order.id));
    }

    return order;
}
