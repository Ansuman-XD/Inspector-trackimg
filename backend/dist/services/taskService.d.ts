import { type TaskRecord, type TaskStageRecord } from "../repositories/taskRepository.js";
export interface AssignTaskInput {
    employeeId: string;
    locationId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    priority?: "high" | "medium" | "low";
    instructions?: string;
    allowDuplicate?: boolean;
}
export interface PlanTaskInput {
    locationId: string;
    date: string;
    instructions?: string;
}
export interface StageSubmissionInput {
    type: "check_in" | "check_out";
    lat: number;
    lng: number;
    accuracy: number;
    deviceTime: string;
    idempotencyKey: string;
    photo?: {
        buffer: Buffer;
        mime: string;
    };
}
export declare const taskService: {
    assign(input: AssignTaskInput, adminId: string): Promise<TaskRecord>;
    plan(employeeId: string, input: PlanTaskInput): Promise<TaskRecord>;
    updatePlan(employeeId: string, id: string, input: PlanTaskInput): Promise<TaskRecord>;
    deleteByEmployee(employeeId: string, id: string): Promise<"deleted" | "archived">;
    deleteByAdmin(id: string, adminId: string): Promise<void>;
    submitStage(taskId: string, employeeId: string, input: StageSubmissionInput): Promise<{
        status: "accepted" | "rejected";
        stage?: TaskStageRecord;
        distance?: number;
        reason?: string;
    }>;
    override(taskId: string, stageType: "check_in" | "check_out", reasonInput: string, adminId: string): Promise<TaskStageRecord>;
    setImportant(taskId: string, important: boolean, adminId: string): Promise<TaskRecord>;
};
