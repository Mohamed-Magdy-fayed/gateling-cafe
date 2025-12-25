import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { generateSalt, hashPassword } from "@/auth/core/password-hasher";
import { db } from "@/drizzle";
import { UsersTable, userScreens } from "@/drizzle/schema";
import type { NewUser } from "@/drizzle/schemas/auth/users-table";

const ADMIN_EMAIL = "admin@email.com";
const ADMIN_PASSWORD = "Pass@word1";
const ADMIN_NAME = "Admin";

async function buildAdminUserPayload(): Promise<NewUser> {
    const salt = generateSalt();
    const hashed = await hashPassword(ADMIN_PASSWORD, salt);
    const createdAt = new Date();
    return {
        id: randomUUID(),
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashed,
        salt,
        role: "admin",
        screens: [...userScreens],
        emailVerified: createdAt,
        createdBy: "seed",
    } satisfies NewUser;
}

async function insertAdminUser() {
    const existing = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.email, ADMIN_EMAIL),
    });

    if (existing) {
        return existing.id;
    }

    const adminUser = await buildAdminUserPayload();
    const [inserted] = await db
        .insert(UsersTable)
        .values(adminUser)
        .returning({ id: UsersTable.id });
    return inserted?.id ?? adminUser.id;
}

export async function seedAdminUser() {
    await insertAdminUser();
}

export async function seedAll() {
    await seedAdminUser();
}

export async function seed() {
    await seedAll();
}
