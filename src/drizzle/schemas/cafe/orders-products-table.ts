import { relations } from "drizzle-orm";
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { OrdersTable, ProductsTable } from "@/drizzle/schema";
import {
    id,
} from "@/drizzle/schemas/helpers";

export const OrdersProductsTable = pgTable("orders_products", {
    id,
    qty: integer().notNull(),
    orderId: varchar().references(() => OrdersTable.id, { onDelete: "cascade" }).notNull(),
    productId: varchar().references(() => ProductsTable.id, { onDelete: "cascade" }).notNull(),
});

export const ordersProductsTableRelations = relations(OrdersProductsTable, ({ many }) => ({
    orders: many(OrdersTable),
    products: many(ProductsTable),
}));
