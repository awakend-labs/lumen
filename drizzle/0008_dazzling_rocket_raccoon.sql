ALTER TABLE "projects" ADD COLUMN "base_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Inherit an existing project's URL only when all documented URLs agree.
-- Projects with multiple API origins keep an empty default until the owner chooses one.
UPDATE projects SET base_url = defaults.base_url
FROM (
  SELECT project_id, min(base_url) AS base_url FROM endpoints
  WHERE base_url <> ''
  GROUP BY project_id HAVING count(DISTINCT base_url) = 1
) defaults WHERE projects.id = defaults.project_id;
