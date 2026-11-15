import { apiClient, tokenStorage } from "./apiClient";
import { storage } from "./storageService";
import type { DB, Task, TaskStatus } from "@/types";
import { taskDateTime } from "@/lib/format";
import { effEnd } from "@/lib/visitRules";
import { MISSED } from "./taskService";
import { authService } from "./authService";
import {
  makeNotification,
  pruneNotifications,
  pushNotificationsToServer,
} from "./notificationService";
import { fmtDate, fmtWindow } from "@/lib/format";
import type { AppNotification } from "@/types";

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || "http://localhost:3001").replace(
  /\/$/,
  "",
);

function stagePhotoUrl(
  stage: { id: string; photoSha256?: string | null },
  existingPhoto?: string,
): string | undefined {
  if (stage.photoSha256) return `${API_BASE_URL}/photos/${stage.id}`;
  if (existingPhoto?.startsWith("data:") || existingPhoto?.startsWith("blob:"))
    return existingPhoto;
  return existingPhoto;
}

let isSyncing = false;
let syncInterval: any = null;

/** Creates a "New visit assigned" notification on the employee's own device. */
function employeeAssignmentAlerts(next: DB) {
  const s = authService.current();
  if (!s || s.role !== "employee") return next.notifications;

  const key = `rt.knownTasks.${s.userId}`;
  let known: string[] | null = null;
  try {
    known = JSON.parse(localStorage.getItem(key) || "null");
  } catch {}

  const mine = next.tasks.filter((t) => t.employeeId === s.userId);
  let notifications = next.notifications;

  if (known) {
    // first run only records tasks, so no flood of old alerts
    const knownSet = new Set(known);
    for (const t of mine) {
      if (knownSet.has(t.id) || t.createdBy === s.userId) continue;
      const loc = next.locations.find((l) => l.id === t.locationId)?.name ?? "a location";
      notifications = makeNotification(
        { ...next, notifications },
        {
          type: "task_assigned",
          title: "New visit assigned",
          message: `${loc} on ${fmtDate(t.date)}, ${fmtWindow(t)}`,
          audience: s.userId,
          taskId: t.id,
        },
      );
    }
  }
  try {
    localStorage.setItem(key, JSON.stringify(mine.map((t) => t.id)));
  } catch {}
  return notifications;
}

function myAudience(): string | null {
  const s = authService.current();
  if (!s) return null;
  return s.role === "admin" ? "admin" : s.userId;
}

/** Combine database notifications with the ones on this device. */
function mergeNotifications(local: AppNotification[], server: any[]): AppNotification[] {
  const s = authService.current();
  const serverIds = new Set(server.map((n) => n.id));

  const fromServer: AppNotification[] = server.map((n) => {
    const l = local.find((x) => x.id === n.id);
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      audience: n.audience,
      taskId: n.taskId || undefined,
      read: !!n.read || !!l?.read,
      createdAt: n.createdAt,
    };
  });

  // Local ones the database doesn't have yet (older ones, or an upload that failed)
  const localOnly = pruneNotifications(local.filter((l) => !serverIds.has(l.id)));

  // Upload them (employees may only upload for "admin" or themselves)
  if (s) {
    const uploadable = localOnly.filter(
      (l) => s.role === "admin" || l.audience === "admin" || l.audience === s.userId,
    );
    pushNotificationsToServer(uploadable.slice(0, 100));
  }

  return [...fromServer, ...localOnly]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 300);
}

export const syncService = {
  async syncFromBackend(): Promise<void> {
    if (!tokenStorage.getAccessToken() || isSyncing) return;
    isSyncing = true;

    try {
      const [departments, locationTypes, locations, employees, tasks, serverNotifs] =
        await Promise.all([
          apiClient<any[]>("/departments").catch(() => null),
          apiClient<any[]>("/location-types").catch(() => null),
          apiClient<any[]>("/locations").catch(() => null),
          apiClient<any[]>("/employees").catch(() => null),
          apiClient<any[]>("/tasks").catch(() => null),
          apiClient<any[]>("/notifications").catch(() => null),
        ]);

      storage.update((prev) => {
        const next: DB = { ...prev };

        if (Array.isArray(departments)) {
          next.departments = departments.map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description || undefined,
            createdAt: d.createdAt || new Date().toISOString(),
          }));
        }

        if (Array.isArray(locationTypes)) {
          next.locationTypes = locationTypes.map((lt) => ({
            id: lt.id,
            name: lt.name,
            code: lt.code,
            description: lt.description || undefined,
            createdAt: lt.createdAt || new Date().toISOString(),
          }));
        }

        if (Array.isArray(locations)) {
          next.locations = locations.map((l) => ({
            id: l.id,
            name: l.name,
            description: l.description || "",
            address: l.address,
            lat: Number(l.lat),
            lng: Number(l.lng),
            locationTypeId: l.locationTypeId,
            type: l.type,
            status: l.status || "active",
            verificationRadius: l.verificationRadius ?? 100,
            createdAt: l.createdAt || new Date().toISOString(),
          }));
        }

        if (Array.isArray(employees)) {
          next.employees = employees.map((e) => ({
            id: e.id,
            name: e.name,
            phone: e.phone,
            email: e.email,
            department: e.department || "",
            designation: e.designation || "",
            joiningDate: e.joiningDate || "",
            status: e.status || (e.active ? "active" : "inactive"),
            photo: e.photo || undefined,
            createdAt: e.createdAt || new Date().toISOString(),
          }));
        }

        //         if (Array.isArray(tasks)) {
        //           const activeBackendTasks = tasks.filter((t: any) => t.status !== "cancelled");
        //           next.tasks = activeBackendTasks.map((t) => {
        //             const existing = prev.tasks.find((x) => x.id === t.id);

        //             // Extract stages if returned by backend
        //             const checkInStage = t.stages?.find((s: any) => s.type === "check_in");
        //             const checkOutStage = t.stages?.find((s: any) => s.type === "check_out");

        //             // If locally in_progress or location_reached but server still has assigned, don't revert
        //             let status = t.status;
        //             if (
        //               existing &&
        //               (existing.status === "in_progress" || existing.status === "location_reached") &&
        //               t.status === "assigned"
        //             ) {
        //               status = existing.status;
        //             } else if (
        //               existing &&
        //               MISSED.includes(existing.status) &&
        //               (t.status === "assigned" || t.status === "pending")
        //             ) {
        //               // Preserve missed/expired state if backend hasn't marked it expired yet
        //               status = existing.status;
        //             } else if (t.status === "assigned" || t.status === "pending") {
        //               // Check if task window has already passed
        //               const taskDate = t.date || t.scheduledDate;
        //               if (taskDate) {
        //                 const dummyTask: Pick<Task, "startTime" | "endTime"> = {
        //                   startTime: t.startTime || "",
        //                   endTime: t.endTime || "",
        //                 };
        //                 const end = taskDateTime(taskDate, effEnd(dummyTask));
        //                 if (end < new Date()) {
        //                   status = (existing?.startedAt || t.startedAt) ? "expired" : "not_visited";
        //                 }
        //               }
        //             }

        //             return {
        //               id: t.id,
        //               employeeId: t.employeeId,
        //               locationId: t.locationId,
        //               date: t.date || t.scheduledDate,
        //               startTime: t.startTime || "",
        //               endTime: t.endTime || "",
        //               priority: t.priority || "medium",
        //               important: !!t.isImportant,
        //               instructions: t.instructions || t.notes || "",
        //               status,
        //               createdAt: t.createdAt || new Date().toISOString(),
        //               createdBy: t.createdBy,
        //               attempts: existing?.attempts || t.attempts || [],
        //               verificationStatus: t.verificationStatus || (checkInStage ? "verified" : existing?.verificationStatus || "none"),
        //               verifiedAt: t.verifiedAt,
        //               startedAt: existing?.startedAt || t.startedAt,
        //               reachedAt: existing?.reachedAt || t.reachedAt,
        //               checkIn: checkInStage
        //                 ? {
        //                     at: checkInStage.serverTime || checkInStage.deviceTime,
        //                     lat: checkInStage.lat,
        //                     lng: checkInStage.lng,
        //                     accuracy: checkInStage.accuracyM,
        //                     distance: checkInStage.distanceM,
        //                     // photo: checkInStage.photoSha256 ? `/photos/${checkInStage.id}` : undefined,
        //                     photo: stagePhotoUrl(checkInStage, existing?.checkIn?.photo),
        //                     override: checkInStage.overrideReason
        //                       ? {
        //                           reason: checkInStage.overrideReason,
        //                           at: checkInStage.overrideAt,
        //                           by: checkInStage.overrideBy,
        //                         }
        //                       : undefined,
        //                   }
        //                 : existing?.checkIn,
        //               checkOut: checkOutStage
        //                 ? {
        //                     at: checkOutStage.serverTime || checkOutStage.deviceTime,
        //                     lat: checkOutStage.lat,
        //                     lng: checkOutStage.lng,
        //                     accuracy: checkOutStage.accuracyM,
        //                     distance: checkOutStage.distanceM,
        //                     photo: stagePhotoUrl(checkOutStage, existing?.checkOut?.photo),
        //                     override: checkOutStage.overrideReason
        //                       ? {
        //                           reason: checkOutStage.overrideReason,
        //                           at: checkOutStage.overrideAt,
        //                           by: checkOutStage.overrideBy,
        //                         }
        //                       : undefined,
        //                   }
        //                 : existing?.checkOut,
        //               employeeLatitude: existing?.employeeLatitude ?? (checkInStage ? checkInStage.lat : undefined),
        //               employeeLongitude: existing?.employeeLongitude ?? (checkInStage ? checkInStage.lng : undefined),
        //               gpsAccuracy: existing?.gpsAccuracy ?? (checkInStage ? checkInStage.accuracyM : undefined),
        //               distanceFromLocation: existing?.distanceFromLocation ?? (checkInStage ? checkInStage.distanceM : undefined),
        //               photo:
        //   (checkOutStage && stagePhotoUrl(checkOutStage, existing?.checkOut?.photo)) ||
        //   (checkInStage && stagePhotoUrl(checkInStage, existing?.checkIn?.photo)) ||
        //   existing?.photo,
        // photoTimestamp:
        //   checkOutStage?.serverTime ||
        //   checkOutStage?.deviceTime ||
        //   checkInStage?.serverTime ||
        //   checkInStage?.deviceTime ||
        //   existing?.photoTimestamp,
        //             };
        //           });
        //         }

        if (Array.isArray(tasks)) {
          const activeBackendTasks = tasks.filter((t: any) => t.status !== "cancelled");
          next.tasks = activeBackendTasks.map((t) => {
            const existing = prev.tasks.find((x) => x.id === t.id);

            const checkInStage = t.stages?.find((s: any) => s.type === "check_in");
            const checkOutStage = t.stages?.find((s: any) => s.type === "check_out");

            const taskDate = t.date || t.scheduledDate;
            const startTime = t.startTime || "";
            const endTime = t.endTime || "";
            const startedAt = existing?.startedAt || t.startedAt;
            const hasCheckIn = !!(checkInStage || existing?.checkIn);

            // Terminal statuses from backend must stay terminal
            const TERMINAL = ["verified", "not_visited", "expired", "cancelled"];
            let status: TaskStatus = t.status as TaskStatus;

            if (!TERMINAL.includes(t.status) && taskDate) {
              const dummyTask = { startTime, endTime };
              const end = taskDateTime(taskDate, effEnd(dummyTask));
              if (end < new Date()) {
                // Window is over → permanent miss status
                // Started / checked-in / any in-progress path → expired
                // Never started → not_visited
                status = (
                  startedAt ||
                  hasCheckIn ||
                  ["in_progress", "location_reached", "checked_in", "verification_failed"].includes(
                    t.status,
                  )
                    ? "expired"
                    : "not_visited"
                ) as TaskStatus;
              } else {
                // Still inside window: do not let backend wipe a more advanced local status
                if (
                  existing &&
                  (existing.status === "in_progress" || existing.status === "location_reached") &&
                  t.status === "assigned"
                ) {
                  status = existing.status;
                }
              }
            } else if (
              existing &&
              MISSED.includes(existing.status as any) &&
              (t.status === "assigned" || t.status === "pending")
            ) {
              // Backend still thinks assigned/pending; keep local missed
              status = existing.status;
            }

            return {
              id: t.id,
              employeeId: t.employeeId,
              locationId: t.locationId,
              date: taskDate,
              startTime,
              endTime,
              priority: t.priority || "medium",
              important: !!t.isImportant,
              instructions: t.instructions || t.notes || "",
              status,
              createdAt: t.createdAt || new Date().toISOString(),
              createdBy: t.createdBy,
              attempts: existing?.attempts || t.attempts || [],
              verificationStatus:
                t.verificationStatus ||
                (checkInStage ? "verified" : existing?.verificationStatus || "none"),
              verifiedAt: t.verifiedAt,
              startedAt,
              reachedAt: existing?.reachedAt || t.reachedAt,
              checkIn: checkInStage
                ? {
                    at: checkInStage.serverTime || checkInStage.deviceTime,
                    lat: checkInStage.lat,
                    lng: checkInStage.lng,
                    accuracy: checkInStage.accuracyM,
                    distance: checkInStage.distanceM,
                    photo: stagePhotoUrl(checkInStage, existing?.checkIn?.photo),
                    override: checkInStage.overrideReason
                      ? {
                          reason: checkInStage.overrideReason,
                          at: checkInStage.overrideAt,
                          by: checkInStage.overrideBy,
                        }
                      : undefined,
                  }
                : existing?.checkIn,
              checkOut: checkOutStage
                ? {
                    at: checkOutStage.serverTime || checkOutStage.deviceTime,
                    lat: checkOutStage.lat,
                    lng: checkOutStage.lng,
                    accuracy: checkOutStage.accuracyM,
                    distance: checkOutStage.distanceM,
                    photo: stagePhotoUrl(checkOutStage, existing?.checkOut?.photo),
                    override: checkOutStage.overrideReason
                      ? {
                          reason: checkOutStage.overrideReason,
                          at: checkOutStage.overrideAt,
                          by: checkOutStage.overrideBy,
                        }
                      : undefined,
                  }
                : existing?.checkOut,
              employeeLatitude:
                existing?.employeeLatitude ?? (checkInStage ? checkInStage.lat : undefined),
              employeeLongitude:
                existing?.employeeLongitude ?? (checkInStage ? checkInStage.lng : undefined),
              gpsAccuracy:
                existing?.gpsAccuracy ?? (checkInStage ? checkInStage.accuracyM : undefined),
              distanceFromLocation:
                existing?.distanceFromLocation ??
                (checkInStage ? checkInStage.distanceM : undefined),
              photo:
                (checkOutStage && stagePhotoUrl(checkOutStage, existing?.checkOut?.photo)) ||
                (checkInStage && stagePhotoUrl(checkInStage, existing?.checkIn?.photo)) ||
                existing?.photo,
              photoTimestamp:
                checkOutStage?.serverTime ||
                checkOutStage?.deviceTime ||
                checkInStage?.serverTime ||
                checkInStage?.deviceTime ||
                existing?.photoTimestamp,
            };
          });
        }
        if (Array.isArray(serverNotifs)) {
  next.notifications = mergeNotifications(prev.notifications, serverNotifs);
}
next.notifications = employeeAssignmentAlerts(next);
return next;
      });
    } catch (err) {
      console.warn("Background sync failed:", err);
    } finally {
      isSyncing = false;
    }
  },

  startAutoSync(intervalMs = 8000) {
    if (syncInterval) clearInterval(syncInterval);
    syncService.syncFromBackend();
    syncInterval = setInterval(() => {
      syncService.syncFromBackend();
    }, intervalMs);
  },

  stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  },
};
