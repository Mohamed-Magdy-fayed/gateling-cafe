CREATE TABLE "kids_area_callout_phrases" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	"template" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX "products_category_idx";--> statement-breakpoint
DROP INDEX "products_status_idx";--> statement-breakpoint
CREATE INDEX "kids_area_callout_phrases_sort_order_idx" ON "kids_area_callout_phrases" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "kids_area_callout_phrases_deleted_at_idx" ON "kids_area_callout_phrases" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("name");--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "images";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."product_category";--> statement-breakpoint
DROP TYPE "public"."product_status";--> statement-breakpoint
DROP TYPE "public"."product_type";