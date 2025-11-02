ALTER TABLE "customers" ADD COLUMN "createdBy" text NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updatedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updatedBy" text;--> statement-breakpoint
CREATE INDEX "customers_phone_index" ON "customers" USING btree ("phone");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_phone_unique" UNIQUE("phone");