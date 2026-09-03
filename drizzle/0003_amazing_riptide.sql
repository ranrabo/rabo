ALTER TABLE "weekly_block" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_block" ADD COLUMN "logged_by" text;--> statement-breakpoint
ALTER TABLE "weekly_block" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_block" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_color_hex" CHECK ("person"."color" ~ '^#[0-9A-Fa-f]{6}$');--> statement-breakpoint
ALTER TABLE "weekly_block" ADD CONSTRAINT "weekly_block_weekday_range" CHECK ("weekly_block"."weekday" between 1 and 7);--> statement-breakpoint
ALTER TABLE "weekly_block" ADD CONSTRAINT "weekly_block_time_order" CHECK ("weekly_block"."end_time" > "weekly_block"."start_time");--> statement-breakpoint
ALTER TABLE "weekly_block" ADD CONSTRAINT "weekly_block_effective_order" CHECK ("weekly_block"."effective_to" is null or "weekly_block"."effective_to" >= "weekly_block"."effective_from");