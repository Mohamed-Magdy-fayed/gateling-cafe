import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const userRoles = ["admin", "user"] as const;
export const userRolesEnum = pgEnum("user_roles", userRoles);
export type UserRole = (typeof userRoles)[number];

export const userScreens = [
  "dashboard",
  "users",
  "products",
  "orders",
  "reservations",
  "playground",
] as const;
export const userScreensEnum = pgEnum("user_screens", userScreens);
export type UserScreen = (typeof userScreens)[number];

export const UsersTable = pgTable(
  "users",
  {
    id,
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: timestamp({ mode: "date", withTimezone: true }),
    phone: varchar(),
    phoneVerified: timestamp(),
    imageUrl: text(),
    password: text(),
    salt: text(),

    role: userRolesEnum().notNull().default("user"),
    screens: userScreensEnum()
      .array()
      .notNull(),

    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    deletedAt,
    deletedBy,
  },
  (table) => [index("users_email_idx").on(table.email)],
);

export const usersTableRelations = relations(UsersTable, () => ({
}));

export type User = typeof UsersTable.$inferSelect;
export type NewUser = typeof UsersTable.$inferInsert;
