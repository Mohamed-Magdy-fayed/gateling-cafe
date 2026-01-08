import { db } from "@/drizzle";
import {
    OrdersProductsTable,
    OrdersTable,
    ProductsTable,
} from "@/drizzle/schema";
import { insertOrGetCustomer } from "@/features/helpers";
import {
    buildEgyptianPhone,
    pick,
    randomDateBetween,
    SEED_ACTOR_EMAIL,
} from "./utils";

export async function seedOrders({
    yearsBack = 2,
    minPerDay = 10,
    maxPerDay = 30,
} = {}) {
    const products = await db
        .select()
        .from(ProductsTable)
        .then((r) => r);
    if (products.length === 0) return [];

    const now = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - yearsBack);

    const insertedOrders: Array<{ id: string; orderNumber: string }> = [];

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const perDay =
            minPerDay + Math.floor(Math.random() * (maxPerDay - minPerDay + 1));

        for (let i = 0; i < perDay; i++) {
            const statusRoll = Math.random();
            const status =
                statusRoll < 0.7
                    ? "completed"
                    : statusRoll < 0.85
                        ? "created"
                        : statusRoll < 0.95
                            ? "preparing"
                            : "cancelled";

            const firstNames = [
                "Ahmed",
                "Mohamed",
                "Mahmoud",
                "Omar",
                "Youssef",
                "Hassan",
                "Mostafa",
                "Karim",
                "Heba",
                "Aya",
                "Mona",
                "Salma",
                "Nour",
                "Fatma",
            ] as const;
            const lastNames = [
                "Hassan",
                "Mahmoud",
                "Ibrahim",
                "Saeed",
                "Ali",
                "Gamal",
                "Khaled",
                "Abdelrahman",
                "Fawzy",
                "Eid",
            ] as const;

            const customerName = `${pick(firstNames)} ${pick(lastNames)}`;
            const customerPhone = buildEgyptianPhone(i + 1 + d.getDate());

            const itemCount = 1 + Math.floor(Math.random() * 4);
            const pickedProducts = new Map<
                string,
                { id: string; qty: number; unitPrice: number }
            >();
            while (pickedProducts.size < itemCount) {
                const p = pick(products) as any;
                if (!pickedProducts.has(p.id)) {
                    pickedProducts.set(p.id, {
                        id: p.id,
                        qty: 1 + Math.floor(Math.random() * 3),
                        unitPrice: p.priceCents,
                    });
                }
            }

            const orderTotal = Array.from(pickedProducts.values()).reduce(
                (s, it) => s + it.qty * it.unitPrice,
                0,
            );
            const totalPaid = status === "cancelled" ? 0 : orderTotal;

            const createdAt = randomDateBetween(dayStart, dayEnd);
            const updatedAt = randomDateBetween(createdAt, now);

            const { customer } = await insertOrGetCustomer({
                customerName,
                customerPhone,
                createdBy: "seed",
                totalSpent: totalPaid,
                createdAt,
                updatedAt,
                updatedBy: SEED_ACTOR_EMAIL,
            });

            const orderNumber = `ORD-SEED-${String(insertedOrders.length + 1).padStart(5, "0")}`;

            const order = await db
                .insert(OrdersTable)
                .values({
                    orderNumber,
                    status: status as any,
                    orderTotal,
                    totalPaid,
                    customerName,
                    customerPhone,
                    employeeId: null,
                    customerId: customer.id,
                    createdBy: "seed",
                    updatedBy: SEED_ACTOR_EMAIL,
                    createdAt,
                    updatedAt,
                })
                .returning()
                .then((r) => r[0]);

            for (const it of pickedProducts.values()) {
                await db.insert(OrdersProductsTable).values({
                    qty: it.qty,
                    unitPriceCents: it.unitPrice,
                    lineTotalCents: it.qty * it.unitPrice,
                    orderId: order.id,
                    productId: it.id,
                });
            }

            insertedOrders.push({ id: order.id, orderNumber });
        }
    }

    return insertedOrders;
}
