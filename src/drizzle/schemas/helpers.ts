import { text, timestamp, varchar } from "drizzle-orm/pg-core";

export const id = varchar().notNull().primaryKey().$defaultFn(() => crypto.randomUUID());
export const customId = varchar().notNull().primaryKey();

export const createdAt = timestamp({ withTimezone: true }).notNull().defaultNow()
export const createdBy = text().notNull()

export const updatedAt = timestamp({ withTimezone: true }).$onUpdate(() => new Date())
export const updatedBy = text()

export const deletedAt = timestamp({ withTimezone: true })
export const deletedBy = text()