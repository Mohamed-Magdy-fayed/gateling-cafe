import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "@/drizzle/schemas/helpers";

export const TTSCacheTable = pgTable("tts_cache", {
    id,
    createdAt,
    text: text().notNull().unique(),
    url: text().notNull().unique(),
}, (table) => [
    index("tts_cache_text_idx").on(table.text)
]);
