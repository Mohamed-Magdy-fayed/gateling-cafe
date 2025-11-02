import { relations } from "drizzle-orm";
import {
    index,
    integer,
    pgEnum,
    pgTable,
    text,
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

export const productTypes = [
    "beverage",
    "food",
    "merchandise",
    "addon",
] as const;
export const productTypesEnum = pgEnum("product_type", productTypes);
export type ProductType = (typeof productTypes)[number];

export const productStatuses = ["active", "inactive", "archived"] as const;
export const productStatusEnum = pgEnum("product_status", productStatuses);
export type ProductStatus = (typeof productStatuses)[number];

export const productCategories = [
    "coffee",
    "tea",
    "juice",
    "smoothie",
    "pastry",
    "dessert",
    "sandwich",
    "salad",
    "breakfast",
    "snack",
    "other",
] as const;
export const productCategoriesEnum = pgEnum(
    "product_category",
    productCategories,
);
export type ProductCategory = (typeof productCategories)[number];

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
        description: text(),
        priceCents: integer().notNull(),
        images: text().array(),

        type: productTypesEnum().notNull().default("beverage"),
        category: productCategoriesEnum().notNull().default("other"),
        status: productStatusEnum().notNull().default("active"),
    },
    (table) => [
        index("products_status_idx").on(table.status),
        index("products_category_idx").on(table.category),
    ],
);

export const productsTableRelations = relations(ProductsTable, ({ many }) => ({
    orders: many(OrdersProductsTable),
}));

export type Product = typeof ProductsTable.$inferSelect;
export type NewProduct = typeof ProductsTable.$inferInsert;
