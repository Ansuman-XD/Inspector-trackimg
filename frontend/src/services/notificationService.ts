// import type { Activity, AppNotification, DB, NotificationType } from "@/types";
// import { storage, uid } from "./storageService";

// export const NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// /** Keep only notifications younger than 7 days. */
// export function pruneNotifications<T extends { createdAt: string }>(list: T[]): T[] {
//   const cutoff = Date.now() - NOTIFICATION_TTL_MS;
//   return list.filter((n) => new Date(n.createdAt).getTime() >= cutoff);
// }
// const PREF: Partial<Record<NotificationType, keyof DB["settings"]>> = {
//   task_assigned: "notifyAssigned",
//   visit_completed: "notifyVerified",
//   location_verified: "notifyVerified",
//   verification_failed: "notifyFailed",
//   deadline_passed: "notifyDeadline",
// };

// export function makeNotification(db: DB, n: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification[] {
//   const pref = PREF[n.type];
//   if (n.audience === "admin" && pref && db.settings[pref] === false) return db.notifications;

//   // Deduplication: Avoid duplicate notifications for the same task and type for the same audience
//   if (n.taskId) {
//     const alreadyExists = db.notifications.some(
//       (existing) =>
//         existing.audience === n.audience &&
//         existing.type === n.type &&
//         existing.taskId === n.taskId
//     );
//     if (alreadyExists) return db.notifications;
//   }

// return pruneNotifications([{ ...n, id: uid("NTF"), read: false, createdAt: new Date().toISOString() }, ...db.notifications]).slice(0, 300);
// }

// export function makeActivity(db: DB, a: Omit<Activity, "id" | "createdAt">): Activity[] {
//   return [{ ...a, id: uid("ACT"), createdAt: new Date().toISOString() }, ...db.activities].slice(0, 500);
// }

// export const notificationService = {
//   forAudience(db: DB, audience: string) {
//     return db.notifications.filter((n) => n.audience === audience).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
//   },
//   markRead(id: string) {
//     storage.update((db) => ({ ...db, notifications: db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
//   },
//   markAllRead(audience: string) {
//     storage.update((db) => ({ ...db, notifications: db.notifications.map((n) => (n.audience === audience ? { ...n, read: true } : n)) }));
//   },
//     purgeOld() {
//     const db = storage.get();
//     const kept = pruneNotifications(db.notifications);
//     if (kept.length !== db.notifications.length) {
//       storage.update((d) => ({ ...d, notifications: kept }));
//     }
//   },
// };

// export const activityService = {
//   recent(db: DB, limit = 12) {
//     return [...db.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
//   },
//   log(a: Omit<Activity, "id" | "createdAt">) {
//     storage.update((db) => ({ ...db, activities: makeActivity(db, a) }));
//   },
// };


import type { Activity, AppNotification, DB, NotificationType } from "@/types";
import { storage, uid } from "./storageService";
import { apiClient } from "./apiClient";

export const NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Keep only notifications younger than 7 days. */
export function pruneNotifications<T extends { createdAt: string }>(list: T[]): T[] {
  const cutoff = Date.now() - NOTIFICATION_TTL_MS;
  return list.filter((n) => new Date(n.createdAt).getTime() >= cutoff);
}

/** Fire-and-forget save to the database. Safe to call repeatedly (server ignores duplicates). */
export function pushNotificationsToServer(items: AppNotification[]) {
  if (typeof window === "undefined" || !items.length) return;
  apiClient("/notifications", {
    method: "POST",
    body: JSON.stringify({ items }),
  }).catch(() => {});
}

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

  // Fixed id per (audience + type + visit): the same event can never be stored twice,
  // even if two devices create it.
  const id = n.taskId ? `NTF-${n.audience}-${n.type}-${n.taskId}` : uid("NTF");
  if (db.notifications.some((e) => e.id === id)) return db.notifications;

  const item: AppNotification = { ...n, id, read: false, createdAt: new Date().toISOString() };
  pushNotificationsToServer([item]);

  return pruneNotifications([item, ...db.notifications]).slice(0, 300);
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
    apiClient(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }).catch(() => {});
  },
  markAllRead(audience: string) {
    storage.update((db) => ({ ...db, notifications: db.notifications.map((n) => (n.audience === audience ? { ...n, read: true } : n)) }));
    apiClient("/notifications/read-all", { method: "POST" }).catch(() => {});
  },
  purgeOld() {
    const db = storage.get();
    const kept = pruneNotifications(db.notifications);
    if (kept.length !== db.notifications.length) {
      storage.update((d) => ({ ...d, notifications: kept }));
    }
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