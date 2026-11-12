import { tasks, taskStages, stagePhotos, taskHistory, rejectedSubmissions } from "../db/schema.js";
export type TaskRecord = typeof tasks.$inferSelect;
export type NewTaskRecord = typeof tasks.$inferInsert;
export type TaskStageRecord = typeof taskStages.$inferSelect;
export type NewTaskStageRecord = typeof taskStages.$inferInsert;
export declare const taskRepository: {
    findById(id: string): Promise<TaskRecord | null>;
    findAll(filters?: {
        employeeId?: string;
        locationId?: string;
        scheduledDate?: string;
        status?: string;
    }): Promise<TaskRecord[]>;
    findConflictingTask(locationId: string, scheduledDate: string, excludeTaskId?: string): Promise<(TaskRecord & {
        employeeName: string;
    }) | null>;
    findDuplicateTask(employeeId: string, locationId: string, scheduledDate: string, excludeTaskId?: string): Promise<TaskRecord | null>;
    findBlockingVisit(employeeId: string, scheduledDate: string, currentTaskId: string): Promise<(TaskRecord & {
        locationName: string;
    }) | null>;
    create(record: NewTaskRecord): Promise<TaskRecord>;
    update(id: string, patch: Partial<NewTaskRecord>): Promise<TaskRecord | null>;
    delete(id: string): Promise<boolean>;
    findStagesByTaskId(taskId: string): Promise<TaskStageRecord[]>;
    findStage(taskId: string, type: "check_in" | "check_out"): Promise<TaskStageRecord | null>;
    findStageByIdempotencyKey(key: string): Promise<TaskStageRecord | null>;
    createStage(record: NewTaskStageRecord): Promise<TaskStageRecord>;
    createStagePhoto(record: typeof stagePhotos.$inferInsert): Promise<void>;
    createHistory(record: typeof taskHistory.$inferInsert): Promise<void>;
    findHistoryByTaskId(taskId: string): Promise<(typeof taskHistory.$inferSelect)[]>;
    createRejectedSubmission(record: typeof rejectedSubmissions.$inferInsert): Promise<void>;
    findRejectedSubmissions(): Promise<(typeof rejectedSubmissions.$inferSelect)[]>;
    findRejectedSubmissionById(id: string): Promise<typeof rejectedSubmissions.$inferSelect | null>;
    updateRejectedSubmission(id: string, patch: Partial<typeof rejectedSubmissions.$inferInsert>): Promise<void>;
};
