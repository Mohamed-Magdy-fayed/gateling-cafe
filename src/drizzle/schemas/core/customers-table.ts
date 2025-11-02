import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { OrdersTable, ReservationsTable } from "@/drizzle/schema";
import { createdAt, createdBy, id, updatedAt, updatedBy } from "@/drizzle/schemas/helpers";

export const CustomersTable = pgTable("customers", {
  id,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  lastReservationAt: timestamp(),

  name: text().notNull(),
  phone: text().notNull().unique(),
  totalSpent: integer().notNull(),
}, (t) => [index("customers_phone_index").on(t.phone)]);

export const customersTableRelations = relations(
  CustomersTable,
  ({ many }) => ({
    reservations: many(ReservationsTable),
    orders: many(OrdersTable),
  }),
);

export type Customer = typeof CustomersTable.$inferSelect;
