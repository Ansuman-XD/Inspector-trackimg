CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"kind" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"badge_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"department_id" text NOT NULL,
	"department" text NOT NULL,
	"designation" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_pw" boolean DEFAULT false NOT NULL,
	"joining_date" text NOT NULL,
	"photo" text,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_badge_id_unique" UNIQUE("badge_id"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "location_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_types_name_unique" UNIQUE("name"),
	CONSTRAINT "location_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"location_type_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"radius_m" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"audience" text NOT NULL,
	"task_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rejected_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"stage_type" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy_m" double precision,
	"distance_m" double precision NOT NULL,
	"radius_m" integer NOT NULL,
	"reason" text NOT NULL,
	"device_time" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"photo_sha256" text,
	"photo_data" "bytea",
	"photo_mime" text,
	"resolved_by" text,
	"resolved_reason" text,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stage_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_id" text NOT NULL,
	"data" "bytea" NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_history" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"kind" text NOT NULL,
	"by" text NOT NULL,
	"note" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"type" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"accuracy_m" double precision,
	"distance_m" double precision,
	"verification" text DEFAULT 'verified' NOT NULL,
	"device_time" timestamp with time zone NOT NULL,
	"server_time" timestamp with time zone DEFAULT now() NOT NULL,
	"time_flagged" boolean DEFAULT false NOT NULL,
	"photo_sha256" text,
	"photo_size" integer,
	"idempotency_key" text NOT NULL,
	"override_by" text,
	"override_reason" text,
	"override_at" timestamp with time zone,
	CONSTRAINT "task_stages_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"location_id" text NOT NULL,
	"scheduled_date" text NOT NULL,
	"start_time" text DEFAULT '' NOT NULL,
	"end_time" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"source" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"created_by" text NOT NULL,
	"started_at" timestamp with time zone,
	"reached_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_location_type_id_location_types_id_fk" FOREIGN KEY ("location_type_id") REFERENCES "public"."location_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_submissions" ADD CONSTRAINT "rejected_submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_submissions" ADD CONSTRAINT "rejected_submissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_submissions" ADD CONSTRAINT "rejected_submissions_resolved_by_employees_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_photos" ADD CONSTRAINT "stage_photos_stage_id_task_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."task_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_stages" ADD CONSTRAINT "task_stages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_stages" ADD CONSTRAINT "task_stages_override_by_employees_id_fk" FOREIGN KEY ("override_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_created_at" ON "activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_employees_role" ON "employees" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_employees_active" ON "employees" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_employees_department_id" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_locations_status" ON "locations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_locations_type" ON "locations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_audience" ON "notifications" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_employee" ON "refresh_tokens" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_rejected_submissions_task_id" ON "rejected_submissions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_rejected_submissions_received_at" ON "rejected_submissions" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_stage_photos_stage_id" ON "stage_photos" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_stage_photos_expires_at" ON "stage_photos" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_task_history_task_id" ON "task_history" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_history_at" ON "task_history" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_task_stage_type" ON "task_stages" USING btree ("task_id","type");--> statement-breakpoint
CREATE INDEX "idx_task_stages_task_id" ON "task_stages" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_location_date_active" ON "tasks" USING btree ("location_id","scheduled_date") WHERE "tasks"."status" != 'cancelled';--> statement-breakpoint
CREATE INDEX "idx_tasks_employee_date" ON "tasks" USING btree ("employee_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_scheduled_date" ON "tasks" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_location_id" ON "tasks" USING btree ("location_id");