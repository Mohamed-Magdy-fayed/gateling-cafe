import { eq } from "drizzle-orm";
import { db } from "@/drizzle";

export const SEED_ACTOR_EMAIL = "seed@system.local";

export function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("Cannot pick from empty array");
    return arr[Math.floor(Math.random() * arr.length)];
}

export function randomDateBetween(from: Date, to: Date) {
    const start = from.getTime();
    const end = to.getTime();
    if (end <= start) return new Date(start);
    const ts = start + Math.floor(Math.random() * (end - start));
    return new Date(ts);
}

export function buildEgyptianPhone(index: number) {
    const prefixes = ["010", "011", "012", "015"] as const;
    const prefix = prefixes[index % prefixes.length] ?? "010";
    const body = String(10000000 + (index % 90000000)).padStart(8, "0");
    return `${prefix}${body}`;
}

export async function randomizeSeededTableTimestamps(
    selectIds: () => Promise<Array<{ id: string }>>,
    updateRow: (id: string, createdAt: Date, updatedAt: Date) => Promise<void>,
    yearsBack: number,
) {
    const rows = await selectIds();
    if (rows.length === 0) return;

    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - yearsBack);

    for (const row of rows) {
        const createdAt = randomDateBetween(from, now);
        const updatedAt = randomDateBetween(createdAt, now);
        await updateRow(row.id, createdAt, updatedAt);
    }
}

export async function randomizeSeededTimestamps({ yearsBack = 2 } = {}) {
    // kept for compatibility; prefer generating timestamps on insert.
    return;
}

export function randomCreatedUpdated({ yearsBack = 2 } = {}) {
    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - yearsBack);

    const createdAt = randomDateBetween(from, now);
    const updatedAt = randomDateBetween(createdAt, now);
    return { createdAt, updatedAt };
}
