import { date, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import {
    createdAt,
    createdBy,
    deletedAt,
    deletedBy,
    id,
    updatedAt,
    updatedBy,
} from "@/drizzle/schemas/helpers";

export const DailyCashClosuresTable = pgTable("daily_cash_closures", {
    id,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    deletedAt,
    deletedBy,

    closedDate: date("closed_date", { mode: "date" }).notNull(),
    openedAt: timestamp({ withTimezone: true }).notNull(),
    openedBy: text().notNull(),
    closedAt: timestamp({ withTimezone: true }),
    closedBy: text(),

    expectedOrdersCents: integer("expected_orders_cents"),
    expectedReservationsCents: integer("expected_reservations_cents"),
    expectedTotalCents: integer("expected_total_cents"),
    actualCashCents: integer("actual_cash_cents"),
    differenceCents: integer("difference_cents"),
    notes: text(),
});

export type DailyCashClosure = typeof DailyCashClosuresTable.$inferSelect;
