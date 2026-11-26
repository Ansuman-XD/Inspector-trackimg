DROP INDEX IF EXISTS "uniq_location_date_active";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_location_date" ON "tasks" USING btree ("location_id","scheduled_date");