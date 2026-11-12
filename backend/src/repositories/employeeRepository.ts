import { eq, and, inArray, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { employees, refreshTokens, tasks } from "../db/schema.js";

export type EmployeeRecord = typeof employees.$inferSelect;
export type NewEmployeeRecord = typeof employees.$inferInsert;

export const employeeRepository = {
  async findAll(): Promise<EmployeeRecord[]> {
    return db.select().from(employees).orderBy(employees.name);
  },

  async findById(id: string): Promise<EmployeeRecord | null> {
    const res = await db.select().from(employees).where(eq(employees.id, id));
    return res[0] || null;
  },

  async findByBadgeId(badgeId: string): Promise<EmployeeRecord | null> {
    const res = await db.select().from(employees).where(eq(employees.badgeId, badgeId.toUpperCase()));
    return res[0] || null;
  },

  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const res = await db.select().from(employees).where(eq(employees.email, email.toLowerCase()));
    return res[0] || null;
  },

  async countOpenTasks(employeeId: string): Promise<number> {
    const res = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.employeeId, employeeId),
          inArray(tasks.status, ["assigned", "pending", "in_progress", "location_reached", "checked_in"])
        )
      );
    return Number(res[0]?.count || 0);
  },

  async create(record: NewEmployeeRecord): Promise<EmployeeRecord> {
    const res = await db.insert(employees).values(record).returning();
    return res[0];
  },

  async update(id: string, patch: Partial<NewEmployeeRecord>): Promise<EmployeeRecord | null> {
    const res = await db
      .update(employees)
      .set(patch)
      .where(eq(employees.id, id))
      .returning();
    return res[0] || null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await db.delete(employees).where(eq(employees.id, id)).returning();
    return res.length > 0;
  },

  async updateLastLogin(id: string, date: Date = new Date()): Promise<void> {
    await db.update(employees).set({ lastLogin: date }).where(eq(employees.id, id));
  },

  async createRefreshToken(record: typeof refreshTokens.$inferInsert): Promise<void> {
    await db.insert(refreshTokens).values(record);
  },

  async findValidRefreshToken(tokenId: string, tokenHash: string): Promise<typeof refreshTokens.$inferSelect | null> {
    const now = new Date();
    const res = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.id, tokenId),
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.revoked, false)
        )
      );
    return res[0] || null;
  },

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, tokenId));
  },

  async revokeAllUserRefreshTokens(employeeId: string): Promise<void> {
    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.employeeId, employeeId));
  },
};
