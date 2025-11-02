import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { CustomersTable, UsersTable } from "@/drizzle/schema";
import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const reservationStatus = [
  "reserved",
  "started",
  "ended",
  "cancelled",
] as const;
export const ReservationsStatusEnum = pgEnum(
  "reservation_status",
  reservationStatus,
);
export type ReservationStatus = (typeof reservationStatus)[number];

export const ReservationsTable = pgTable(
  "reservations",
  {
    id,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    deletedAt,
    deletedBy,

    employeeId: varchar().references(() => UsersTable.id, { onDelete: "set null" }),
    customerId: varchar()
      .notNull()
      .references(() => CustomersTable.id, { onDelete: "cascade" }),

    reservationCode: varchar({ length: 128 }).notNull().unique(),
    customerName: varchar({ length: 255 }).notNull(),
    customerPhone: varchar({ length: 32 }),
    startTime: timestamp().notNull(),
    endTime: timestamp().notNull(),
    totalPrice: integer().notNull(),
    totalPaid: integer().default(0),
    status: ReservationsStatusEnum().notNull().default("reserved"),
    notes: text(),
  },
  (table) => [
    index("reservations_status_idx").on(table.status),
    index("reservations_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("reservations_customer_id_idx").on(table.customerId),
  ],
);

export const reservationsTableRelations = relations(
  ReservationsTable,
  ({ one }) => ({
    customer: one(CustomersTable, {
      fields: [ReservationsTable.customerId],
      references: [CustomersTable.id],
    }),
  }),
);

export type Reservation = typeof ReservationsTable.$inferSelect;
