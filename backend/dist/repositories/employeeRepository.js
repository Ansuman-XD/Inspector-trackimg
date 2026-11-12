import { eq, and, inArray, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { employees, refreshTokens, tasks } from "../db/schema.js";
export const employeeRepository = {
    async findAll() {
        return db.select().from(employees).orderBy(employees.name);
    },
    async findById(id) {
        const res = await db.select().from(employees).where(eq(employees.id, id));
        return res[0] || null;
    },
    async findByBadgeId(badgeId) {
        const res = await db.select().from(employees).where(eq(employees.badgeId, badgeId.toUpperCase()));
        return res[0] || null;
    },
    async findByEmail(email) {
        const res = await db.select().from(employees).where(eq(employees.email, email.toLowerCase()));
        return res[0] || null;
    },
    async countOpenTasks(employeeId) {
        const res = await db
            .select({ count: count() })
            .from(tasks)
            .where(and(eq(tasks.employeeId, employeeId), inArray(tasks.status, ["assigned", "pending", "in_progress", "location_reached", "checked_in"])));
        return Number(res[0]?.count || 0);
    },
    async create(record) {
        const res = await db.insert(employees).values(record).returning();
        return res[0];
    },
    async update(id, patch) {
        const res = await db
            .update(employees)
            .set(patch)
            .where(eq(employees.id, id))
            .returning();
        return res[0] || null;
    },
    async remove(id) {
        const res = await db.delete(employees).where(eq(employees.id, id)).returning();
        return res.length > 0;
    },
    async updateLastLogin(id, date = new Date()) {
        await db.update(employees).set({ lastLogin: date }).where(eq(employees.id, id));
    },
    async createRefreshToken(record) {
        await db.insert(refreshTokens).values(record);
    },
    async findValidRefreshToken(tokenId, tokenHash) {
        const now = new Date();
        const res = await db
            .select()
            .from(refreshTokens)
            .where(and(eq(refreshTokens.id, tokenId), eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.revoked, false)));
        return res[0] || null;
    },
    async revokeRefreshToken(tokenId) {
        await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, tokenId));
    },
    async revokeAllUserRefreshTokens(employeeId) {
        await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.employeeId, employeeId));
    },
};
