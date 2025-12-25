import { index, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import {
    createdAt,
    createdBy,
    deletedAt,
    deletedBy,
    id,
    updatedAt,
    updatedBy,
} from "@/drizzle/schemas/helpers";

export const PlaytimeOptionsTable = pgTable(
    "playtime_options",
    {
        id,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        deletedAt,
        deletedBy,

        name: varchar({ length: 128 }).notNull(),
        durationMinutes: integer().notNull(),
        price: integer().notNull(),
    },
    (table) => [
        index("playtime_options_deleted_at_idx").on(table.deletedAt),
        index("playtime_options_duration_minutes_idx").on(table.durationMinutes),
    ],
);

export type PlaytimeOption = typeof PlaytimeOptionsTable.$inferSelect;
