CREATE TABLE "block_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekly_block_id" integer NOT NULL,
	"attend_date" date NOT NULL,
	"logged_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block_attendance" ADD CONSTRAINT "block_attendance_weekly_block_id_weekly_block_id_fk" FOREIGN KEY ("weekly_block_id") REFERENCES "public"."weekly_block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "block_attendance_block_date_idx" ON "block_attendance" USING btree ("weekly_block_id","attend_date");