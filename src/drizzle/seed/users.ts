import { eq } from "drizzle-orm";
import { generateSalt, hashPassword } from "@/auth/core/password-hasher";
import { db } from "@/drizzle";
import { UsersTable } from "@/drizzle/schema";
import { randomCreatedUpdated, SEED_ACTOR_EMAIL } from "./utils";

export async function seedAdminUser() {
    const email = "admin@email.com";
    const existing = await db
        .select()
        .from(UsersTable)
        .where(eq(UsersTable.email, email))
        .then((r) => r[0]);
    if (existing) return existing;

    const salt = generateSalt();
    const password = await hashPassword("Pass@word1", salt);
    const { createdAt, updatedAt } = randomCreatedUpdated({ yearsBack: 2 });

    const user = await db
        .insert(UsersTable)
        .values({
            email,
            name: "Admin",
            password,
            salt,
            role: "admin",
            screens: [
                "dashboard",
                "users",
                "products",
                "orders",
                "reservations",
                "playground",
            ],
            createdBy: "seed",
            updatedBy: SEED_ACTOR_EMAIL,
            createdAt,
            updatedAt,
        })
        .returning()
        .then((r) => r[0]);

    return user;
}

export async function seedPlaygroundUsers() {
    const employees = [
        { name: "Ahmed Hassan", email: "ahmed.hassan@lavida.local" },
        { name: "Mohamed Ali", email: "mohamed.ali@lavida.local" },
        { name: "Omar Saeed", email: "omar.saeed@lavida.local" },
        { name: "Youssef Ibrahim", email: "youssef.ibrahim@lavida.local" },
        { name: "Sara Mahmoud", email: "sara.mahmoud@lavida.local" },
        { name: "Mona Abdelrahman", email: "mona.abdelrahman@lavida.local" },
        { name: "Nour El Din", email: "nour.eldin@lavida.local" },
        { name: "Hany Adel", email: "hany.adel@lavida.local" },
    ] as const;

    const created: Array<{ id: string; email: string }> = [];

    for (const e of employees) {
        const existing = await db
            .select()
            .from(UsersTable)
            .where(eq(UsersTable.email, e.email))
            .then((r) => r[0]);
        if (existing) {
            created.push({ id: existing.id, email: existing.email });
            continue;
        }

        const salt = generateSalt();
        const password = await hashPassword("Pass@word1", salt);
        const { createdAt, updatedAt } = randomCreatedUpdated({ yearsBack: 2 });

        const user = await db
            .insert(UsersTable)
            .values({
                email: e.email,
                name: e.name,
                password,
                salt,
                role: "user",
                screens: ["dashboard", "reservations", "playground"],
                createdBy: "seed",
                updatedBy: SEED_ACTOR_EMAIL,
                createdAt,
                updatedAt,
            })
            .returning()
            .then((r) => r[0]);

        created.push({ id: user.id, email: user.email });
    }

    return created;
}

export async function seedCafeUsers() {
    const employees = [
        { name: "Mahmoud Said", email: "mahmoud.said@cafe.local" },
        { name: "Mostafa Gamal", email: "mostafa.gamal@cafe.local" },
        { name: "Heba Hassan", email: "heba.hassan@cafe.local" },
        { name: "Aya Mohamed", email: "aya.mohamed@cafe.local" },
    ] as const;

    const created: Array<{ id: string; email: string }> = [];

    for (const e of employees) {
        const existing = await db
            .select()
            .from(UsersTable)
            .where(eq(UsersTable.email, e.email))
            .then((r) => r[0]);
        if (existing) {
            created.push({ id: existing.id, email: existing.email });
            continue;
        }

        const salt = generateSalt();
        const password = await hashPassword("Pass@word1", salt);
        const { createdAt, updatedAt } = randomCreatedUpdated({ yearsBack: 2 });

        const user = await db
            .insert(UsersTable)
            .values({
                email: e.email,
                name: e.name,
                password,
                salt,
                role: "user",
                screens: ["dashboard", "orders", "products"],
                createdBy: "seed",
                updatedBy: SEED_ACTOR_EMAIL,
                createdAt,
                updatedAt,
            })
            .returning()
            .then((r) => r[0]);

        created.push({ id: user.id, email: user.email });
    }

    return created;
}
