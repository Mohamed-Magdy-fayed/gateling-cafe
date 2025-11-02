import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";
import { CustomersTable, UsersTable } from "@/drizzle/schema";
import { OrdersProductsTable } from "@/drizzle/schemas/cafe/orders-products-table";
import {
    createdAt,
    createdBy,
    deletedAt,
    deletedBy,
    id,
    updatedAt,
    updatedBy,
} from "@/drizzle/schemas/helpers";

export const orderStatuses = ["created", "preparing", "completed", "cancelled"] as const;
export const orderStatusesEnum = pgEnum("order_status", orderStatuses);
export type OrderStatus = (typeof orderStatuses)[number];

export const OrdersTable = pgTable("orders", {
    id,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    deletedAt,
    deletedBy,

    orderNumber: varchar().notNull().unique(),
    status: orderStatusesEnum().notNull().default("created"),
    orderTotal: integer().notNull(),
    totalPaid: integer().notNull().default(0),
    customerName: varchar(),
    customerPhone: varchar(),

    employeeId: varchar().references(() => UsersTable.id),
    customerId: varchar()
        .references(() => CustomersTable.id, { onDelete: "cascade" })
        .notNull(),
});

export const ordersTableRelations = relations(OrdersTable, ({ many }) => ({
    products: many(OrdersProductsTable),
}));

export type Order = typeof OrdersTable.$inferSelect;
