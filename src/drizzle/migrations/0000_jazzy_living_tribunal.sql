CREATE TYPE "public"."user_roles" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_screens" AS ENUM('dashboard', 'users', 'products', 'orders', 'reservations', 'playground');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'preparing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'started', 'ended', 'cancelled');--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp with time zone,
	"phone" varchar,
	"phoneVerified" timestamp,
	"imageUrl" text,
	"password" text,
	"salt" text,
	"role" "user_roles" DEFAULT 'user' NOT NULL,
	"screens" "user_screens"[] NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "orders_products" (
	"id" varchar PRIMARY KEY NOT NULL,
	"qty" integer NOT NULL,
	"unitPriceCents" integer NOT NULL,
	"lineTotalCents" integer NOT NULL,
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
	"priceCents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"lastReservationAt" timestamp,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"totalSpent" integer NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "daily_cash_closures" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"deletedAt" timestamp with time zone,
	"deletedBy" text,
	"closed_date" date NOT NULL,
	"openedAt" timestamp with time zone NOT NULL,
	"openedBy" text NOT NULL,
	"closedAt" timestamp with time zone,
	"closedBy" text,
	"expected_orders_cents" integer,
	"expected_reservations_cents" integer,
	"expected_total_cents" integer,
	"actual_cash_cents" integer,
	"difference_cents" integer,
	"notes" text
);
--> statement-breakpoint
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
	"playtimeOptionId" varchar,
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
CREATE TABLE "tts_cache" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"text" text NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "tts_cache_text_unique" UNIQUE("text"),
	CONSTRAINT "tts_cache_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "tts_settings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdBy" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"updatedBy" text,
	"key" text NOT NULL,
	"templateEn" text NOT NULL,
	"templateAr" text NOT NULL,
	CONSTRAINT "tts_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "orders_products" ADD CONSTRAINT "orders_products_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_products" ADD CONSTRAINT "orders_products_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_playtimeOptionId_playtime_options_id_fk" FOREIGN KEY ("playtimeOptionId") REFERENCES "public"."playtime_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_phone_index" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "kids_area_callout_phrases_sort_order_idx" ON "kids_area_callout_phrases" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "kids_area_callout_phrases_deleted_at_idx" ON "kids_area_callout_phrases" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "playtime_options_deleted_at_idx" ON "playtime_options" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "playtime_options_duration_minutes_idx" ON "playtime_options" USING btree ("durationMinutes");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_status_created_at_idx" ON "reservations" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "reservations_customer_id_idx" ON "reservations" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "tts_cache_text_idx" ON "tts_cache" USING btree ("text");--> statement-breakpoint
CREATE INDEX "tts_settings_key_idx" ON "tts_settings" USING btree ("key");