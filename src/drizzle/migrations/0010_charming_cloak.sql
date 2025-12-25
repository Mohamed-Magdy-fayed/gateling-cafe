CREATE TABLE "playtime_options" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	"name" varchar(128) NOT NULL,
	"durationMinutes" integer NOT NULL,
	"price" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "playtimeOptionId" varchar;--> statement-breakpoint
CREATE INDEX "playtime_options_deleted_at_idx" ON "playtime_options" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "playtime_options_duration_minutes_idx" ON "playtime_options" USING btree ("durationMinutes");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_playtimeOptionId_playtime_options_id_fk" FOREIGN KEY ("playtimeOptionId") REFERENCES "public"."playtime_options"("id") ON DELETE set null ON UPDATE no action;