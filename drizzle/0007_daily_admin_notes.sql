ALTER TABLE "admin_note" RENAME TO "admin_note_legacy";--> statement-breakpoint
CREATE TABLE "admin_note" (
	"note_date" date PRIMARY KEY NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "admin_note" ("note_date", "body", "updated_by", "updated_at")
SELECT CURRENT_DATE, "body", "updated_by", "updated_at"
FROM "admin_note_legacy"
WHERE COALESCE(TRIM("body"), '') <> ''
ON CONFLICT DO NOTHING;--> statement-breakpoint
DROP TABLE "admin_note_legacy";
