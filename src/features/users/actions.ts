"use server";

import { eq, inArray } from "drizzle-orm";
import z from "zod";
import { generateSalt, hashPassword } from "@/auth/core/password-hasher";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { db } from "@/drizzle";
import { UsersTable, userScreens } from "@/drizzle/schema";

const userFormSchema = z.object({
    name: z.string().min(3),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["admin", "user"]),
    phone: z.string().min(10).max(15).optional(),
    branchId: z.string().optional(),
    screens: z.array(z.enum(userScreens)),
});
type UserFormValues = z.infer<typeof userFormSchema>;

export async function getUsers() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return db.query.UsersTable.findMany({ where: eq(UsersTable.role, "user") });
}

export async function createUser(data: UserFormValues) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "admin") {
            throw new Error("Unauthorized");
        }

        const { success, data: userData } = userFormSchema.safeParse(data);

        if (!success) {
            throw new Error("Invalid user data");
        }

        const salt = generateSalt();
        const hashedPassword = await hashPassword(userData.password, salt);

        return {
            error: false,
            data: (
                await db
                    .insert(UsersTable)
                    .values({
                        createdBy: user.email,
                        email: userData.email,
                        name: userData.name,
                        password: hashedPassword,
                        salt,
                        role: userData.role,
                        phone: userData.phone,
                        screens: userData.screens,
                    })
                    .returning()
            ).pop(),
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function editUsers(
    data: Partial<UserFormValues> & { ids: string[] },
) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "admin") {
            throw new Error("Unauthorized");
        }

        const { ids, ...payload } = data;
        const { success, data: userData } = userFormSchema
            .partial()
            .safeParse(payload);

        if (!success) {
            throw new Error("Invalid user data");
        }

        const updatePayload = { ...userData, updatedBy: user.email } as Partial<
            typeof UsersTable.$inferInsert
        >;

        return {
            error: false,
            data: await db
                .update(UsersTable)
                .set(updatePayload)
                .where(inArray(UsersTable.id, ids))
                .returning()
                .then((res) => res[0]),
        };
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}

export async function deleteUsers(ids: string[]) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "admin") {
            throw new Error("Unauthorized");
        }

        return (
            await db.delete(UsersTable).where(inArray(UsersTable.id, ids)).returning()
        ).length;
    } catch (error) {
        return { error: true, message: (error as Error).message };
    }
}
