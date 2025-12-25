DROP INDEX "products_category_idx";--> statement-breakpoint
DROP INDEX "products_status_idx";--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("name");--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "images";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."product_category";--> statement-breakpoint
DROP TYPE "public"."product_status";--> statement-breakpoint
DROP TYPE "public"."product_type";