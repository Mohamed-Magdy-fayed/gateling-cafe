"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { db } from "@/drizzle";
import { UsersTable } from "@/drizzle/schema";
import { comparePasswords, hashPassword } from "../core/password-hasher";
import { createSession, removeSession } from "../core/session";
import { signInSchema } from "./schemas";

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  const { success, data } = signInSchema.safeParse(unsafeData);

  if (!success) return "Bad request" as const;

  const user = await db.query.UsersTable.findFirst({
    columns: {
      password: true,
      salt: true,
      id: true,
      email: true,
      name: true,
      imageUrl: true,
      phone: true,
      role: true,
      screens: true,
    },
    where: eq(UsersTable.email, data.email),
  });

  if (user == null) return "No user" as const;

  if (user.password == null || user.salt == null) return "No password" as const;

  const isCorrectPassword = await comparePasswords({
    hashedPassword: user.password,
    password: data.password,
    salt: user.salt,
  });

  if (!isCorrectPassword) return "Credentials" as const;

  await createSession(user, await cookies());

  redirect("/");
}

export async function logOut() {
  removeSession(await cookies());

  const referer = (await headers()).get("referer");
  const refererPath = referer ? new URL(referer).pathname : null;

  if (refererPath !== "/") {
    redirect("/");
  }
}

export async function changePassword(unsafeData: {
  currentPassword: string;
  newPassword: string;
}) {
  const { success, data } = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(1),
    })
    .safeParse(unsafeData);

  if (!success) return "Bad request" as const;

  const user = await getCurrentUser({ redirectIfNotFound: true });
  const dbUser = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.id, user.id),
  });
  if (!dbUser || !dbUser.password || !dbUser.salt)
    return "Bad request" as const;

  const isCorrectPassword = await comparePasswords({
    hashedPassword: dbUser.password,
    password: data.currentPassword,
    salt: dbUser.salt,
  });

  if (!isCorrectPassword) return "Credentials" as const;

  const newHashedPassword = await hashPassword(data.newPassword, dbUser.salt);
  await db
    .update(UsersTable)
    .set({ password: newHashedPassword })
    .where(eq(UsersTable.id, user.id));

  revalidatePath("/");
}
