CREATE TYPE "public"."user_roles" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_screens" AS ENUM('dashboard');--> statement-breakpoint
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
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");