CREATE TYPE "public"."stash_status" AS ENUM('in_development', 'active', 'testing', 'deprecated');--> statement-breakpoint
ALTER TABLE "endpoints" ADD COLUMN "version" text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "stashes" ADD COLUMN "status" "stash_status" DEFAULT 'in_development' NOT NULL;