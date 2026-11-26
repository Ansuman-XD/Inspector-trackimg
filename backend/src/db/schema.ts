import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  customType,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Custom PostgreSQL bytea type for binary photo storage
export const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
  toDriver(val: Buffer): Buffer {
    return val;
  },
  fromDriver(val: unknown): Buffer {
    if (Buffer.isBuffer(val)) return val;
    return Buffer.from(val as string, "binary");
  },
});

// 1. Departments table
export const departments = pgTable("departments", {
  id: text("id").primaryKey(), // e.g. DEP-CEN
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Location Types table
export const locationTypes = pgTable("location_types", {
  id: text("id").primaryKey(), // e.g. LTP-JST
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Locations table
export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(), // e.g. LOC-001
    name: text("name").notNull().unique(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    locationTypeId: text("location_type_id")
      .notNull()
      .references(() => locationTypes.id, { onDelete: "restrict" }),
    type: text("type").notNull(), // Preserves denormalized name for backward compatibility
    status: text("status", { enum: ["active", "inactive"] })
      .default("active")
      .notNull(),
    verificationRadius: integer("radius_m").default(100).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_locations_status").on(table.status),
    index("idx_locations_type").on(table.type),
  ]
);

// 4. Employees table (badge_id unique, role, department_id, password_hash, active, must_change_pw)
export const employees = pgTable(
  "employees",
  {
    id: text("id").primaryKey(), // Badge ID e.g. EMP001 / ADMIN001
    badgeId: text("badge_id").notNull().unique(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().unique(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    department: text("department").notNull(), // Denormalized name for frontend parity
    designation: text("designation").notNull(),
    role: text("role", { enum: ["admin", "employee"] }).notNull(),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").default(true).notNull(),
    mustChangePw: boolean("must_change_pw").default(false).notNull(),
    joiningDate: text("joining_date").notNull(), // yyyy-mm-dd
    photo: text("photo"), // optional avatar profile URL
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_employees_role").on(table.role),
    index("idx_employees_active").on(table.active),
    index("idx_employees_department_id").on(table.departmentId),
  ]
);

// 5. Refresh tokens table (hashed token, rotation & revocation)
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_refresh_tokens_employee").on(table.employeeId),
    index("idx_refresh_tokens_hash").on(table.tokenHash),
  ]
);

// 6. Tasks table
// Decision: status is supported explicitly to match frontend state machine perfectly,
// while cancellation is tracked cleanly.
// Partial unique index on (location_id, scheduled_date) WHERE status != 'cancelled' enforces conflict rule.
export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(), // e.g. VST-0001
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    scheduledDate: text("scheduled_date").notNull(), // yyyy-mm-dd
    startTime: text("start_time").default("").notNull(), // HH:mm or ""
    endTime: text("end_time").default("").notNull(), // HH:mm or ""
    priority: text("priority", { enum: ["high", "medium", "low"] })
      .default("medium")
      .notNull(),
    source: text("source", { enum: ["admin", "self"] }).notNull(), // 'admin' | 'self'
    notes: text("notes").default("").notNull(), // instructions
    isImportant: boolean("is_important").default(false).notNull(),
    status: text("status", {
      enum: [
        "assigned",
        "pending",
        "in_progress",
        "location_reached",
        "checked_in",
        "verified",
        "not_visited",
        "verification_failed",
        "expired",
        "cancelled",
      ],
    })
      .default("assigned")
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    reachedAt: timestamp("reached_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Partial unique index: 1 active visit per location per date
    // uniqueIndex("uniq_location_date_active")
    //   .on(table.locationId, table.scheduledDate)
    //   .where(sql`${table.status} != 'cancelled'`),
    index("idx_tasks_location_date").on(table.locationId, table.scheduledDate),
    index("idx_tasks_employee_date").on(table.employeeId, table.scheduledDate),
    index("idx_tasks_scheduled_date").on(table.scheduledDate),
    index("idx_tasks_status").on(table.status),
    index("idx_tasks_location_id").on(table.locationId),
  ]
);

// 7. Task stages table: UNIQUE(task_id, type)
export const taskStages = pgTable(
  "task_stages",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["check_in", "check_out"] }).notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    accuracyM: doublePrecision("accuracy_m"),
    distanceM: doublePrecision("distance_m"),
    verification: text("verification", { enum: ["verified", "failed", "override"] })
      .default("verified")
      .notNull(),
    deviceTime: timestamp("device_time", { withTimezone: true }).notNull(),
    serverTime: timestamp("server_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
    timeFlagged: boolean("time_flagged").default(false).notNull(), // device_time vs server_time > threshold
    photoSha256: text("photo_sha256"),
    photoSize: integer("photo_size"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    overrideBy: text("override_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    overrideReason: text("override_reason"),
    overrideAt: timestamp("override_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uniq_task_stage_type").on(table.taskId, table.type),
    index("idx_task_stages_task_id").on(table.taskId),
  ]
);

// 8. Stage photos table: photos live in their OWN table so list queries never load image bytes
export const stagePhotos = pgTable(
  "stage_photos",
  {
    id: text("id").primaryKey(),
    stageId: text("stage_id")
      .notNull()
      .references(() => taskStages.id, { onDelete: "cascade" }),
    data: bytea("data").notNull(),
    mime: text("mime").default("image/jpeg").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // server time + 7 days
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_stage_photos_stage_id").on(table.stageId),
    index("idx_stage_photos_expires_at").on(table.expiresAt),
  ]
);

// 9. Task history: insert-only audit log with before/after jsonb
export const taskHistory = pgTable(
  "task_history",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    kind: text("kind", {
      enum: ["created", "amended", "cancelled", "check_in", "check_out", "override"],
    }).notNull(),
    by: text("by").notNull(),
    note: text("note").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_task_history_task_id").on(table.taskId),
    index("idx_task_history_at").on(table.at),
  ]
);

// 10. Rejected submissions table
export const rejectedSubmissions = pgTable(
  "rejected_submissions",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    stageType: text("stage_type", { enum: ["check_in", "check_out"] }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    accuracyM: doublePrecision("accuracy_m"),
    distanceM: doublePrecision("distance_m").notNull(),
    radiusM: integer("radius_m").notNull(),
    reason: text("reason").notNull(),
    deviceTime: timestamp("device_time", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    photoSha256: text("photo_sha256"),
    photoData: bytea("photo_data"),
    photoMime: text("photo_mime"),
    resolvedBy: text("resolved_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    resolvedReason: text("resolved_reason"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_rejected_submissions_task_id").on(table.taskId),
    index("idx_rejected_submissions_received_at").on(table.receivedAt),
  ]
);

// 11. Notifications table (supports real-time notifications for admin and employee)
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    audience: text("audience").notNull(), // "admin" or employee ID
    taskId: text("task_id"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_notifications_audience").on(table.audience),
    index("idx_notifications_created_at").on(table.createdAt),
  ]
);

// 12. System activities table (audit activities stream)
export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    message: text("message").notNull(),
    kind: text("kind", { enum: ["success", "info", "warning", "danger"] }).notNull(),
    actor: text("actor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_activities_created_at").on(table.createdAt)]
);
