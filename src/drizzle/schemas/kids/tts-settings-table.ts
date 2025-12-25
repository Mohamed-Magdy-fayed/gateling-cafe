import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, createdBy, id, updatedAt, updatedBy } from "@/drizzle/schemas/helpers";

export const TTSSettingsTable = pgTable(
    "tts_settings",
    {
        id,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        key: text().notNull().unique(),
        templateEn: text().notNull(),
        templateAr: text().notNull(),
    },
    (table) => [index("tts_settings_key_idx").on(table.key)],
);
