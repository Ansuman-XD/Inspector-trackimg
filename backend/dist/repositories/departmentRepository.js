import { eq, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { departments, employees } from "../db/schema.js";
export const departmentRepository = {
    async findAll() {
        return db.select().from(departments).orderBy(departments.name);
    },
    async findById(id) {
        const res = await db.select().from(departments).where(eq(departments.id, id));
        return res[0] || null;
    },
    async findByName(name) {
        const res = await db.select().from(departments).where(eq(departments.name, name));
        return res[0] || null;
    },
    async findByCode(code) {
        const res = await db.select().from(departments).where(eq(departments.code, code.toUpperCase()));
        return res[0] || null;
    },
    async countEmployees(departmentId) {
        const res = await db
            .select({ count: count() })
            .from(employees)
            .where(eq(employees.departmentId, departmentId));
        return Number(res[0]?.count || 0);
    },
    async create(record) {
        const res = await db.insert(departments).values(record).returning();
        return res[0];
    },
    async update(id, patch) {
        const res = await db
            .update(departments)
            .set(patch)
            .where(eq(departments.id, id))
            .returning();
        return res[0] || null;
    },
    async remove(id) {
        const res = await db.delete(departments).where(eq(departments.id, id)).returning();
        return res.length > 0;
    },
};
