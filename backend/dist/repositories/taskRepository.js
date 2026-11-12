import { eq, and, ne, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { tasks, taskStages, stagePhotos, taskHistory, rejectedSubmissions, employees, locations, } from "../db/schema.js";
export const taskRepository = {
    async findById(id) {
        const res = await db.select().from(tasks).where(eq(tasks.id, id));
        return res[0] || null;
    },
    async findAll(filters) {
        let query = db.select().from(tasks);
        const conditions = [];
        if (filters?.employeeId)
            conditions.push(eq(tasks.employeeId, filters.employeeId));
        if (filters?.locationId)
            conditions.push(eq(tasks.locationId, filters.locationId));
        if (filters?.scheduledDate)
            conditions.push(eq(tasks.scheduledDate, filters.scheduledDate));
        if (filters?.status) {
            conditions.push(eq(tasks.status, filters.status));
        }
        else {
            conditions.push(ne(tasks.status, "cancelled"));
        }
        return db
            .select()
            .from(tasks)
            .where(and(...conditions))
            .orderBy(desc(tasks.scheduledDate), tasks.startTime);
    },
    async findConflictingTask(locationId, scheduledDate, excludeTaskId) {
        const conditions = [
            eq(tasks.locationId, locationId),
            eq(tasks.scheduledDate, scheduledDate),
            ne(tasks.status, "cancelled"),
        ];
        if (excludeTaskId) {
            conditions.push(ne(tasks.id, excludeTaskId));
        }
        const res = await db
            .select({
            task: tasks,
            employeeName: employees.name,
        })
            .from(tasks)
            .innerJoin(employees, eq(tasks.employeeId, employees.id))
            .where(and(...conditions));
        if (!res[0])
            return null;
        return { ...res[0].task, employeeName: res[0].employeeName };
    },
    async findDuplicateTask(employeeId, locationId, scheduledDate, excludeTaskId) {
        const conditions = [
            eq(tasks.employeeId, employeeId),
            eq(tasks.locationId, locationId),
            eq(tasks.scheduledDate, scheduledDate),
            ne(tasks.status, "cancelled"),
            ne(tasks.status, "expired"),
        ];
        if (excludeTaskId) {
            conditions.push(ne(tasks.id, excludeTaskId));
        }
        const res = await db.select().from(tasks).where(and(...conditions));
        return res[0] || null;
    },
    async findBlockingVisit(employeeId, scheduledDate, currentTaskId) {
        // A visit that has check-in but no check-out on the same date for the employee
        const res = await db
            .select({
            task: tasks,
            locationName: locations.name,
        })
            .from(tasks)
            .innerJoin(locations, eq(tasks.locationId, locations.id))
            .innerJoin(taskStages, and(eq(taskStages.taskId, tasks.id), eq(taskStages.type, "check_in")))
            .where(and(eq(tasks.employeeId, employeeId), eq(tasks.scheduledDate, scheduledDate), ne(tasks.id, currentTaskId), ne(tasks.status, "verified"), ne(tasks.status, "cancelled")));
        // Verify that this task does not already have a check_out stage
        for (const row of res) {
            const outStage = await db
                .select()
                .from(taskStages)
                .where(and(eq(taskStages.taskId, row.task.id), eq(taskStages.type, "check_out")));
            if (outStage.length === 0) {
                return { ...row.task, locationName: row.locationName };
            }
        }
        return null;
    },
    async create(record) {
        const res = await db.insert(tasks).values(record).returning();
        return res[0];
    },
    async update(id, patch) {
        const res = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning();
        return res[0] || null;
    },
    async delete(id) {
        const res = await db.delete(tasks).where(eq(tasks.id, id)).returning();
        return res.length > 0;
    },
    // Stages
    async findStagesByTaskId(taskId) {
        return db.select().from(taskStages).where(eq(taskStages.taskId, taskId));
    },
    async findStage(taskId, type) {
        const res = await db
            .select()
            .from(taskStages)
            .where(and(eq(taskStages.taskId, taskId), eq(taskStages.type, type)));
        return res[0] || null;
    },
    async findStageByIdempotencyKey(key) {
        const res = await db.select().from(taskStages).where(eq(taskStages.idempotencyKey, key));
        return res[0] || null;
    },
    async createStage(record) {
        const res = await db.insert(taskStages).values(record).returning();
        return res[0];
    },
    async createStagePhoto(record) {
        await db.insert(stagePhotos).values(record);
    },
    // Audit and History
    async createHistory(record) {
        await db.insert(taskHistory).values(record);
    },
    async findHistoryByTaskId(taskId) {
        return db
            .select()
            .from(taskHistory)
            .where(eq(taskHistory.taskId, taskId))
            .orderBy(desc(taskHistory.at));
    },
    // Rejected submissions
    async createRejectedSubmission(record) {
        await db.insert(rejectedSubmissions).values(record);
    },
    async findRejectedSubmissions() {
        return db.select().from(rejectedSubmissions).orderBy(desc(rejectedSubmissions.receivedAt));
    },
    async findRejectedSubmissionById(id) {
        const res = await db.select().from(rejectedSubmissions).where(eq(rejectedSubmissions.id, id));
        return res[0] || null;
    },
    async updateRejectedSubmission(id, patch) {
        await db.update(rejectedSubmissions).set(patch).where(eq(rejectedSubmissions.id, id));
    },
};
