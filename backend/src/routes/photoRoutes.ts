import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { photoRepository } from "../repositories/photoRepository.js";
import { taskRepository } from "../repositories/taskRepository.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { taskStages } from "../db/schema.js";
export const photoRoutes = new Hono();

// GET /photos/:id (Authenticated; id can be photo id PH-... or stage id STG-...)
photoRoutes.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  // Lookup photo by photo ID or stage ID
  let photo = await photoRepository.findStagePhotoById(id);
  if (!photo) {
    photo = await photoRepository.findStagePhotoByStageId(id);
  }

  if (!photo) {
    return c.json({ error: "Photo not found or expired" }, 404);
  }

  // Ownership: non-admin can only see photos of their own visits
  if (user.role !== "admin") {
    const stageRows = await db
      .select({ taskId: taskStages.taskId })
      .from(taskStages)
      .where(eq(taskStages.id, photo.stageId))
      .limit(1);

    const stage = stageRows[0];
    if (!stage) {
      return c.json({ error: "Photo not found" }, 404);
    }

    const task = await taskRepository.findById(stage.taskId);
    if (!task || task.employeeId !== user.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }
  }

  // Check expiration
  if (new Date() > new Date(photo.expiresAt)) {
    await photoRepository.deleteExpiredPhotos();
    return c.json({ error: "Photo expired", expired: true }, 410);
  }

  // Convert Buffer → Uint8Array so Hono's TypeScript types accept it
   const bytes = Buffer.from(photo.data as Buffer);

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": photo.mime || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "Content-Length": String(bytes.byteLength),
    },
  });
});

// GET /photos/rejected/:id (Admin only)
photoRoutes.get("/rejected/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const photo = await photoRepository.findRejectedPhoto(id);

  if (!photo || !photo.data) {
    return c.json({ error: "No photo attached to this rejected submission" }, 404);
  }

  const bytes = Buffer.from(photo.data as Buffer);

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": photo.mime || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "Content-Length": String(bytes.byteLength),
    },
  });
});

// POST /internal/cleanup (Protected by X-Cleanup-Secret header; deletes expired photos)
photoRoutes.post("/internal/cleanup", async (c) => {
  const secret = c.req.header("X-Cleanup-Secret") || c.req.header("x-cleanup-secret");
  if (!secret || secret !== config.internalCleanupSecret) {
    return c.json({ error: "Unauthorized: invalid cleanup secret" }, 401);
  }

  const deletedCount = await photoRepository.deleteExpiredPhotos();
  return c.json({
    success: true,
    deletedCount,
    timestamp: new Date().toISOString(),
  });
});
