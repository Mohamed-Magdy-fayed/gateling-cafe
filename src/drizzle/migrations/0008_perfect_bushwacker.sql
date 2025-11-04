CREATE TABLE "tts_cache" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"text" text NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "tts_cache_text_unique" UNIQUE("text"),
	CONSTRAINT "tts_cache_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE INDEX "tts_cache_text_idx" ON "tts_cache" USING btree ("text");