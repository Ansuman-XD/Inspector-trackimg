import { eq, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { stagePhotos, rejectedSubmissions } from "../db/schema.js";
export const photoRepository = {
    async findStagePhotoById(id) {
        const res = await db.select().from(stagePhotos).where(eq(stagePhotos.id, id));
        return res[0] || null;
    },
    async findStagePhotoByStageId(stageId) {
        const res = await db.select().from(stagePhotos).where(eq(stagePhotos.stageId, stageId));
        return res[0] || null;
    },
    async deleteExpiredPhotos(now = new Date()) {
        const res = await db.delete(stagePhotos).where(lt(stagePhotos.expiresAt, now)).returning();
        return res.length;
    },
    async findRejectedPhoto(rejectedSubmissionId) {
        const res = await db
            .select({
            data: rejectedSubmissions.photoData,
            mime: rejectedSubmissions.photoMime,
        })
            .from(rejectedSubmissions)
            .where(eq(rejectedSubmissions.id, rejectedSubmissionId));
        if (!res[0])
            return null;
        return res[0];
    },
    /** Reset expiry of every photo of a task to (upload time + N days). */
    async setExpiryForTask(taskId, days) {
        await db.execute(sql `
      UPDATE stage_photos
      SET expires_at = created_at + make_interval(days => ${days}::int)
      WHERE stage_id IN (SELECT id FROM task_stages WHERE task_id = ${taskId})
    `);
    },
};
