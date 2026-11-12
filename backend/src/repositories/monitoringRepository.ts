import { desc, eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { tasks, employees, locations, taskStages, departments } from "../db/schema.js";

export interface VisitMonitoringRow {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  locationId: string;
  locationName: string;
  locationType: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  priority: "high" | "medium" | "low";
  source: "admin" | "self";
  status: string;
  notes: string;
  startedAt: Date | null;
  reachedAt: Date | null;
  verifiedAt: Date | null;
  checkIn: {
    at: Date | null;
    distanceM: number | null;
    accuracyM: number | null;
    verification: string | null;
    photoSha256: string | null;
    overrideReason: string | null;
  } | null;
  checkOut: {
    at: Date | null;
    distanceM: number | null;
    accuracyM: number | null;
    verification: string | null;
    photoSha256: string | null;
    overrideReason: string | null;
  } | null;
}

export const monitoringRepository = {
  async getMonitoringData(filters?: {
    date?: string;
    employeeId?: string;
    locationId?: string;
    status?: string;
    from?: string;
    to?: string;
    department?: string;
  }): Promise<VisitMonitoringRow[]> {
    const conditions = [];

    if (filters?.date) conditions.push(eq(tasks.scheduledDate, filters.date));
    if (filters?.from) conditions.push(gte(tasks.scheduledDate, filters.from));
    if (filters?.to) conditions.push(lte(tasks.scheduledDate, filters.to));
    if (filters?.employeeId && filters.employeeId !== "__all") conditions.push(eq(tasks.employeeId, filters.employeeId));
    if (filters?.locationId && filters.locationId !== "__all") conditions.push(eq(tasks.locationId, filters.locationId));
    if (filters?.status && filters.status !== "__all") conditions.push(eq(tasks.status, filters.status as any));

    const taskQuery = db
      .select({
        task: tasks,
        employeeName: employees.name,
        department: employees.department,
        locationName: locations.name,
        locationType: locations.type,
      })
      .from(tasks)
      .innerJoin(employees, eq(tasks.employeeId, employees.id))
      .innerJoin(locations, eq(tasks.locationId, locations.id));

    const rows = conditions.length > 0 ? await taskQuery.where(and(...conditions)).orderBy(desc(tasks.scheduledDate), tasks.startTime) : await taskQuery.orderBy(desc(tasks.scheduledDate), tasks.startTime);

    // Fetch all stages for these tasks
    const results: VisitMonitoringRow[] = [];
    for (const r of rows) {
      if (filters?.department && filters.department !== "__all" && r.department !== filters.department) {
        continue;
      }

      const stages = await db.select().from(taskStages).where(eq(taskStages.taskId, r.task.id));
      const inStage = stages.find((s) => s.type === "check_in");
      const outStage = stages.find((s) => s.type === "check_out");

      results.push({
        id: r.task.id,
        employeeId: r.task.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        locationId: r.task.locationId,
        locationName: r.locationName,
        locationType: r.locationType,
        scheduledDate: r.task.scheduledDate,
        startTime: r.task.startTime,
        endTime: r.task.endTime,
        priority: r.task.priority,
        source: r.task.source,
        status: r.task.status,
        notes: r.task.notes,
        startedAt: r.task.startedAt,
        reachedAt: r.task.reachedAt,
        verifiedAt: r.task.verifiedAt,
        checkIn: inStage
          ? {
              at: inStage.serverTime,
              distanceM: inStage.distanceM,
              accuracyM: inStage.accuracyM,
              verification: inStage.verification,
              photoSha256: inStage.photoSha256,
              overrideReason: inStage.overrideReason,
            }
          : null,
        checkOut: outStage
          ? {
              at: outStage.serverTime,
              distanceM: outStage.distanceM,
              accuracyM: outStage.accuracyM,
              verification: outStage.verification,
              photoSha256: outStage.photoSha256,
              overrideReason: outStage.overrideReason,
            }
          : null,
      });
    }

    return results;
  },
};
