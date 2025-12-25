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
CREATE INDEX "tts_settings_key_idx" ON "tts_settings" USING btree ("key");