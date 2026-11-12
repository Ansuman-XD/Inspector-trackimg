import type { Activity, AppNotification, DB, NotificationType } from "@/types";
import { storage, uid } from "./storageService";

const PREF: Partial<Record<NotificationType, keyof DB["settings"]>> = {
  task_assigned: "notifyAssigned",
  visit_completed: "notifyVerified",
  location_verified: "notifyVerified",
  verification_failed: "notifyFailed",
  deadline_passed: "notifyDeadline",
};

export function makeNotification(db: DB, n: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification[] {
  const pref = PREF[n.type];
  if (n.audience === "admin" && pref && db.settings[pref] === false) return db.notifications;

  // Deduplication: Avoid duplicate notifications for the same task and type for the same audience
  if (n.taskId) {
    const alreadyExists = db.notifications.some(
      (existing) =>
        existing.audience === n.audience &&
        existing.type === n.type &&
        existing.taskId === n.taskId
    );
    if (alreadyExists) return db.notifications;
  }

  return [{ ...n, id: uid("NTF"), read: false, createdAt: new Date().toISOString() }, ...db.notifications].slice(0, 300);
}

export function makeActivity(db: DB, a: Omit<Activity, "id" | "createdAt">): Activity[] {
  return [{ ...a, id: uid("ACT"), createdAt: new Date().toISOString() }, ...db.activities].slice(0, 500);
}

export const notificationService = {
  forAudience(db: DB, audience: string) {
    return db.notifications.filter((n) => n.audience === audience).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  markRead(id: string) {
    storage.update((db) => ({ ...db, notifications: db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  },
  markAllRead(audience: string) {
    storage.update((db) => ({ ...db, notifications: db.notifications.map((n) => (n.audience === audience ? { ...n, read: true } : n)) }));
  },
};

export const activityService = {
  recent(db: DB, limit = 12) {
    return [...db.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  },
  log(a: Omit<Activity, "id" | "createdAt">) {
    storage.update((db) => ({ ...db, activities: makeActivity(db, a) }));
  },
};
