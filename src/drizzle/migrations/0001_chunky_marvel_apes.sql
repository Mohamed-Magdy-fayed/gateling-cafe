CREATE TYPE "public"."order_status" AS ENUM('created', 'preparing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('coffee', 'tea', 'juice', 'smoothie', 'pastry', 'dessert', 'sandwich', 'salad', 'breakfast', 'snack', 'other');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('beverage', 'food', 'merchandise', 'addon');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'started', 'ended', 'cancelled');--> statement-breakpoint
CREATE TABLE "orders_products" (
	"id" varchar PRIMARY KEY NOT NULL,
	"orderId" varchar NOT NULL,
	"productId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	"orderNumber" varchar NOT NULL,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"orderTotal" integer NOT NULL,
	"totalPaid" integer DEFAULT 0 NOT NULL,
	"customerName" varchar,
	"customerPhone" varchar,
	"employeeId" varchar,
	"customerId" varchar NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	"name" varchar(255) NOT NULL,
	"description" text,
	"priceCents" integer NOT NULL,
	"images" text[],
	"type" "product_type" DEFAULT 'beverage' NOT NULL,
	"category" "product_category" DEFAULT 'other' NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastReservationAt" timestamp,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"totalSpent" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	"employeeId" varchar,
	"customerId" varchar NOT NULL,
	"reservationCode" varchar(128) NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerPhone" varchar(32),
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"totalPrice" integer NOT NULL,
	"totalPaid" integer DEFAULT 0,
	"status" "reservation_status" DEFAULT 'reserved' NOT NULL,
	"notes" text,
	CONSTRAINT "reservations_reservationCode_unique" UNIQUE("reservationCode")
);
--> statement-breakpoint
ALTER TABLE "orders_products" ADD CONSTRAINT "orders_products_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_products" ADD CONSTRAINT "orders_products_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_status_created_at_idx" ON "reservations" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "reservations_customer_id_idx" ON "reservations" USING btree ("customerId");