ALTER TABLE "person" ADD COLUMN "color" text DEFAULT '#EE7E61' NOT NULL;
--> statement-breakpoint
UPDATE "person" SET "color" = CASE "id" WHEN 1 THEN '#EE7E61' WHEN 2 THEN '#459379' WHEN 3 THEN '#5F70B3' ELSE "color" END;
