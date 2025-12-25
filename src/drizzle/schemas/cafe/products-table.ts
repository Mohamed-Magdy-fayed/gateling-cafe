import { relations } from "drizzle-orm";
import {
    index,
    integer,
    pgTable,
    varchar,
} from "drizzle-orm/pg-core";
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

export const ProductsTable = pgTable(
    "products",
    {
        id,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        deletedAt,
        deletedBy,

        name: varchar({ length: 255 }).notNull(),
        priceCents: integer().notNull(),
    },
    (table) => [
        index("products_status_idx").on(table.name),
    ],
);

export const productsTableRelations = relations(ProductsTable, ({ many }) => ({
    orders: many(OrdersProductsTable),
}));

export type Product = typeof ProductsTable.$inferSelect;
export type NewProduct = typeof ProductsTable.$inferInsert;
