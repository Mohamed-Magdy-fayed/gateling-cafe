import type { Config } from "drizzle-kit";
import { env } from "@/data/env/server";

export default {
  schema: "./src/drizzle/schemas/*/*.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
