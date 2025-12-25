import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

import {
    createdAt,
    createdBy,
    deletedAt,
    deletedBy,
    id,
    updatedAt,
    updatedBy,
} from "@/drizzle/schemas/helpers";

export const KidsAreaCalloutPhrasesTable = pgTable(
    "kids_area_callout_phrases",
    {
        id,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        deletedAt,
        deletedBy,

        template: text().notNull(),
        sortOrder: integer().notNull().default(0),
    },
    (table) => [
        index("kids_area_callout_phrases_sort_order_idx").on(table.sortOrder),
        index("kids_area_callout_phrases_deleted_at_idx").on(table.deletedAt),
    ],
);

export type KidsAreaCalloutPhrase =
    typeof KidsAreaCalloutPhrasesTable.$inferSelect;
