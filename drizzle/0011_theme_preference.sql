CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "theme" "theme_preference";