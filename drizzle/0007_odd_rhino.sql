CREATE TABLE "endpoint_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"draft_key" text NOT NULL,
	"payload" text,
	"revision" uuid DEFAULT gen_random_uuid() NOT NULL,
	"write_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "endpoints" ALTER COLUMN "request_body" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "endpoints" ALTER COLUMN "responses" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "endpoints" ALTER COLUMN "responses" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "endpoint_drafts" ADD CONSTRAINT "endpoint_drafts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_drafts" ADD CONSTRAINT "endpoint_drafts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "endpoint_drafts_user_project_key_uidx" ON "endpoint_drafts" USING btree ("user_id","project_id","draft_key");--> statement-breakpoint
-- Preserve every existing stash. Disambiguate legacy duplicates before enforcing uniqueness.
-- The earliest stash keeps its name; later duplicates receive the next available numeric suffix.
DO $$
DECLARE
  duplicate record;
  candidate text;
  suffix integer;
BEGIN
  FOR duplicate IN
    SELECT id, project_id, name FROM (
      SELECT id, project_id, name,
        row_number() OVER (PARTITION BY project_id, lower(btrim(name)) ORDER BY created_at, id) AS occurrence
      FROM stashes
    ) ranked WHERE occurrence > 1 ORDER BY project_id, id
  LOOP
    suffix := 2;
    LOOP
      candidate := left(btrim(duplicate.name), 80 - length(suffix::text) - 3) || ' (' || suffix::text || ')';
      EXIT WHEN NOT EXISTS (SELECT 1 FROM stashes WHERE project_id = duplicate.project_id AND lower(btrim(name)) = lower(candidate));
      suffix := suffix + 1;
    END LOOP;
    UPDATE stashes SET name = candidate WHERE id = duplicate.id;
  END LOOP;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "stashes_project_name_uidx" ON "stashes" USING btree ("project_id",lower(btrim("name")));
