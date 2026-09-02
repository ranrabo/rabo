CREATE TABLE "admin_note" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
