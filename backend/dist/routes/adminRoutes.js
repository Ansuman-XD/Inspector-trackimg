import { Hono } from "hono";
import { z } from "zod";
import { monitoringRepository } from "../repositories/monitoringRepository.js";
import { taskRepository } from "../repositories/taskRepository.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
const resolveSchema = z.object({
    resolutionReason: z.string().min(5, "Resolution reason must be at least 5 characters."),
});
export const adminRoutes = new Hono();
adminRoutes.use("/*", requireAuth, requireAdmin);
// GET /admin/monitoring (Live polling endpoint)
adminRoutes.get("/monitoring", async (c) => {
    const query = c.req.query();
    const data = await monitoringRepository.getMonitoringData({
        date: query.date,
        employeeId: query.employeeId,
        locationId: query.locationId,
        status: query.status,
    });
    return c.json({
        data,
        total: data.length,
        timestamp: new Date().toISOString(),
    });
});
// GET /admin/rejected (Get all rejected check-in/out attempts)
adminRoutes.get("/rejected", async (c) => {
    const rejected = await taskRepository.findRejectedSubmissions();
    return c.json(rejected);
});
// POST /admin/rejected/:id/resolve (Resolve or review a rejected submission)
adminRoutes.post("/rejected/:id/resolve", async (c) => {
    const admin = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    const existing = await taskRepository.findRejectedSubmissionById(id);
    if (!existing) {
        return c.json({ error: "Rejected submission record not found" }, 404);
    }
    const now = new Date();
    await taskRepository.updateRejectedSubmission(id, {
        resolvedBy: admin.userId,
        resolvedReason: parsed.data.resolutionReason,
        resolvedAt: now,
    });
    return c.json({
        success: true,
        message: "Rejected submission marked as resolved",
    });
});
