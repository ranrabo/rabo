CREATE TABLE "app_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "lab_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"session_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"logged_by" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"research_area" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_block" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date
);
--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_block" ADD CONSTRAINT "weekly_block_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_session_date_idx" ON "lab_session" USING btree ("session_date");--> statement-breakpoint
CREATE INDEX "weekly_block_weekday_idx" ON "weekly_block" USING btree ("weekday");