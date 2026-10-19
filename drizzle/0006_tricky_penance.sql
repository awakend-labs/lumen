CREATE TABLE "api_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stash_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "endpoints" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "api_groups" ADD CONSTRAINT "api_groups_stash_id_stashes_id_fk" FOREIGN KEY ("stash_id") REFERENCES "public"."stashes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_groups_id_stash_uidx" ON "api_groups" USING btree ("id","stash_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_groups_stash_name_uidx" ON "api_groups" USING btree ("stash_id",lower("name"));--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_group_id_api_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."api_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_group_stash_fk" FOREIGN KEY ("group_id","stash_id") REFERENCES "public"."api_groups"("id","stash_id") ON DELETE no action ON UPDATE no action;