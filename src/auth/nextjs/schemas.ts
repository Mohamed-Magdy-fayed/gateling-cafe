import { userRoles, userScreens } from "@/drizzle/schema";
import { z } from "zod"

export const passwordSchema = z.string().min(6, "Password must be at least 6 characters long")
  .refine(
    (value) =>
      /[a-z]/.test(value) &&   // At least one lowercase letter
      /[A-Z]/.test(value) &&   // At least one uppercase letter
      /[0-9]/.test(value) &&   // At least one number
      /[!@#$%^&*(),.?":{}|<>]/.test(value),  // At least one special character
    {
      message: "Password must include uppercase, lowercase, number, and special character",
    }
  )

export const signInSchema = z.object({
  email: z.email(),
  password: passwordSchema,
})

export const sessionSchema = z.object({
  sessionId: z.string(),
  exp: z.number(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    phone: z.string().nullable(),
    imageUrl: z.string().nullable(),
    role: z.enum(userRoles),
    screens: z.array(z.enum(userScreens)),
    branchId: z.string().nullable(),
  }),
});
export type SessionPayload = z.infer<typeof sessionSchema>;
export type PartialUser = z.infer<typeof sessionSchema>["user"];

export type Cookies = {
  set: (
    key: string,
    value: string,
    options: {
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "strict" | "lax";
      expires?: Date;
    }
  ) => void;
  get: (key: string) => { name: string; value: string } | undefined;
  delete: (key: string) => void;
};
