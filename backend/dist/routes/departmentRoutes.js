import { Hono } from "hono";
import { z } from "zod";
import { departmentService } from "../services/departmentService.js";
import { ServiceError } from "../lib/errors.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
const departmentSchema = z.object({
    name: z.string().min(2, "Enter a department name."),
    code: z.string().regex(/^[A-Za-z&/ ]{1,6}$/, "Code must be 1–6 letters (e.g. CEN, S&T)."),
    description: z.string().optional(),
});
export const departmentRoutes = new Hono();
departmentRoutes.use("/*", requireAuth);
// GET /departments
departmentRoutes.get("/", async (c) => {
    const list = await departmentService.list();
    return c.json(list);
});
// GET /departments/:id
departmentRoutes.get("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const dept = await departmentService.getById(id);
        return c.json(dept);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /departments (Admin only)
departmentRoutes.post("/", requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = departmentSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const created = await departmentService.create(parsed.data);
        return c.json(created, 201);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PUT /departments/:id (Admin only)
departmentRoutes.put("/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = departmentSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const updated = await departmentService.update(id, parsed.data);
        return c.json(updated);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /departments/:id (Admin only)
departmentRoutes.delete("/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    try {
        await departmentService.remove(id);
        return c.json({ success: true, message: "Department deleted" });
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
