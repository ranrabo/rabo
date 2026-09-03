CREATE TABLE "progress_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"progress_date" date NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"value" text,
	"note" text,
	"logged_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "progress_entry" ADD CONSTRAINT "progress_entry_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_entry_person_date_idx" ON "progress_entry" USING btree ("person_id","progress_date");--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_email_unique" UNIQUE("email");