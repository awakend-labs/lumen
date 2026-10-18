CREATE TYPE "public"."project_status" AS ENUM('in_progress', 'documented');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" "project_status" DEFAULT 'in_progress' NOT NULL;