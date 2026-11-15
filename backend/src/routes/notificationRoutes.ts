import { Hono } from "hono";
import { z } from "zod";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { requireAuth } from "../middlewares/auth.js";
import { config } from "../config.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const retentionMs = () => config.notificationRetentionDays * DAY_MS;

const itemSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().max(1000),
  audience: z.string().min(1).max(50),
  taskId: z.string().max(100).nullish(),
  read: z.boolean().optional(),
  createdAt: z.string().optional(),
});
const bulkSchema = z.object({ items: z.array(itemSchema).min(1).max(100) });

export const notificationRoutes = new Hono();

notificationRoutes.use("/*", requireAuth);

// Admin reads "admin" notifications; an employee reads their own (audience = badge id)
const audienceOf = (user: { role: string; userId: string }) =>
  user.role === "admin" ? "admin" : user.userId;

// GET /notifications  -> my notifications from the last 7 days
notificationRoutes.get("/", async (c) => {
  const user = c.get("user");
  const since = new Date(Date.now() - retentionMs());
  const list = await notificationRepository.listForAudience(audienceOf(user), since);
  return c.json(list);
});

// POST /notifications  -> save one or more notifications
notificationRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, 400);
  }

  const now = Date.now();
  const cutoff = now - retentionMs();
  const rows = [];

  for (const n of parsed.data.items) {
    // Employees may only create notifications for the admin or for themselves
    if (user.role !== "admin" && n.audience !== "admin" && n.audience !== user.userId) continue;

    let created = n.createdAt ? new Date(n.createdAt).getTime() : now;
    if (!Number.isFinite(created)) created = now;
    if (created > now) created = now;
    if (created < cutoff) continue; // already expired, don't store

    rows.push({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      audience: n.audience,
      taskId: n.taskId ?? null,
      read: !!n.read,
      createdAt: new Date(created),
    });
  }

  try {
    await notificationRepository.insertMany(rows);
    return c.json({ success: true, saved: rows.length }, 201);
  } catch (err) {
    console.error("Notification save failed:", err);
    return c.json({ error: "Could not save notifications" }, 500);
  }
});

// POST /notifications/read-all
notificationRoutes.post("/read-all", async (c) => {
  const user = c.get("user");
  await notificationRepository.markAllRead(audienceOf(user));
  return c.json({ success: true });
});

// PATCH /notifications/:id/read
notificationRoutes.patch("/:id/read", async (c) => {
  const user = c.get("user");
  await notificationRepository.markRead(c.req.param("id"), audienceOf(user));
  return c.json({ success: true });
});