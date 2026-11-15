import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export type NewNotificationRecord = typeof notifications.$inferInsert;

export const notificationRepository = {
  async listForAudience(audience: string, since: Date) {
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.audience, audience), gte(notifications.createdAt, since)))
      .orderBy(desc(notifications.createdAt))
      .limit(300);
  },

  /** Same id twice = ignored, so duplicates are impossible. */
  async insertMany(rows: NewNotificationRecord[]): Promise<void> {
    if (!rows.length) return;
    await db.insert(notifications).values(rows).onConflictDoNothing({ target: notifications.id });
  },

  async markRead(id: string, audience: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.audience, audience)));
  },

  async markAllRead(audience: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.audience, audience));
  },

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const res = await db.delete(notifications).where(lt(notifications.createdAt, cutoff)).returning();
    return res.length;
  },
};