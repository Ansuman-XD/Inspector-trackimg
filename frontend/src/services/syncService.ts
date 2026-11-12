import { apiClient, tokenStorage } from "./apiClient";
import { storage } from "./storageService";
import type { DB, Task } from "@/types";
import { taskDateTime } from "@/lib/format";
import { effEnd } from "@/lib/visitRules";
import { MISSED } from "./taskService";

let isSyncing = false;
let syncInterval: any = null;

export const syncService = {
  async syncFromBackend(): Promise<void> {
    if (!tokenStorage.getAccessToken() || isSyncing) return;
    isSyncing = true;

    try {
      const [departments, locationTypes, locations, employees, tasks] = await Promise.all([
        apiClient<any[]>("/departments").catch(() => null),
        apiClient<any[]>("/location-types").catch(() => null),
        apiClient<any[]>("/locations").catch(() => null),
        apiClient<any[]>("/employees").catch(() => null),
        apiClient<any[]>("/tasks").catch(() => null),
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

        if (Array.isArray(tasks)) {
          const activeBackendTasks = tasks.filter((t: any) => t.status !== "cancelled");
          next.tasks = activeBackendTasks.map((t) => {
            const existing = prev.tasks.find((x) => x.id === t.id);

            // Extract stages if returned by backend
            const checkInStage = t.stages?.find((s: any) => s.type === "check_in");
            const checkOutStage = t.stages?.find((s: any) => s.type === "check_out");

            // If locally in_progress or location_reached but server still has assigned, don't revert
            let status = t.status;
            if (
              existing &&
              (existing.status === "in_progress" || existing.status === "location_reached") &&
              t.status === "assigned"
            ) {
              status = existing.status;
            } else if (
              existing &&
              MISSED.includes(existing.status) &&
              (t.status === "assigned" || t.status === "pending")
            ) {
              // Preserve missed/expired state if backend hasn't marked it expired yet
              status = existing.status;
            } else if (t.status === "assigned" || t.status === "pending") {
              // Check if task window has already passed
              const taskDate = t.date || t.scheduledDate;
              if (taskDate) {
                const dummyTask: Pick<Task, "startTime" | "endTime"> = {
                  startTime: t.startTime || "",
                  endTime: t.endTime || "",
                };
                const end = taskDateTime(taskDate, effEnd(dummyTask));
                if (end < new Date()) {
                  status = (existing?.startedAt || t.startedAt) ? "expired" : "not_visited";
                }
              }
            }

            return {
              id: t.id,
              employeeId: t.employeeId,
              locationId: t.locationId,
              date: t.date || t.scheduledDate,
              startTime: t.startTime || "",
              endTime: t.endTime || "",
              priority: t.priority || "medium",
              instructions: t.instructions || t.notes || "",
              status,
              createdAt: t.createdAt || new Date().toISOString(),
              createdBy: t.createdBy,
              attempts: existing?.attempts || t.attempts || [],
              verificationStatus: t.verificationStatus || (checkInStage ? "verified" : existing?.verificationStatus || "none"),
              verifiedAt: t.verifiedAt,
              startedAt: existing?.startedAt || t.startedAt,
              reachedAt: existing?.reachedAt || t.reachedAt,
              checkIn: checkInStage
                ? {
                    at: checkInStage.serverTime || checkInStage.deviceTime,
                    lat: checkInStage.lat,
                    lng: checkInStage.lng,
                    accuracy: checkInStage.accuracyM,
                    distance: checkInStage.distanceM,
                    photo: `/photos/${checkInStage.id}`,
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
                    photo: `/photos/${checkOutStage.id}`,
                    override: checkOutStage.overrideReason
                      ? {
                          reason: checkOutStage.overrideReason,
                          at: checkOutStage.overrideAt,
                          by: checkOutStage.overrideBy,
                        }
                      : undefined,
                  }
                : existing?.checkOut,
              employeeLatitude: existing?.employeeLatitude ?? (checkInStage ? checkInStage.lat : undefined),
              employeeLongitude: existing?.employeeLongitude ?? (checkInStage ? checkInStage.lng : undefined),
              gpsAccuracy: existing?.gpsAccuracy ?? (checkInStage ? checkInStage.accuracyM : undefined),
              distanceFromLocation: existing?.distanceFromLocation ?? (checkInStage ? checkInStage.distanceM : undefined),
            };
          });
        }


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
