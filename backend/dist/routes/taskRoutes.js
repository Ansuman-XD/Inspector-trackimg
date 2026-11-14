import { Hono } from "hono";
import { z } from "zod";
import { taskService } from "../services/taskService.js";
import { taskRepository } from "../repositories/taskRepository.js";
import { ServiceError } from "../lib/errors.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
const assignSchema = z.object({
    employeeId: z.string().min(1, "Select an employee."),
    locationId: z.string().min(1, "Select a location."),
    date: z.string().min(1, "Select a visit date."),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    priority: z.enum(["high", "medium", "low"]).optional(),
    instructions: z.string().optional(),
    allowDuplicate: z.boolean().optional(),
});
const importantSchema = z.object({ important: z.boolean() });
const planSchema = z.object({
    locationId: z.string().min(1, "Select a location."),
    date: z.string().min(1, "Select a visit date."),
    instructions: z.string().optional(),
});
const overrideSchema = z.object({
    reason: z.string().min(10, "Override reason must be at least 10 characters."),
});
export const taskRoutes = new Hono();
taskRoutes.use("/*", requireAuth);
// GET /tasks (Inspectors get their own tasks; admins can get all or filter)
taskRoutes.get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();
    const employeeId = user.role === "admin" ? query.employeeId : user.userId;
    const list = await taskRepository.findAll({
        employeeId,
        locationId: query.locationId,
        scheduledDate: query.date,
        status: query.status,
    });
    // Fetch stages for the retrieved tasks
    const tasksWithStages = await Promise.all(list.map(async (task) => {
        const stages = await taskRepository.findStagesByTaskId(task.id);
        return {
            ...task,
            stages,
        };
    }));
    return c.json(tasksWithStages);
});
// GET /tasks/:id
taskRoutes.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const task = await taskRepository.findById(id);
    if (!task)
        return c.json({ error: "Visit record not found." }, 404);
    if (user.role !== "admin" && task.employeeId !== user.userId) {
        return c.json({ error: "Forbidden: not your assigned visit." }, 403);
    }
    // Load stages and history
    const stages = await taskRepository.findStagesByTaskId(id);
    const history = await taskRepository.findHistoryByTaskId(id);
    return c.json({
        ...task,
        stages,
        history,
    });
});
// POST /tasks (Admin assigns visit)
taskRoutes.post("/", requireAdmin, async (c) => {
    const admin = c.get("user");
    const body = await c.req.json().catch(() => null);
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const task = await taskService.assign(parsed.data, admin.userId);
        return c.json(task, 201);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /tasks/plan (Employee self-plans visit)
taskRoutes.post("/plan", async (c) => {
    const user = c.get("user");
    const body = await c.req.json().catch(() => null);
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const task = await taskService.plan(user.userId, parsed.data);
        return c.json(task, 201);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /tasks/:id (Employee updates planned visit)
taskRoutes.patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const updated = await taskService.updatePlan(user.userId, id, parsed.data);
        return c.json(updated);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /tasks/:id/start (Employee starts visit)
taskRoutes.post("/:id/start", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const task = await taskRepository.findById(id);
    if (!task)
        return c.json({ error: "Visit record not found." }, 404);
    if (task.employeeId !== user.userId && user.role !== "admin") {
        return c.json({ error: "Unauthorized: not your assigned visit." }, 403);
    }
    const updated = await taskRepository.update(id, {
        status: "in_progress",
        startedAt: new Date(),
    });
    return c.json(updated);
});
// POST /tasks/:id/record-gps (Employee records GPS verification)
taskRoutes.post("/:id/record-gps", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const { passed } = body;
    const task = await taskRepository.findById(id);
    if (!task)
        return c.json({ error: "Visit record not found." }, 404);
    if (task.employeeId !== user.userId && user.role !== "admin") {
        return c.json({ error: "Unauthorized: not your assigned visit." }, 403);
    }
    const updated = await taskRepository.update(id, {
        status: passed ? "location_reached" : "verification_failed",
        ...(passed && !task.reachedAt ? { reachedAt: new Date() } : {}),
    });
    return c.json(updated);
});
// DELETE /tasks/:id (Employee or Admin deletes visit)
taskRoutes.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    try {
        if (user.role === "admin") {
            await taskService.deleteByAdmin(id, user.userId);
            return c.json({ success: true, message: "Visit deleted by Admin." });
        }
        else {
            const result = await taskService.deleteByEmployee(user.userId, id);
            return c.json({
                success: true,
                action: result,
                message: result === "archived" ? "Visit cancelled and archived to history." : "Visit deleted.",
            });
        }
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /tasks/:id/stages (Multipart check-in / check-out stage submission)
taskRoutes.post("/:id/stages", async (c) => {
    const user = c.get("user");
    const taskId = c.req.param("id");
    try {
        const formData = await c.req.formData();
        const type = formData.get("type");
        const lat = Number(formData.get("lat"));
        const lng = Number(formData.get("lng"));
        const accuracy = Number(formData.get("accuracy") || 0);
        const deviceTime = String(formData.get("deviceTime") || new Date().toISOString());
        const idempotencyKey = String(formData.get("idempotencyKey") || "");
        if (!type || !["check_in", "check_out"].includes(type)) {
            return c.json({ error: "Stage type must be check_in or check_out" }, 400);
        }
        if (!idempotencyKey) {
            return c.json({ error: "Missing idempotencyKey" }, 400);
        }
        if (isNaN(lat) || isNaN(lng)) {
            return c.json({ error: "Invalid coordinates" }, 400);
        }
        let photoData;
        const photoFile = formData.get("photo");
        if (photoFile && typeof photoFile.arrayBuffer === "function") {
            const arr = await photoFile.arrayBuffer();
            photoData = {
                buffer: Buffer.from(arr),
                mime: photoFile.type || "image/jpeg",
            };
        }
        const result = await taskService.submitStage(taskId, user.userId, {
            type,
            lat,
            lng,
            accuracy,
            deviceTime,
            idempotencyKey,
            photo: photoData,
        });
        console.log(`✅ [STAGE SUCCESS] Task ${taskId} stage ${type} accepted for employee ${user.userId}`);
        return c.json(result);
    }
    catch (err) {
        console.error(`❌ [STAGE REJECTED/FAILED] Task ${taskId}:`, err?.message || err);
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        console.error("Stage submission error:", err);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /tasks/:id/stages/:type/override (Admin override for check-in or check-out)
taskRoutes.post("/:id/stages/:type/override", requireAdmin, async (c) => {
    const admin = c.get("user");
    const taskId = c.req.param("id");
    const typeParam = c.req.param("type");
    const stageType = typeParam === "checkin" ? "check_in" : typeParam === "checkout" ? "check_out" : typeParam;
    if (!["check_in", "check_out"].includes(stageType)) {
        return c.json({ error: "Invalid stage type" }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = overrideSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const stage = await taskService.override(taskId, stageType, parsed.data.reason, admin.userId);
        return c.json({ success: true, stage });
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /tasks/:id/important (Admin only)
taskRoutes.patch("/:id/important", requireAdmin, async (c) => {
    const admin = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = importantSchema.safeParse(body);
    if (!parsed.success)
        return c.json({ error: "Invalid input" }, 400);
    try {
        const task = await taskService.setImportant(id, parsed.data.important, admin.userId);
        return c.json(task);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
