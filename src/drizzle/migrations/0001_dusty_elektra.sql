ALTER TABLE "reservations" ADD COLUMN "persons" integer DEFAULT 1; --> statement-breakpoint
UPDATE "reservations" SET "persons" = 1 WHERE "persons" IS NULL; --> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "persons" SET NOT NULL; --> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "persons" DROP DEFAULT;