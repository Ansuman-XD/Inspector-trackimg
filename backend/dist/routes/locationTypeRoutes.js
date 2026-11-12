import { Hono } from "hono";
import { z } from "zod";
import { locationTypeService } from "../services/locationTypeService.js";
import { ServiceError } from "../lib/errors.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
const locationTypeSchema = z.object({
    name: z.string().min(2, "Enter a location type name."),
    code: z.string().regex(/^[A-Za-z&/ ]{1,6}$/, "Code must be 1–6 letters (e.g. JST, BRG)."),
    description: z.string().optional(),
});
export const locationTypeRoutes = new Hono();
locationTypeRoutes.use("/*", requireAuth);
// GET /location-types
locationTypeRoutes.get("/", async (c) => {
    const list = await locationTypeService.list();
    return c.json(list);
});
// GET /location-types/:id
locationTypeRoutes.get("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const item = await locationTypeService.getById(id);
        return c.json(item);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /location-types (Admin only)
locationTypeRoutes.post("/", requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = locationTypeSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const created = await locationTypeService.create(parsed.data);
        return c.json(created, 201);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PUT /location-types/:id (Admin only)
locationTypeRoutes.put("/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = locationTypeSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
    }
    try {
        const updated = await locationTypeService.update(id, parsed.data);
        return c.json(updated);
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /location-types/:id (Admin only)
locationTypeRoutes.delete("/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    try {
        await locationTypeService.remove(id);
        return c.json({ success: true, message: "Location type deleted" });
    }
    catch (err) {
        if (err instanceof ServiceError)
            return c.json({ error: err.message }, err.status);
        return c.json({ error: "Internal server error" }, 500);
    }
});
