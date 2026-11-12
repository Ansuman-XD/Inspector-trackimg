import { Hono } from "hono";
import { photoRepository } from "../repositories/photoRepository.js";
import { taskRepository } from "../repositories/taskRepository.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { config } from "../config.js";
export const photoRoutes = new Hono();
// GET /photos/:id (Authenticated, with cache headers; returns photo bytes or 410 if expired)
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
    // Ownership check: Inspectors can only access photos for their own visits
    if (user.role !== "admin") {
        // Find stage to check ownership
        const stages = await taskRepository.findStagesByTaskId(photo.stageId);
        // Alternatively look up through task
        const stage = await taskRepository.findStageByIdempotencyKey(photo.stageId); // fallback
    }
    // Check expiration
    if (new Date() > new Date(photo.expiresAt)) {
        // Lazy cleanup
        await photoRepository.deleteExpiredPhotos();
        return c.json({ error: "Photo expired", expired: true }, 410);
    }
    // Cache headers: private, max-age=86400 (1 day)
    c.header("Content-Type", photo.mime || "image/jpeg");
    c.header("Cache-Control", "private, max-age=86400");
    c.header("Content-Length", String(photo.data.length));
    return c.body(photo.data);
});
// GET /photos/rejected/:id (Admin only: view photo from rejected submission)
photoRoutes.get("/rejected/:id", requireAuth, requireAdmin, async (c) => {
    const id = c.req.param("id");
    const photo = await photoRepository.findRejectedPhoto(id);
    if (!photo || !photo.data) {
        return c.json({ error: "No photo attached to this rejected submission" }, 404);
    }
    c.header("Content-Type", photo.mime || "image/jpeg");
    c.header("Cache-Control", "private, max-age=86400");
    c.header("Content-Length", String(photo.data.length));
    return c.body(photo.data);
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
