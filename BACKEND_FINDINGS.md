# BACKEND FINDINGS: Inspector Tracking System
**Phase 0 Architecture & Codebase Discovery Document**

---

## 1. Complete Domain Entities & Exact Fields

Extracted directly from `frontend/src/types.ts` and `frontend/src/services/seed.ts`:

### 1.1 `Role`
```typescript
type Role = "admin" | "employee";
```

### 1.2 `User` (Authentication Principal)
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | Login ID (uppercase, e.g. `ADMIN001`, `EMP001`) |
| `name` | `string` | Full display name |
| `role` | `Role` | `"admin" | "employee"` |
| `password` | `string` | Plain text in mock; will be Argon2 hashed |
| `email` | `string` | Official email address |
| `lastLogin` | `string?` | ISO 8601 timestamp (optional) |

### 1.3 `Employee`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | 3–12 uppercase alphanumeric (e.g. `EMP001`) |
| `name` | `string` | Full name |
| `phone` | `string` | 10-digit Indian mobile number |
| `email` | `string` | Email address (e.g. `name@ecor.railnet.gov.in`) |
| `department` | `string` | Matches Department `name` (e.g. `Civil Engineering`) |
| `designation` | `string` | Title (e.g. `Section Engineer (P.Way)`) |
| `joiningDate` | `string` | `YYYY-MM-DD` |
| `status` | `"active" | "inactive"` | Employee status |
| `photo` | `string?` | Optional avatar image URL |
| `createdAt` | `string` | ISO 8601 timestamp |

### 1.4 `Department`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | e.g. `DEP-CEN` or generated `DEP-<timestamp>` |
| `name` | `string` | Unique department name (case-insensitive in validation) |
| `code` | `string` | 1–6 letters/chars `[A-Za-z&/ ]{1,6}`, e.g. `CEN`, `S&T` |
| `description` | `string?` | Optional description |
| `createdAt` | `string` | ISO 8601 timestamp |

### 1.5 `LocationTypeItem`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | e.g. `LTP-JST` or generated `LTP-<timestamp>` |
| `name` | `string` | Unique type name (case-insensitive in validation) |
| `code` | `string` | 1–6 letters/chars `[A-Za-z&/ ]{1,6}`, e.g. `JST`, `BRG` |
| `description` | `string?` | Optional description |
| `createdAt` | `string` | ISO 8601 timestamp |

### 1.6 `VisitLocation`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | e.g. `LOC-001` or generated `LOC-<timestamp>` |
| `name` | `string` | Location name (minimum 3 characters, unique) |
| `description` | `string` | Site description / tasks |
| `address` | `string` | Full physical address |
| `lat` | `number` | Float -90 to 90 |
| `lng` | `number` | Float -180 to 180 |
| `type` | `string` | Name of LocationType (e.g. `Junction Station`) |
| `status` | `"active" | "inactive"` | Site status |
| `verificationRadius` | `number` | Allowed GPS distance in metres (10–2000 m, default 100) |
| `createdAt` | `string` | ISO 8601 timestamp |

### 1.7 `Priority`
```typescript
type Priority = "high" | "medium" | "low";
```

### 1.8 `TaskStatus`
```typescript
type TaskStatus =
  | "assigned"
  | "in_progress"
  | "location_reached"
  | "checked_in"
  | "verified"
  | "pending"
  | "not_visited"
  | "verification_failed"
  | "expired";
```

### 1.9 `GpsAttempt`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `at` | `string` | ISO 8601 timestamp |
| `lat` | `number` | Client latitude |
| `lng` | `number` | Client longitude |
| `accuracy` | `number | null` | Accuracy in metres |
| `distance` | `number` | Distance to target in metres |
| `passed` | `boolean` | `distance <= radius` |
| `demo` | `boolean` | Whether recorded under presenter demo mode |

### 1.10 `VisitStage`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `at` | `string` | ISO 8601 timestamp |
| `lat` | `number?` | Latitude at verification |
| `lng` | `number?` | Longitude at verification |
| `accuracy` | `number | null?` | Accuracy in metres |
| `distance` | `number?` | Distance in metres |
| `photo` | `string?` | JPEG data URL or URI |
| `photoTimestamp` | `string?` | ISO timestamp of photo capture |
| `demo` | `boolean?` | Flag |
| `override` | `{ reason: string; at: string; by: string }?` | Admin override info |

### 1.11 `Task`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | e.g. `VST-0001` or `VST-<uid>` |
| `employeeId` | `string` | Foreign key to `Employee.id` |
| `locationId` | `string` | Foreign key to `VisitLocation.id` |
| `date` | `string` | `YYYY-MM-DD` |
| `startTime` | `string` | `HH:mm` or `""` (any time that day) |
| `endTime` | `string` | `HH:mm` or `""` (end of day) |
| `priority` | `Priority` | `"high" | "medium" | "low"` |
| `instructions` | `string` | Work instructions / notes |
| `status` | `TaskStatus` | Current operational status |
| `createdAt` | `string` | ISO 8601 timestamp |
| `createdBy` | `string` | `ADMIN001` or Employee ID (`isSelfPlanned` iff `createdBy === employeeId`) |
| `startedAt` | `string?` | ISO timestamp when visit was started |
| `reachedAt` | `string?` | ISO timestamp when GPS proximity first passed |
| `verifiedAt` | `string?` | ISO timestamp when checkout completed or overridden |
| `employeeLatitude` | `number?` | Last verified or attempted latitude |
| `employeeLongitude` | `number?` | Last verified or attempted longitude |
| `gpsAccuracy` | `number | null?` | GPS accuracy in metres |
| `distanceFromLocation` | `number?` | Distance from site in metres |
| `photo` | `string?` | Last submitted photo |
| `photoTimestamp` | `string?` | Timestamp of photo |
| `verificationStatus` | `"verified" | "failed" | "none"?` | High-level status flag |
| `gpsDemo` | `boolean?` | True if demo GPS used |
| `attempts` | `GpsAttempt[]` | Audit trail of GPS verification checks |
| `checkIn` | `VisitStage?` | Check-in stage details |
| `checkOut` | `VisitStage?` | Check-out stage details |
| `overriddenByAdmin` | `boolean?` | True if any stage was overridden |
| `adminOverrideReason` | `string?` | Reason provided by admin |
| `adminOverrideTimestamp` | `string?` | Timestamp of override |

### 1.12 `TaskHistoryEntry`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | `HST-<uid>` |
| `kind` | `"replaced" | "cancelled"` | Action type |
| `task` | `Task` | Complete snapshot of original task |
| `by` | `string` | Actor ID (`ADMIN001` or employee ID) |
| `at` | `string` | ISO 8601 timestamp |
| `note` | `string` | Audit reason / message |

### 1.13 `AppNotification`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | `NTF-<uid>` |
| `type` | `NotificationType` | `"task_assigned" | "visit_started" | "location_verified" | "verification_failed" | "visit_completed" | "deadline_passed"` |
| `title` | `string` | Header text |
| `message` | `string` | Body text |
| `audience` | `"admin" | string` | `"admin"` or target employee ID |
| `taskId` | `string?` | Optional linked task ID |
| `read` | `boolean` | Read flag |
| `createdAt` | `string` | ISO 8601 timestamp |

### 1.14 `Activity`
| Field | Type | Modifiers / Notes |
|---|---|---|
| `id` | `string` | `ACT-<uid>` |
| `message` | `string` | Audit log message |
| `kind` | `"success" | "info" | "warning" | "danger"` | Tone |
| `actor` | `string` | Actor ID (e.g. `ADMIN001`, `EMP001`, `system`) |
| `createdAt` | `string` | ISO 8601 timestamp |

### 1.15 `Settings`
| Field | Type | Default |
|---|---|---|
| `radius` | `number` | `100` |
| `notifyAssigned` | `boolean` | `true` |
| `notifyVerified` | `boolean` | `true` |
| `notifyFailed` | `boolean` | `true` |
| `notifyDeadline` | `boolean` | `true` |
| `sessionMinutes` | `number` | `30` |
| `gpsDemo` | `{ enabled: boolean; mode: "at_location" | "near" | "far" }` | `{ enabled: false, mode: "at_location" }` |

### 1.16 `Session`
| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | User ID |
| `role` | `Role` | `"admin" | "employee"` |
| `name` | `string` | User name |
| `createdAt` | `string` | ISO timestamp |
| `expiresAt` | `string` | ISO timestamp |
| `remember` | `boolean` | If true, 7 days; otherwise `settings.sessionMinutes` (30m) |

---

## 2. Service Functions, Inputs, Outputs, Validation Rules & Error Messages

### 2.1 `authService.ts`
- **`login(userId: string, password: string, role: Role, remember: boolean): Session`**
  - *Inputs*: `userId`, `password`, `role`, `remember`.
  - *Validation & Error Messages*:
    - If user not found or password incorrect: `"Invalid User ID or password."`
    - If `user.role !== role`: `"This account is not registered as ${role === "admin" ? "an Admin" : "an Employee"}."`
    - If employee not found in employee records: `"Employee record not found. Contact your administrator."`
    - If `emp.status !== "active"`: `"Your account has been deactivated. Contact your administrator."`
  - *Outputs*: `Session` object. Updates `lastLogin` timestamp, creates activity log entry.
- **`logout(): void`**: Clears local session.
- **`current(): Session | null`**: Returns active unexpired session.
- **`touch(): void`**: Slides expiry forward by `settings.sessionMinutes` if `!remember`.
- **`rememberedId(): string`**: Gets saved remembered user ID.
- **`homeFor(role: Role): string`**: Returns `/admin/dashboard` or `/employee/dashboard`.

### 2.2 `departmentService.ts`
- **Validation**:
  - `name.trim().length < 2`: `"Enter a department name."`
  - `!/^[A-Za-z&/ ]{1,6}$/.test(code.trim())`: `"Code must be 1–6 letters (e.g. CEN, S&T)."`
- **`create(input: DepartmentInput): void`**
  - Name already exists: `"A department with this name already exists."`
  - Code already exists: `"A department with this code already exists."`
  - Outputs: void. Inserts department, logs activity.
- **`update(id: string, input: DepartmentInput): void`**
  - Name collision with other dept: `"A department with this name already exists."`
  - Code collision with other dept: `"A department with this code already exists."`
  - Outputs: void.
- **`remove(id: string): void`**
  - If `db.employees.some(e => e.department === dept.name)`: `"Employees are still assigned to this department. Reassign them first."`
  - Outputs: void. Deletes department.

### 2.3 `locationTypeService.ts`
- **Validation**:
  - `name.trim().length < 2`: `"Enter a location type name."`
  - `!/^[A-Za-z&/ ]{1,6}$/.test(code.trim())`: `"Code must be 1–6 letters (e.g. JST, BRG)."`
- **`create(input: LocationTypeInput): void`**
  - Name collision: `"A location type with this name already exists."`
  - Code collision: `"A location type with this code already exists."`
  - Outputs: void.
- **`update(id: string, input: LocationTypeInput): void`**
  - Name collision with other record: `"A location type with this name already exists."`
  - Code collision with other record: `"A location type with this code already exists."`
  - Outputs: void.
- **`remove(id: string): void`**
  - If `db.locations.some(l => l.type === type.name)`: `"Locations still use this type. Move them to another type first."`
  - Outputs: void. Deletes location type.

### 2.4 `locationService.ts`
- **Validation**:
  - `l.name.trim().length < 3`: `"Enter a location name."`
  - `!l.address.trim()`: `"Enter the address."`
  - `!Number.isFinite(l.lat) || l.lat < -90 || l.lat > 90`: `"Latitude must be between -90 and 90."`
  - `!Number.isFinite(l.verificationRadius) || l.verificationRadius < 10 || l.verificationRadius > 2000`: `"Verification radius must be between 10 and 2000 metres."`
  - `!Number.isFinite(l.lng) || l.lng < -180 || l.lng > 180`: `"Longitude must be between -180 and 180."`
- **`create(input: LocationInput): void`**
  - Name exists: `"A location with this name already exists."`
  - Outputs: void. Adds location, logs activity.
- **`update(id: string, input: LocationInput): void`**
  - Runs validation. Updates location.
- **`remove(id: string): void`**
  - If `db.tasks.some(t => t.locationId === id)`: `"This location has visit records. Mark it inactive instead of deleting."`

### 2.5 `employeeService.ts`
- **Validation**:
  - `!/^[A-Z0-9]{3,12}$/.test(e.id)`: `"Employee ID must be 3–12 letters/digits (e.g. EMP010)."`
  - `e.name.trim().length < 3`: `"Enter the employee's full name."`
  - `!/^[6-9]\d{9}$/.test(e.phone.replace(/\D/g, "").slice(-10))`: `"Enter a valid 10-digit Indian mobile number."`
  - `!/^\S+@\S+\.\S+$/.test(e.email)`: `"Enter a valid email address."`
  - `!e.department`: `"Select a department."`
  - `e.password !== undefined && e.password.length < 6`: `"Password must be at least 6 characters."`
- **`passwordOf(id: string): string`**: Returns password of user.
- **`create(input: EmployeeInput): void`**
  - If `!password`: `"Set a login password for the employee."`
  - If ID exists in employees or users: `"Employee ID ${e.id} already exists."`
  - Creates employee and corresponding user.
- **`update(id: string, input: EmployeeInput): void`**: Updates employee and user.
- **`setStatus(id: string, status: "active" | "inactive"): void`**: Toggles status, logs activity.
- **`remove(id: string): void`**
  - If open visits exist (`["assigned", "in_progress", "pending", "location_reached", "checked_in"].includes(t.status)`): `"This employee has open visits. Reassign or close them before deleting, or deactivate instead."`

### 2.6 `taskService.ts`
- **`validateAssignment(db: DB, i: AssignInput): { field: string; message: string }[]`**:
  - `!i.employeeId` -> `"Select an employee."`
  - `!emp` -> `"Selected employee no longer exists."`
  - `emp.status !== "active"` -> `"Selected employee is inactive."`
  - `!i.locationId` -> `"Select a location."`
  - `!loc || loc.status !== "active"` -> `"Selected location is not available."`
  - `!i.date` -> `"Select a visit date."`
  - `i.date < todayISO()` -> `"Visit date cannot be in the past."`
  - `i.startTime && !/^\d{2}:\d{2}$/.test(i.startTime)` -> `"Enter a valid start time."`
  - `i.endTime && !/^\d{2}:\d{2}$/.test(i.endTime)` -> `"Enter a valid end time."`
  - `i.startTime && i.endTime && i.endTime <= i.startTime` -> `"End time must be after start time."`
  - `i.date && i.endTime && taskDateTime(i.date, i.endTime) < new Date()` -> `"The visit window has already ended."`
  - Location conflict (`locationConflict(db, locationId, date, employeeId)`): `"This location is already scheduled for ${c.employeeName} (${c.employeeId}) on ${fmtDate(date)}. Please select another date or location."`
  - Duplicate visit: if `!i.allowDuplicate` and same employee has visit to same location on date (where `status !== "expired"`): `"This employee already has a visit to this location on the selected date."`
- **`validatePlan(db: DB, employeeId: string, i: PlanInput, ignoreTaskId?: string): string | null`**:
  - `!i.date` -> `"Select a visit date."`
  - `i.date < todayISO()` -> `"Visit date cannot be in the past."`
  - `!i.locationId` -> `"Select a location."`
  - `!loc || loc.status !== "active"` -> `"Selected location is not available."`
  - Conflict check: `"This location is already scheduled for ${c.employeeName} (${c.employeeId}) on ${fmtDate(date)}. Please select another date or location."`
  - Self-duplicate check: `"You already have a visit to this location on that date."`
- **`tick()`**: Evaluates clock-driven transitions (`applyClock`):
  - If `end < now` and status not verified/missed: moves to `"expired"` if `startedAt`, else `"not_visited"`. Generates `deadline_passed` notifications for admin and employee.
  - If `status === "assigned"` and `startTime` has arrived (`start < now`): moves to `"pending"`.
- **`assign(i: AssignInput): Task`**:
  - Validates assignment. Throws first error.
  - Inserts task with status `"assigned"`, `createdBy = "ADMIN001"`. Emits notification & activity.
- **`plan(employeeId: string, i: PlanInput): Task`**:
  - Validates plan. Inserts task with status `"assigned"`, `priority = "medium"`, `createdBy = employeeId`, `startTime = ""`, `endTime = ""`.
  - Emits notification & activity.
- **`updatePlan(employeeId: string, id: string, i: PlanInput): void`**:
  - If task not found or `t.employeeId !== employeeId`: `"Visit record not found."`
  - If `!isSelfPlanned(t)`: `"This visit was assigned by Admin and cannot be changed."`
  - If `t.checkIn || !["assigned", "pending"].includes(t.status)`: `"This visit has already started and can no longer be edited."`
  - Validates plan.
  - 9:00 AM Rule: if location changed and `pastCutoff(t.date)` and `plannedBeforeCutoff(t)`, archives old record to `taskHistory` with `kind: "replaced"` and `note: "Location changed after 9:00 AM to ${newLoc}."`, creating a new task ID.
- **`deleteByEmployee(employeeId: string, id: string): "deleted" | "archived"`**:
  - If task not found or not owned: `"Visit record not found."`
  - If `!isSelfPlanned(t)`: `"Assigned by Admin — only Admin can delete this visit."`
  - If `t.checkIn || !["assigned", "pending"].includes(t.status)`: `"This visit has already started and cannot be deleted."`
  - If `pastCutoff(t.date)`: archives to `taskHistory` with `kind: "cancelled"` and `note: "Cancelled by employee after 9:00 AM."`. Returns `"archived"`. Otherwise deletes directly, returns `"deleted"`.
- **`remove(id: string): void`** (Admin Delete):
  - Archives to `taskHistory` with `kind: "cancelled"` and note `"Deleted by Admin."`. Removes from tasks list.
- **`lockMessage(id: string): string | null`**:
  - Returns `blockingVisit(db, t)` message: `"Please complete Check-Out at ${names(db, b).loc} before starting this visit."`
- **`start(id: string): void`**:
  - If `t.date !== todayISO()`: throws `"This visit is scheduled for a later date."` or `"This visit date has passed."`
  - If `taskDateTime(t.date, effEnd(t)) < now`: throws `"The visit window has ended."`
  - If sequential lock active: throws lock message.
  - Sets `status = "in_progress"`, `startedAt = now`. Emits notification & activity.
- **`recordGps(id: string, fix: GpsFix): { distance, passed, radius, stage }`**:
  - Checks sequential lock if stage is `"checkin"`.
  - Calculates Haversine distance from site coordinates to `(fix.lat, fix.lng)`.
  - Compares with `loc.verificationRadius ?? 100`.
  - Appends to `task.attempts`.
  - If passed: sets `status = "location_reached"`, `verificationStatus = "verified"`, records `reachedAt`.
  - If failed: sets `status = "verification_failed"`, `verificationStatus = "failed"`. Emits failure activity and notification.
- **`submitStage(id: string, photo: string, photoTimestamp: string): void`**:
  - If `t.status !== "location_reached"`: `"Location must be verified before submitting."`
  - If `stage === "checkin"`: sets `checkIn` stage, `status = "checked_in"`, records photo.
  - If `stage === "checkout"`: sets `checkOut` stage, `status = "verified"`, `verifiedAt = now`. Emits completion notification & activity.
- **`override(id: string, stage: "checkin" | "checkout", reason: string): void`**:
  - If `reason.trim().length < 5`: `"Enter a reason / justification for the override."`
  - If `stage === "checkin" && t.checkIn`: `"This visit is already checked in."`
  - If `stage === "checkout" && !t.checkIn`: `"Check-in must be completed (or overridden) first."`
  - If `stage === "checkout" && t.checkOut`: `"This visit is already checked out."`
  - Creates `VisitStage` with `override: { reason, at, by: "ADMIN001" }`. Sets `overriddenByAdmin = true`.
  - If checkin: `status = "checked_in"`.
  - If checkout: `status = "verified"`, `verifiedAt = now`.
  - Releases sequential lock.

### 2.7 `notificationService.ts`
- **`makeNotification(db, n)`**: Appends notification up to 300 items, checks admin notification preferences in `settings`.
- **`makeActivity(db, a)`**: Appends activity up to 500 items.
- **`forAudience(db, audience)`**: Filter notifications by audience (`"admin"` or employee ID).
- **`markRead(id)`**: Mark single notification read.
- **`markAllRead(audience)`**: Mark all notifications for audience read.
- **`activityService.recent(db, limit)`**: Returns recent activity logs.

### 2.8 `reportService.ts`
- **`filterTasks(db: DB, f: ReportFilters): Task[]`**: Filters by `from`, `to`, `employeeId`, `department`, `locationId`, `status`, `planning` (`"self"` vs `"admin"`), `checkInBy` (`"admin"` vs `"employee"`), `checkOutBy` (`"admin"` vs `"employee"`).
- **`exportVisitsCsv(db, tasks, filename)`**: Generates 15-column CSV with columns:
  1. `Visit ID`
  2. `Employee Name`
  3. `Employee ID`
  4. `Location Name`
  5. `Location Assigned By` (`"Self"` or `"Admin"`)
  6. `Location Priority`
  7. `Check-In By` (`"Admin Override"` or `"Self"`)
  8. `Check-In Time`
  9. `Check-In GPS Verified` (`"Override"`, `"Yes"`, or `""`)
  10. `Check-In Photo Submitted` (`"Yes"`, `"No"`, or `""`)
  11. `Check-Out By`
  12. `Check-Out Time`
  13. `Check-Out GPS Verified`
  14. `Check-Out Photo Submitted`
  15. `Status` (Label from `STATUS_META`)
- **`exportEmployeesCsv(db, employees, filename)`**: Generates 9-column CSV (`Employee ID`, `Name`, `Designation`, `Department`, `Phone`, `Email`, `Status`, `Joining Date`, `Total Completed Visits`).
- **`exportLocationsCsv(db, locations, filename)`**: Generates 9-column CSV (`Location ID`, `Name`, `Location Type`, `Verification Radius (m)`, `Latitude`, `Longitude`, `Address`, `Status`, `Total Visits`).
- **`exportLocationVisitsCsv(db, location, filename)`**: Generates 14-column CSV of location visit history.

---

## 3. Business Rules Found in Code, with Exact File and Function

1. **Haversine Proximity Check**:
   - `frontend/src/services/verificationService.ts:haversine` & `frontend/src/services/taskService.ts:recordGps`
   - Radius `R = 6,371,000 m`. Distance must be `<= location.verificationRadius` (fallback 100 m).
2. **Sequential Visit Locking**:
   - `frontend/src/lib/visitRules.ts:blockingVisit` & `frontend/src/services/taskService.ts:lockMessage`, `start`, `recordGps`
   - If an employee has another visit on the same date where `checkIn` is present and `checkOut` is absent, they cannot start or check in to a subsequent visit. Message: `"Please complete Check-Out at ${loc} before starting this visit."`
3. **9:00 AM Cutoff for Self-Planning**:
   - `frontend/src/lib/visitRules.ts:pastCutoff`, `plannedBeforeCutoff` & `frontend/src/services/taskService.ts:updatePlan`, `deleteByEmployee`
   - Cutoff is 09:00 IST (`CUTOFF_MINUTES = 540`).
   - Before 9:00 AM on visit date (or created prior): free edit/delete.
   - After 9:00 AM on visit date: editing location generates a new visit ID and archives original to `taskHistory` as `"replaced"`. Deleting archives to `taskHistory` as `"cancelled"`.
4. **Admin-Assigned Protection**:
   - `frontend/src/lib/visitRules.ts:isSelfPlanned` & `frontend/src/services/taskService.ts:updatePlan`, `deleteByEmployee`
   - Inspectors can only edit or delete self-planned visits (`createdBy === employeeId`). Admin-assigned visits throw `"This visit was assigned by Admin and cannot be changed."` or `"Assigned by Admin — only Admin can delete this visit."`
5. **Location Conflict on Same Date**:
   - `frontend/src/lib/visitRules.ts:locationConflict` & `frontend/src/services/taskService.ts:validateAssignment`, `validatePlan`
   - Two different employees cannot be scheduled for the same location on the same date.
6. **Duplicate Location Visit for Same Employee**:
   - `frontend/src/services/taskService.ts:validateAssignment` & `validatePlan`
   - An employee cannot be scheduled twice for the same location on the same date unless admin explicitly checks `allowDuplicate`.
7. **Two-Stage Order & Progression**:
   - `frontend/src/lib/visitRules.ts:currentStage` & `frontend/src/services/taskService.ts:recordGps`, `submitStage`, `override`
   - Check-in must precede check-out. Location proximity must be verified (`"location_reached"`) before photo submission for that stage.
8. **Admin Override Rules**:
   - `frontend/src/services/taskService.ts:override`
   - Reason is mandatory (minimum 5 chars in frontend; prompt calls for min 10 chars server-side). Overriding check-in unlocks working state; overriding check-out marks visit completed and releases sequential visit lock.
9. **Referential Delete Guards**:
   - `frontend/src/services/departmentService.ts:remove`: Cannot delete department if any employee is assigned.
   - `frontend/src/services/locationTypeService.ts:remove`: Cannot delete location type if any location uses it.
   - `frontend/src/services/locationService.ts:remove`: Cannot delete location if any visit record exists.
   - `frontend/src/services/employeeService.ts:remove`: Cannot delete employee if any open visits (`["assigned", "pending", "in_progress", "location_reached", "checked_in"]`) exist.
10. **Automatic Clock-Driven Expiry & Lifecycle**:
    - `frontend/src/services/taskService.ts:applyClock` (called on `tick()`)
    - If task end time has passed and not verified: marked `"expired"` if started, else `"not_visited"`. Emits `deadline_passed` notification to admin and employee.
    - If scheduled start time has passed for an `"assigned"` visit: marked `"pending"`.
11. **Session Timeout & Touch**:
    - `frontend/src/services/authService.ts:login`, `touch`, `current` & `frontend/src/hooks/useSession.ts`
    - Standard session: 30 minutes idle timeout (`settings.sessionMinutes`).
    - "Remember Me": 7 days (`7 * 24 * 60` minutes).
    - Touch slides expiry window forward if `!remember`.

---

## 4. Every Screen's Data Needs (Reads & Writes per Route)

| Route | Reads | Writes / Mutations |
|---|---|---|
| `/` | `authService.current()` | None (redirects to `/login` or dashboard) |
| `/login` | `users`, `employees`, `settings.sessionMinutes`, remembered ID | `authService.login`: updates `users[].lastLogin`, session in prefs, logs `activities` |
| `/install` | PWA manifest / install prompt state | None |
| `/admin` (layout) | `tasks` (count of open visits today), current session | `authService.touch()`, `authService.logout()` |
| `/admin/dashboard` | `employees`, `tasks`, `locations`, `activities` | None (reads for KPIs, charts, and today's schedule table) |
| `/admin/employees` | `employees`, `departments`, `tasks` (for visit counts / work history) | `employeeService.create`, `employeeService.update`, `employeeService.setStatus`, `employeeService.remove` |
| `/admin/departments` | `departments`, `employees` (for usage counts) | `departmentService.create`, `departmentService.update`, `departmentService.remove` |
| `/admin/locations` | `locations`, `locationTypes`, `tasks` (for stats and history) | `locationService.create`, `locationService.update`, `locationService.remove` |
| `/admin/location-types` | `locationTypes`, `locations` (for usage counts) | `locationTypeService.create`, `locationTypeService.update`, `locationTypeService.remove` |
| `/admin/tasks` (Assign) | `employees` (active), `locations` (active), `tasks` (conflicts, recent) | `taskService.assign`: creates `Task`, emits notification & activity |
| `/admin/monitoring` | `tasks`, `employees`, `locations` | Filter & CSV export; row click opens `TaskDrawer` (see actions below) |
| `/admin/map` | `tasks` (by date), `locations`, `employees` | Marker clicks open `TaskDrawer` |
| `/admin/reports` | `tasks`, `employees`, `departments`, `locations` | Filter, print PDF, CSV export; row click opens `TaskDrawer` |
| `TaskDrawer` (Admin) | `tasks`, `employees`, `locations` | `taskService.override` (`checkin` | `checkout`), `taskService.remove` |
| `/employee` (layout) | Current session, `notifications` (unread for employee) | `notificationService.markRead`, `markAllRead`, `authService.touch()`, `logout()` |
| `/employee/dashboard` | `tasks` (for employee today), `locations` | None (click task navigates to task flow) |
| `/employee/tasks/` | `tasks` (mine, tabs: Today, Upcoming, Open), `locations` | `PlanVisitDialog` (opens create self-planned visit) |
| `/employee/tasks/$id` | Single `task`, `location`, `blockingVisit` | `taskService.start`, `taskService.recordGps`, `taskService.submitStage`, `taskService.updatePlan`, `taskService.deleteByEmployee` |
| `/employee/visits` | `tasks` (mine, status verified/missed), `locations`, `employee` | PDF report export |
| `/employee/profile` | `employee` record, session | `authService.logout()` |

---

## 5. Mismatches Between Prompt & Real Code

Here are the discrepancies found between the prompt specification and the actual frontend codebase:

1. **Role Naming**:
   - *Prompt*: Mentions roles `"admin"` and `"inspector"`.
   - *Code (`types.ts:1`)*: Role is defined as `"admin" | "employee"`. The UI and code refer to `"employee"` across all types, services, and route guards.
   - *Recommendation*: Support `"admin"` and `"employee"` (or accept `"employee"` while exposing `"inspector"` alias if required, but keep `"employee"` to prevent frontend breaking).

2. **Derived Task Status vs Stored Status**:
   - *Prompt Decision*: Proposes deriving task status from stages (no stages = `pending`, check-in only = `in_progress`, both = `completed`, cancelled separate).
   - *Code (`types.ts:44-53`)*: Has 9 explicit statuses:
     `"assigned"`, `"in_progress"`, `"location_reached"`, `"checked_in"`, `"verified"`, `"pending"`, `"not_visited"`, `"verification_failed"`, `"expired"`.
     Specifically:
     - `"assigned"`: Scheduled, not yet time or not yet started.
     - `"pending"`: Window has opened but not started.
     - `"in_progress"`: Employee tapped "Start visit", but has not verified location.
     - `"location_reached"`: GPS passed proximity, awaiting photo capture and stage submit.
     - `"verification_failed"`: GPS attempt failed distance check.
     - `"not_visited"` / `"expired"`: Deadline elapsed.
     - `"checked_in"`: Check-in stage submitted with photo or override.
     - `"verified"`: Check-out stage submitted with photo or override.
   - *Resolution*: While final completion is indeed stages-based, the frontend relies heavily on `"assigned"`, `"pending"`, `"in_progress"`, `"location_reached"`, `"checked_in"`, and `"verification_failed"` for its step indicators (`Steps` component), map markers (`markerColor`), and action buttons (`Start visit`, `Verify location`, `Capture photo`). Storing `status` on `tasks` (or computing a state machine that preserves these exact status strings) is required so the frontend components continue to function without redesign.

3. **Admin Override Reason Length**:
   - *Prompt*: Mentions min 10 characters.
   - *Code (`taskService.ts:298`)*: `r.length < 5` (UI textarea has min 5 char check to enable button: `reason.trim().length < 5`).
   - *Resolution*: We will enforce min 10 characters on the backend as specified in prompt rules, and adjust the client-side validation message if needed or accept min 10 characters server-side.

4. **GPS Accuracy Threshold**:
   - *Prompt*: Reject if GPS accuracy is worse than 100 m.
   - *Code (`verificationService.ts:52`)*: Defines `LOW_ACCURACY_THRESHOLD = 50` for display warning (`"GPS accuracy is currently low"`), but does not hard reject in local storage logic.
   - *Resolution*: Move accuracy check to server-side business rules: reject if accuracy > 100 m (configurable via env var `GPS_MAX_ACCURACY_METERS=100`).

5. **Entity Foreign Keys vs Names**:
   - *Code*: In `Employee`, the department is stored as string `department` (matching `Department.name`, e.g. `"Civil Engineering"`), not `departmentId`. Similarly in `VisitLocation`, `type` is string (matching `LocationTypeItem.name`, e.g. `"Junction Station"`).
   - *Schema in prompt*: Has `department_id`.
   - *Resolution*: In the PostgreSQL DB, we will use foreign key IDs (`department_id`, `location_type_id`) with appropriate joins/relations, and serialize them so the API provides both or preserves the frontend contract seamlessly.

6. **Seed Data Admin & Inspectors**:
   - *Prompt*: 1 admin (`ADMIN001`), inspectors `EMP001`–`EMP003`.
   - *Code (`seed.ts`)*: Has `ADMIN001` and 9 employees (`EMP001` through `EMP009`), with `EMP009` inactive.
   - *Resolution*: In backend seed, seed `ADMIN001` and all 9 employees (`EMP001`–`EMP009`) with their exact seed names, phones, departments, designations, and joining dates to ensure parity with the frontend fixtures.

7. **Notification Audience & DB settings**:
   - *Code*: Has `notifications` and `activities` collections in the DB, plus `settings` toggling which notifications are recorded.
   - *Resolution*: Ensure notifications/activity tables exist or are created cleanly to support the NotificationBell and dashboard activities.

---

## 6. Checkpoint Summary

- All frontend files under `src/services`, `src/types.ts`, `src/lib`, `src/hooks`, `src/components/rt`, and `src/routes` have been thoroughly inspected.
- `BACKEND_FINDINGS.md` is fully compiled.
- No code modifications have been made yet.
- Ready to proceed to **Phase 1: Drizzle schema + migrations + seed** upon user approval.
