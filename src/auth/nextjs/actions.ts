"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { signInSchema } from "./schemas"
import { db } from "@/drizzle"
import { UsersTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import {
  comparePasswords,
} from "../core/password-hasher"
import { cookies, headers } from "next/headers"
import { createSession, removeSession } from "../core/session"

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  const { success, data } = signInSchema.safeParse(unsafeData)

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
      branchId: true,
      screens: true,
    },
    where: eq(UsersTable.email, data.email),
  })

  if (user == null) return "No user" as const;

  if (user.password == null || user.salt == null) return "No password" as const;

  const isCorrectPassword = await comparePasswords({
    hashedPassword: user.password,
    password: data.password,
    salt: user.salt,
  })

  if (!isCorrectPassword) return "Credentials" as const;

  await createSession(user, await cookies())

  redirect("/")
}

export async function logOut() {
  removeSession(await cookies());

  const referer = (await headers()).get("referer");
  const refererPath = referer ? new URL(referer).pathname : null;

  if (refererPath !== "/") {
    redirect("/");
  }
}
