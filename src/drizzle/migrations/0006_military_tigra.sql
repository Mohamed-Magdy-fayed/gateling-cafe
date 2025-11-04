ALTER TABLE "orders_products" ADD COLUMN "qty" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders_products" ADD COLUMN "unitPriceCents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders_products" ADD COLUMN "lineTotalCents" integer NOT NULL;