import { eq } from "drizzle-orm";

import { generateSalt, hashPassword } from "@/auth/core/password-hasher";
import { db } from "@/drizzle";
import { type UserRole, type UserScreen, UsersTable } from "@/drizzle/schema";

type EnsureUserInput = {
    email: string;
    name: string;
    password: string;
    role: UserRole;
    screens: UserScreen[];
    phone?: string;
};

type EnsureUserOptions = {
    actorEmail: string;
};

/**
 * System-level user upsert for scripts (seeding, maintenance).
 * Does not depend on Next.js auth/session.
 */
export async function ensureUserSystem(
    input: EnsureUserInput,
    _opts: EnsureUserOptions,
) {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!email || !name) {
        throw new Error("Invalid user input");
    }

    const existing = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.email, email),
    });

    if (existing) {
        const updated = await db
            .update(UsersTable)
            .set({
                name,
                role: input.role,
                screens: input.screens,
                phone: input.phone,
                updatedBy: "seed",
                deletedAt: null,
                deletedBy: null,
            })
            .where(eq(UsersTable.id, existing.id))
            .returning()
            .then((r) => r[0]);

        return updated ?? existing;
    }

    const salt = generateSalt();
    const hashed = await hashPassword(input.password, salt);

    const inserted = await db
        .insert(UsersTable)
        .values({
            email,
            name,
            password: hashed,
            salt,
            role: input.role,
            screens: input.screens,
            phone: input.phone,
            emailVerified: new Date(),
            createdBy: "seed",
            updatedBy: "seed",
        })
        .returning()
        .then((r) => r[0]);

    if (!inserted) {
        throw new Error("Failed to create user");
    }

    return inserted;
}
