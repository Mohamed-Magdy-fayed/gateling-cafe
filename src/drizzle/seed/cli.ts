#!/usr/bin/env node

import path from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({
  path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), ".env"),
});

const commands = {
  all: {
    description: "Reset and seed all tables with demo data (also seeds admin).",
    action: async () => {
      const { seedAll } = await import("@/drizzle/seed");
      await seedAll();
    },
  },
  admin: {
    description: "Seed only the admin user (no other tables).",
    action: async () => {
      const { seedAdminUser } = await import("@/drizzle/seed");
      await seedAdminUser();
    },
  },
  help: {
    description: "Show this help message.",
    action: async () => {
      printHelp();
    },
  },
} as const;

type CommandName = keyof typeof commands;

function printHelp() {
  const entries = Object.entries(commands).filter(([name]) => name !== "help");
  console.log("Usage: pnpm tsx src/drizzle/seed/cli.ts <command>\n");
  console.log("Commands:");
  for (const [name, info] of entries) {
    console.log(`  ${name.padEnd(8)} ${info.description}`);
  }
  console.log("\nExamples:");
  console.log("  npm run seed:all");
  console.log("  npm run seed:admin");
}

async function run() {
  const rawArg = process.argv[2]?.toLowerCase() as CommandName | undefined;
  const commandName: CommandName = rawArg && rawArg in commands ? rawArg : "all";

  if (commandName === "help") {
    printHelp();
    return;
  }

  const command = commands[commandName];
  console.log(`➡️  Running seed command: ${commandName}...`);

  let closeDbConnection: (() => Promise<void>) | undefined;
  try {
    ({ closeDbConnection } = await import("@/drizzle"));
    await command.action();
    console.log("✅ Seed completed successfully.");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    if (closeDbConnection) {
      await closeDbConnection().catch((err) => {
        console.error("⚠️  Failed to close database connection:", err);
      });
    }
  }
}

run().catch((error) => {
  console.error("❌ Unexpected error while running seed command:", error);
  process.exit(1);
});
