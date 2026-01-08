ALTER TABLE "daily_cash_closures"
    ADD COLUMN IF NOT EXISTS "openedAt" timestamp with time zone DEFAULT now() NOT NULL,
    ADD COLUMN IF NOT EXISTS "openedBy" text DEFAULT '' NOT NULL,
    ADD COLUMN IF NOT EXISTS "closedAt" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "closedBy" text;
-- backfill newly added required columns from existing data
UPDATE "daily_cash_closures"
SET "openedAt" = coalesce("openedAt", "createdAt"),
    "openedBy" = coalesce(nullif("openedBy", ''), "createdBy");
-- relax constraints to allow nulls until day is closed
ALTER TABLE "daily_cash_closures"
    ALTER COLUMN "expected_orders_cents" DROP NOT NULL,
    ALTER COLUMN "expected_orders_cents" DROP DEFAULT,
    ALTER COLUMN "expected_reservations_cents" DROP NOT NULL,
    ALTER COLUMN "expected_reservations_cents" DROP DEFAULT,
    ALTER COLUMN "expected_total_cents" DROP NOT NULL,
    ALTER COLUMN "expected_total_cents" DROP DEFAULT,
    ALTER COLUMN "actual_cash_cents" DROP NOT NULL,
    ALTER COLUMN "actual_cash_cents" DROP DEFAULT,
    ALTER COLUMN "difference_cents" DROP NOT NULL,
    ALTER COLUMN "difference_cents" DROP DEFAULT;