import { Hono } from "hono";
import { z } from "zod";
import { locationService } from "../services/locationService.js";
import { ServiceError } from "../lib/errors.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const locationSchema = z.object({
  name: z.string().min(3, "Enter a location name."),
  description: z.string().default(""),
  address: z.string().min(1, "Enter the address."),
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90."),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180."),
  type: z.string().optional(),
  locationTypeId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  verificationRadius: z.number().min(10).max(2000, "Verification radius must be between 10 and 2000 metres.").optional(),
});

export const locationRoutes = new Hono();

locationRoutes.use("/*", requireAuth);

// GET /locations
locationRoutes.get("/", async (c) => {
  const list = await locationService.list();
  return c.json(list);
});

// GET /locations/:id
locationRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const loc = await locationService.getById(id);
    return c.json(loc);
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /locations (Admin only)
locationRoutes.post("/", requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
  }

  try {
    const created = await locationService.create(parsed.data);
    return c.json(created, 201);
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// PUT /locations/:id (Admin only)
locationRoutes.put("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
  }

  try {
    const updated = await locationService.update(id, parsed.data);
    return c.json(updated);
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// DELETE /locations/:id (Admin only)
locationRoutes.delete("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  try {
    await locationService.remove(id);
    return c.json({ success: true, message: "Location deleted" });
  } catch (err: any) {
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.status as any);
    return c.json({ error: "Internal server error" }, 500);
  }
});
