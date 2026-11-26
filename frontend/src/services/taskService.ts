import type { DB, Priority, Task, TaskHistoryEntry, TaskStatus, VisitStage } from "@/types";
import { storage, uid } from "./storageService";
import { makeActivity, makeNotification } from "./notificationService";
import { fmtDate, fmtWindow, taskDateTime, todayISO } from "@/lib/format";
import { haversine, type GpsFix } from "./verificationService";
import { blockingVisit, currentStage, DEFAULT_RADIUS, effEnd, effStart, isSelfPlanned, pastCutoff, plannedBeforeCutoff } from "@/lib/visitRules";
import { apiClient } from "./apiClient";

export interface AssignInput {
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  instructions: string;
  allowDuplicate?: boolean;
}

export interface PlanInput {
  locationId: string;
  date: string;
  instructions: string;
}

export const OPEN: TaskStatus[] = ["assigned", "pending", "in_progress", "location_reached", "checked_in", "verification_failed"];
export const MISSED: TaskStatus[] = ["not_visited", "expired"];
const ADMIN = "ADMIN001";

const names = (db: DB, t: Pick<Task, "employeeId" | "locationId">) => ({
  emp: db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId,
  loc: db.locations.find((l) => l.id === t.locationId)?.name ?? t.locationId,
});

export const radiusOf = (db: DB, locationId: string) => db.locations.find((l) => l.id === locationId)?.verificationRadius ?? DEFAULT_RADIUS;

// function conflictMessage(db: DB, locationId: string, date: string, employeeId: string, ignore?: string) {
//   const c = locationConflict(db, locationId, date, employeeId, ignore);
//   return c ? `This location is already scheduled for ${c.employeeName} (${c.employeeId}) on ${fmtDate(date)}. Please select another date or location.` : null;
// }

export function validateAssignment(db: DB, i: AssignInput): { field: string; message: string }[] {
  const errs: { field: string; message: string }[] = [];
  const emp = db.employees.find((e) => e.id === i.employeeId);
  if (!i.employeeId) errs.push({ field: "employee", message: "Select an employee." });
  else if (!emp) errs.push({ field: "employee", message: "Selected employee no longer exists." });
  else if (emp.status !== "active") errs.push({ field: "employee", message: "Selected employee is inactive." });
  const loc = db.locations.find((l) => l.id === i.locationId);
  if (!i.locationId) errs.push({ field: "location", message: "Select a location." });
  else if (!loc || loc.status !== "active") errs.push({ field: "location", message: "Selected location is not available." });
  if (!i.date) errs.push({ field: "date", message: "Select a visit date." });
  else if (i.date < todayISO()) errs.push({ field: "date", message: "Visit date cannot be in the past." });
  if (i.startTime && !/^\d{2}:\d{2}$/.test(i.startTime)) errs.push({ field: "startTime", message: "Enter a valid start time." });
  if (i.endTime && !/^\d{2}:\d{2}$/.test(i.endTime)) errs.push({ field: "endTime", message: "Enter a valid end time." });
  else if (i.startTime && i.endTime && i.endTime <= i.startTime) errs.push({ field: "endTime", message: "End time must be after start time." });
  if (i.date && i.endTime && taskDateTime(i.date, i.endTime) < new Date()) errs.push({ field: "endTime", message: "The visit window has already ended." });
  // if (i.locationId && i.date && i.employeeId) {
  //   const c = conflictMessage(db, i.locationId, i.date, i.employeeId);
  //   if (c) errs.push({ field: "conflict", message: c });
  // }
  // if (!i.allowDuplicate && db.tasks.some((t) => t.employeeId === i.employeeId && t.locationId === i.locationId && t.date === i.date && t.status !== "expired"))
  //   errs.push({ field: "duplicate", message: "This employee already has a visit to this location on the selected date." });
  return errs;
}

export function validatePlan(db: DB, employeeId: string, i: PlanInput, ignoreTaskId?: string): string | null {
  if (!i.date) return "Select a visit date.";
  if (i.date < todayISO()) return "Visit date cannot be in the past.";
  const loc = db.locations.find((l) => l.id === i.locationId);
  if (!i.locationId) return "Select a location.";
  if (!loc || loc.status !== "active") return "Selected location is not available.";
  // const c = conflictMessage(db, i.locationId, i.date, employeeId, ignoreTaskId);
  // if (c) return c;
  // if (db.tasks.some((t) => t.id !== ignoreTaskId && t.employeeId === employeeId && t.locationId === i.locationId && t.date === i.date))
  //   return "You already have a visit to this location on that date.";
  return null;
}

/** Automatic lifecycle transitions driven by the clock. */
// function applyClock(db: DB): DB {
//   const now = new Date();
//   let changed = false;
//   let notifications = db.notifications;
//   let activities = db.activities;
//   const tasks = db.tasks.map((t) => {
//     if (t.status === "verified" || MISSED.includes(t.status)) return t;
//     const end = taskDateTime(t.date, effEnd(t));
//     const start = taskDateTime(t.date, effStart(t));
//     let next: TaskStatus = t.status;
//     if (end < now) next = t.startedAt ? "expired" : "not_visited";
//     else if (t.status === "assigned" && t.startTime && start < now) next = "pending";
//     if (next === t.status) return t;
//     changed = true;
//     if (MISSED.includes(next)) {
//       const { emp, loc } = names(db, t);
//       const tmp = { ...db, notifications, activities };
//       notifications = makeNotification(tmp, { type: "deadline_passed", title: "Deadline passed", message: `${emp} — ${loc} was not completed in time.`, audience: "admin", taskId: t.id });
//       notifications = makeNotification({ ...tmp, notifications }, { type: "deadline_passed", title: "Visit deadline passed", message: `${loc} was not completed in time.`, audience: t.employeeId, taskId: t.id });
//       activities = makeActivity({ ...tmp, activities }, { kind: "warning", actor: "system", message: `Visit deadline expired for ${emp} at ${loc}.` });
//     }
//     return { ...t, status: next };
//   });
//   return changed ? { ...db, tasks, notifications, activities } : db;
// }

/** Automatic lifecycle transitions driven by the clock. */
function applyClock(db: DB): DB {
  const now = new Date();
  let changed = false;
  let notifications = db.notifications;
  let activities = db.activities;
  const tasks = db.tasks.map((t) => {
    // Never change terminal statuses
    if (t.status === "verified" || MISSED.includes(t.status)) return t;

    const end = taskDateTime(t.date, effEnd(t));
    const start = taskDateTime(t.date, effStart(t));
    let next: TaskStatus = t.status;

    if (end < now) {
      // Window over: any non-terminal status becomes a miss
      const started =
        !!t.startedAt ||
        !!t.checkIn ||
        ["in_progress", "location_reached", "checked_in", "verification_failed"].includes(
          t.status
        );
      next = started ? "expired" : "not_visited";
    } else if (t.status === "assigned" && t.startTime && start < now) {
      next = "pending";
    }

    if (next === t.status) return t;
    changed = true;

    if (MISSED.includes(next)) {
      const { emp, loc } = names(db, t);
      const tmp = { ...db, notifications, activities };
      notifications = makeNotification(tmp, {
        type: "deadline_passed",
        title: "Deadline passed",
        message: `${emp} — ${loc} was not completed in time.`,
        audience: "admin",
        taskId: t.id,
      });
      notifications = makeNotification(
        { ...tmp, notifications },
        {
          type: "deadline_passed",
          title: "Visit deadline passed",
          message: `${loc} was not completed in time.`,
          audience: t.employeeId,
          taskId: t.id,
        }
      );
      activities = makeActivity(
        { ...tmp, activities },
        {
          kind: "warning",
          actor: "system",
          message: `Visit deadline expired for ${emp} at ${loc}.`,
        }
      );
    }
    return { ...t, status: next };
  });
  return changed ? { ...db, tasks, notifications, activities } : db;
}

function patchTask(id: string, fn: (t: Task, db: DB) => Partial<DB> & { task: Task }) {
  storage.update((db) => {
    const t = db.tasks.find((x) => x.id === id);
    if (!t) throw new Error("Visit record not found.");
    const { task, ...rest } = fn(t, db);
    return { ...db, ...rest, tasks: db.tasks.map((x) => (x.id === id ? task : x)) };
  });
}

function archive(db: DB, t: Task, kind: TaskHistoryEntry["kind"], by: string, note: string): TaskHistoryEntry[] {
  return [{ id: uid("HST"), kind, task: t, by, at: new Date().toISOString(), note }, ...(db.taskHistory ?? [])].slice(0, 500);
}

function lockMessage(db: DB, t: Task) {
  const b = blockingVisit(db, t);
  if (!b) return null;
  return `Please complete Check-Out at ${names(db, b).loc} before starting this visit.`;
}

export const taskService = {
  tick() {
    const db = storage.get();
    const next = applyClock(db);
    if (next !== db) storage.update(() => next);
  },
  async assign(i: AssignInput): Promise<Task> {
    const db = storage.get();
    const errs = validateAssignment(db, i);
    if (errs.length) throw new Error(errs[0].message);

    // Call backend API
    const res = await apiClient<any>("/tasks", {
      method: "POST",
      body: JSON.stringify({
        employeeId: i.employeeId,
        locationId: i.locationId,
        date: i.date,
        startTime: i.startTime || undefined,
        endTime: i.endTime || undefined,
        priority: i.priority,
        instructions: i.instructions.trim(),
        allowDuplicate: i.allowDuplicate,
      }),
    });

    const task: Task = {
      id: res.id,
      employeeId: res.employeeId,
      locationId: res.locationId,
      date: res.scheduledDate || i.date,
      startTime: res.startTime || i.startTime,
      endTime: res.endTime || i.endTime,
      priority: res.priority || i.priority,
      instructions: res.instructions || i.instructions.trim(),
      status: res.status || "assigned",
      createdAt: res.createdAt || new Date().toISOString(),
      createdBy: ADMIN,
      attempts: [],
      verificationStatus: "none",
    };

    const { emp, loc } = names(db, task);
    storage.update((d) => {
      const n1 = makeNotification(d, {
        type: "task_assigned",
        title: "New visit assigned",
        message: `${loc} on ${fmtDate(i.date)}, ${fmtWindow(i)}`,
        audience: i.employeeId,
        taskId: task.id,
      });
      return {
        ...d,
        tasks: [...d.tasks.filter((t) => t.id !== task.id), task],
        notifications: n1,
        activities: makeActivity(d, {
          kind: "info",
          actor: ADMIN,
          message: `A new task was assigned to ${emp} — ${loc}.`,
        }),
      };
    });
    return task;
  },

  /** Employee self-planning */
  async plan(employeeId: string, i: PlanInput): Promise<Task> {
    const db = storage.get();
    const err = validatePlan(db, employeeId, i);
    if (err) throw new Error(err);

    // Call backend API
    const res = await apiClient<any>("/tasks/plan", {
      method: "POST",
      body: JSON.stringify({
        locationId: i.locationId,
        date: i.date,
        instructions: i.instructions.trim(),
      }),
    });

    const task: Task = {
      id: res.id,
      employeeId,
      locationId: res.locationId || i.locationId,
      date: res.scheduledDate || i.date,
      startTime: "",
      endTime: "",
      priority: "medium",
      instructions: i.instructions.trim(),
      status: res.status || "assigned",
      createdAt: res.createdAt || new Date().toISOString(),
      createdBy: employeeId,
      attempts: [],
      verificationStatus: "none",
    };

    const { emp, loc } = names(db, task);
    storage.update((d) => ({
      ...d,
      tasks: [...d.tasks.filter((t) => t.id !== task.id), task],
      notifications: makeNotification(d, {
        type: "task_assigned",
        title: "Visit planned",
        message: `${emp} planned a visit to ${loc} on ${fmtDate(i.date)}.`,
        audience: "admin",
        taskId: task.id,
      }),
      activities: makeActivity(d, {
        kind: "info",
        actor: employeeId,
        message: `${emp} planned a visit to ${loc} on ${fmtDate(i.date)}.`,
      }),
    }));
    return task;
  },

  async updatePlan(employeeId: string, id: string, i: PlanInput) {
    const db = storage.get();
    const t = db.tasks.find((x) => x.id === id);
    if (!t || t.employeeId !== employeeId) throw new Error("Visit record not found.");
    if (!isSelfPlanned(t)) throw new Error("This visit was assigned by Admin and cannot be changed.");
    if (t.checkIn || !["assigned", "pending"].includes(t.status)) throw new Error("This visit has already started and can no longer be edited.");
    const err = validatePlan(db, employeeId, i, id);
    if (err) throw new Error(err);

    // Call backend API
    const res = await apiClient<any>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        locationId: i.locationId,
        date: i.date,
        instructions: i.instructions.trim(),
      }),
    });

    const locChanged = i.locationId !== t.locationId;
    const keepHistory = locChanged && pastCutoff(t.date) && plannedBeforeCutoff(t);
    const { emp } = names(db, t);
    storage.update((d) => {
      const updated: Task = {
        ...t,
        locationId: res.locationId || i.locationId,
        date: res.scheduledDate || i.date,
        instructions: i.instructions.trim(),
      };
      const newLoc = names(d, updated).loc;
      return {
        ...d,
        tasks: d.tasks.map((x) => (x.id === id ? updated : x)),
        taskHistory: keepHistory ? archive(d, t, "replaced", employeeId, `Location changed after 9:00 AM to ${newLoc}.`) : d.taskHistory,
        activities: makeActivity(d, { kind: keepHistory ? "warning" : "info", actor: employeeId, message: keepHistory ? `${emp} changed today's planned visit to ${newLoc} after 9:00 AM (original kept in history).` : `${emp} updated a planned visit (${newLoc}).` }),
      };
    });
  },

  /** Employee delete — only their own self-planned visits that have not started. */
  async deleteByEmployee(employeeId: string, id: string): Promise<"deleted" | "archived"> {
    const db = storage.get();
    const t = db.tasks.find((x) => x.id === id);
    if (!t || t.employeeId !== employeeId) throw new Error("Visit record not found.");
    if (!isSelfPlanned(t)) throw new Error("Assigned by Admin — only Admin can delete this visit.");
    if (t.checkIn || !["assigned", "pending"].includes(t.status)) throw new Error("This visit has already started and cannot be deleted.");

    // Call backend API
    const res = await apiClient<any>(`/tasks/${id}`, {
      method: "DELETE",
    });

    const keep = res?.action === "archived" || pastCutoff(t.date);
    const { emp, loc } = names(db, t);
    storage.update((d) => ({
      ...d,
      tasks: d.tasks.filter((x) => x.id !== id),
      taskHistory: keep ? archive(d, t, "cancelled", employeeId, "Cancelled by employee after 9:00 AM.") : d.taskHistory,
      activities: makeActivity(d, { kind: "warning", actor: employeeId, message: `${emp} cancelled the planned visit to ${loc}${keep ? " (kept in history)" : ""}.` }),
    }));
    return keep ? "archived" : "deleted";
  },

  /** Admin can delete any visit. */
  async remove(id: string) {
    const db = storage.get();
    const t = db.tasks.find((x) => x.id === id);
    if (!t) return;

    // Call backend API
    await apiClient(`/tasks/${id}`, {
      method: "DELETE",
    });

    const { emp, loc } = names(db, t);
    storage.update((d) => ({
      ...d,
      tasks: d.tasks.filter((x) => x.id !== id),
      taskHistory: archive(d, t, "cancelled", ADMIN, "Deleted by Admin."),
      activities: makeActivity(d, { kind: "warning", actor: ADMIN, message: `Visit ${id} (${emp} — ${loc}) was deleted by Admin.` }),
    }));
  },


  lockMessage(id: string) {
    const db = storage.get();
    const t = db.tasks.find((x) => x.id === id);
    return t ? lockMessage(db, t) : null;
  },
  async start(id: string) {
    // Call backend API to record visit start
    apiClient(`/tasks/${id}/start`, { method: "POST" }).catch((err) =>
      console.warn("Backend start visit sync error:", err)
    );

    patchTask(id, (t, db) => {
      const now = new Date();
      if (t.date !== todayISO()) throw new Error(t.date > todayISO() ? "This visit is scheduled for a later date." : "This visit date has passed.");
      if (taskDateTime(t.date, effEnd(t)) < now) throw new Error("The visit window has ended.");
      const lock = lockMessage(db, t);
      if (lock) throw new Error(lock);
      if (!["assigned", "pending"].includes(t.status)) return { task: t };
      const { emp, loc } = names(db, t);
      return {
        task: { ...t, status: "in_progress", startedAt: now.toISOString() },
        notifications: makeNotification(db, { type: "visit_started", title: "Visit started", message: `${emp} started the visit at ${loc}.`, audience: "admin", taskId: id }),
        activities: makeActivity(db, { kind: "info", actor: t.employeeId, message: `${emp} started a visit at ${loc}.` }),
      };
    });
  },
  /** GPS check for the current stage (check-in or check-out). */
  recordGps(id: string, fix: GpsFix) {
    const db = storage.get();
    const t = db.tasks.find((x) => x.id === id);
    const loc = db.locations.find((l) => l.id === t?.locationId);
    if (!t || !loc) throw new Error("Visit record not found.");
    const stage = currentStage(t);
    if (stage === "checkin") { const lock = lockMessage(db, t); if (lock) throw new Error(lock); }
    const radius = loc.verificationRadius ?? DEFAULT_RADIUS;
    let distance = haversine(loc.lat, loc.lng, fix.lat, fix.lng);
    // For check-out, if check-in was already recorded, compute distance relative to either the target location or the verified check-in coordinates
    // if (stage === "checkout" && t.checkIn?.lat != null && t.checkIn?.lng != null) {
    //   const distFromCheckIn = haversine(t.checkIn.lat, t.checkIn.lng, fix.lat, fix.lng);
    //   if (distFromCheckIn <= radius || distFromCheckIn < distance) {
    //     distance = distFromCheckIn;
    //   }
    // }
    const passed = distance <= radius;
    const label = stage === "checkout" ? "Check-out" : "Check-in";

    // Call backend API asynchronously
    apiClient(`/tasks/${id}/record-gps`, {
      method: "POST",
      body: JSON.stringify({
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
        distance,
        passed,
      }),
    }).catch((err) => console.warn("Backend record-gps sync error:", err));

    patchTask(id, (task, d) => {
      const { emp } = names(d, task);
      const at = new Date().toISOString();
      const base = {
        ...task, employeeLatitude: fix.lat, employeeLongitude: fix.lng, gpsAccuracy: fix.accuracy, distanceFromLocation: distance, gpsDemo: fix.demo,
        startedAt: task.startedAt ?? at,
        attempts: [...task.attempts, { at, lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, distance, passed, demo: fix.demo }],
      };
      if (passed) {
        return {
          task: { ...base, status: "location_reached" as const, reachedAt: task.reachedAt ?? at, verificationStatus: "verified" as const },
          notifications: makeNotification(d, { type: "location_verified", title: `${label} location verified`, message: `${emp} is at ${loc.name} (${Math.round(distance)} m).`, audience: "admin", taskId: id }),
        };
      }
      return {
        task: { ...base, status: "verification_failed" as const, verificationStatus: "failed" as const },
        notifications: makeNotification(d, { type: "verification_failed", title: `${label} verification failed`, message: `${emp} was ${Math.round(distance)} m from ${loc.name}.`, audience: "admin", taskId: id }),
        activities: makeActivity(d, { kind: "danger", actor: task.employeeId, message: `${emp}'s ${label.toLowerCase()} verification failed at ${loc.name} (${Math.round(distance)} m away).` }),
      };
    });
    return { distance, passed, radius, stage };
  },

  /** Submit photo for the current stage after GPS passed. */
  submitStage(id: string, photo: string, photoTimestamp: string) {
    patchTask(id, (t, db) => {
      if (t.status !== "location_reached") throw new Error("Location must be verified before submitting.");
      const stage = currentStage(t);
      const { emp, loc } = names(db, t);
      const now = new Date().toISOString();
      const rec: VisitStage = { at: now, lat: t.employeeLatitude, lng: t.employeeLongitude, accuracy: t.gpsAccuracy, distance: t.distanceFromLocation, photo, photoTimestamp, demo: t.gpsDemo };
      if (stage === "checkin") {
        return {
          task: { ...t, status: "checked_in", checkIn: rec, photo, photoTimestamp },
          notifications: makeNotification(db, { type: "location_verified", title: "Checked in", message: `${emp} checked in at ${loc}.`, audience: "admin", taskId: id }),
          activities: makeActivity(db, { kind: "info", actor: t.employeeId, message: `${emp} checked in at ${loc}.` }),
        };
      }
      let notifications = makeNotification(db, { type: "visit_completed", title: "Visit completed", message: `${emp} checked out and completed the visit at ${loc}.`, audience: "admin", taskId: id });
      notifications = makeNotification({ ...db, notifications }, { type: "visit_completed", title: "Visit completed", message: `Your visit at ${loc} has been recorded.`, audience: t.employeeId, taskId: id });
      return {
        task: { ...t, status: "verified", checkOut: rec, verifiedAt: now, verificationStatus: "verified" },
        notifications,
        activities: makeActivity(db, { kind: "success", actor: t.employeeId, message: `${emp} completed a visit at ${loc}.` }),
      };
    });
  },
  /** Admin override for a stranded stage. */
  // override(id: string, stage: "checkin" | "checkout", reason: string) {
  //   const r = reason.trim();
  //   if (r.length < 5) throw new Error("Enter a reason / justification for the override.");
  //   patchTask(id, (t, db) => {
  //     if (stage === "checkin" && t.checkIn) throw new Error("This visit is already checked in.");
  //     if (stage === "checkout" && !t.checkIn) throw new Error("Check-in must be completed (or overridden) first.");
  //     if (stage === "checkout" && t.checkOut) throw new Error("This visit is already checked out.");
  //     const now = new Date().toISOString();
  //     const rec: VisitStage = { at: now, override: { reason: r, at: now, by: ADMIN } };
  //     const { emp, loc } = names(db, t);
  //     const label = stage === "checkin" ? "Check-In" : "Check-Out";
  //     const common = { overriddenByAdmin: true, adminOverrideReason: r, adminOverrideTimestamp: now, startedAt: t.startedAt ?? now };
  //     const task: Task = stage === "checkin"
  //       ? { ...t, ...common, status: "checked_in", checkIn: rec }
  //       : { ...t, ...common, status: "verified", checkOut: rec, verifiedAt: now, verificationStatus: t.verificationStatus === "failed" ? "none" : t.verificationStatus };
  //     return {
  //       task,
  //       notifications: makeNotification(db, { type: "location_verified", title: `Admin override: ${label}`, message: `${label} at ${loc} was marked verified by Admin. Reason: ${r}`, audience: t.employeeId, taskId: id }),
  //       activities: makeActivity(db, { kind: "warning", actor: ADMIN, message: `Admin override — ${label} for ${emp} at ${loc}. Reason: ${r}` }),
  //     };
  //   });
  // },

    /** Admin override for a stranded stage. Persists to the backend first. */
  async override(id: string, stage: "checkin" | "checkout", reason: string) {
    const r = reason.trim();
    // Backend requires at least 10 characters
    if (r.length < 10) throw new Error("Enter a reason / justification (at least 10 characters).");

    const cur = storage.get().tasks.find((x) => x.id === id);
    if (!cur) throw new Error("Visit record not found.");
    if (stage === "checkin" && cur.checkIn) throw new Error("This visit is already checked in.");
    if (stage === "checkout" && !cur.checkIn) throw new Error("Check-in must be completed (or overridden) first.");
    if (stage === "checkout" && cur.checkOut) throw new Error("This visit is already checked out.");

    // 1. Save in the database
    await apiClient(`/tasks/${id}/stages/${stage}/override`, {
      method: "POST",
      body: JSON.stringify({ reason: r }),
    });

    // 2. Update the local cache so the UI changes immediately
    patchTask(id, (t, db) => {
      const now = new Date().toISOString();
      const rec: VisitStage = { at: now, override: { reason: r, at: now, by: ADMIN } };
      const { emp, loc } = names(db, t);
      const label = stage === "checkin" ? "Check-In" : "Check-Out";
      const common = { overriddenByAdmin: true, adminOverrideReason: r, adminOverrideTimestamp: now, startedAt: t.startedAt ?? now };
      const task: Task = stage === "checkin"
        ? { ...t, ...common, status: "checked_in", checkIn: rec }
        : { ...t, ...common, status: "verified", checkOut: rec, verifiedAt: now, verificationStatus: t.verificationStatus === "failed" ? "none" : t.verificationStatus };
      return {
        task,
        notifications: makeNotification(db, { type: "location_verified", title: `Admin override: ${label}`, message: `${label} at ${loc} was marked verified by Admin. Reason: ${r}`, audience: t.employeeId, taskId: id }),
        activities: makeActivity(db, { kind: "warning", actor: ADMIN, message: `Admin override — ${label} for ${emp} at ${loc}. Reason: ${r}` }),
      };
    });
  },
    /** Admin: star a visit so its photos are kept 30 days instead of 7. */
  async setImportant(id: string, important: boolean) {
    await apiClient(`/tasks/${id}/important`, {
      method: "PATCH",
      body: JSON.stringify({ important }),
    });
    patchTask(id, (t) => ({ task: { ...t, important } }));
  },
};

export function taskStats(tasks: Task[]) {
  return {
    total: tasks.length,
    verified: tasks.filter((t) => t.status === "verified").length,
    pending: tasks.filter((t) => ["assigned", "pending", "in_progress", "location_reached", "checked_in"].includes(t.status)).length,
    missed: tasks.filter((t) => MISSED.includes(t.status)).length,
    failed: tasks.filter((t) => t.status === "verification_failed").length,
  };
}
