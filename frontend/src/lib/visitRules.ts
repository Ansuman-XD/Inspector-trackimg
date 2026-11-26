/** Pure business rules for visits — no storage access, easy to test. */
import type { DB, Task } from "@/types";
import { istMinutes, todayISO } from "./format";

export const CUTOFF_MINUTES = 9 * 60; // 9:00 AM IST
export const DEFAULT_RADIUS = 100;
export const RADIUS_OPTIONS = [25, 50, 100, 150, 200, 500];

export const isSelfPlanned = (t: Pick<Task, "createdBy" | "employeeId">) => t.createdBy === t.employeeId;

/** Effective window: empty times mean the whole day. */
export const effStart = (t: Pick<Task, "startTime">) => t.startTime || "00:00";
export const effEnd = (t: Pick<Task, "endTime">) => t.endTime || "23:59";

/** Another employee already holds this location on this date. */
// export function locationConflict(db: DB, locationId: string, date: string, employeeId: string, ignoreTaskId?: string) {
//   const t = db.tasks.find((x) => x.locationId === locationId && x.date === date && x.employeeId !== employeeId && x.id !== ignoreTaskId);
//   if (!t) return null;
//   const e = db.employees.find((x) => x.id === t.employeeId);
//   return { task: t, employeeName: e?.name ?? t.employeeId, employeeId: t.employeeId };
// }
/** Everyone else scheduled at this location on this date (informational only). */
export function coVisitors(db: DB, locationId: string, date: string, ignoreTaskId?: string) {
  return db.tasks
    .filter((x) => x.locationId === locationId && x.date === date && x.id !== ignoreTaskId)
    .map((x) => ({ task: x, employee: db.employees.find((e) => e.id === x.employeeId) }));
}

/** True when it is today in IST and 9:00 AM has passed. */
export function pastCutoff(date: string, now = new Date()) {
  return date === todayISO(now) && istMinutes(now) >= CUTOFF_MINUTES;
}

/** Was the task created before 9:00 AM IST on its own visit date (or on an earlier day)? */
export function plannedBeforeCutoff(t: Pick<Task, "createdAt" | "date">) {
  const created = new Date(t.createdAt);
  const cDate = todayISO(created);
  return cDate < t.date || (cDate === t.date && istMinutes(created) < CUTOFF_MINUTES);
}

/** Visit that is checked in but not yet checked out, blocking the employee's other visits that day. */
export function blockingVisit(db: DB, t: Task) {
  return db.tasks.find((x) => x.id !== t.id && x.employeeId === t.employeeId && x.date === t.date && !!x.checkIn && !x.checkOut);
}

/** Which stage the employee is working on now. */
export const currentStage = (t: Task): "checkin" | "checkout" | "done" => (t.checkOut ? "done" : t.checkIn ? "checkout" : "checkin");
