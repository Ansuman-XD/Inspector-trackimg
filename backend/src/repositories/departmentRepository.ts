import { eq, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { departments, employees } from "../db/schema.js";

export type DepartmentRecord = typeof departments.$inferSelect;
export type NewDepartmentRecord = typeof departments.$inferInsert;

export const departmentRepository = {
  async findAll(): Promise<DepartmentRecord[]> {
    return db.select().from(departments).orderBy(departments.name);
  },

  async findById(id: string): Promise<DepartmentRecord | null> {
    const res = await db.select().from(departments).where(eq(departments.id, id));
    return res[0] || null;
  },

  async findByName(name: string): Promise<DepartmentRecord | null> {
    const res = await db.select().from(departments).where(eq(departments.name, name));
    return res[0] || null;
  },

  async findByCode(code: string): Promise<DepartmentRecord | null> {
    const res = await db.select().from(departments).where(eq(departments.code, code.toUpperCase()));
    return res[0] || null;
  },

  async countEmployees(departmentId: string): Promise<number> {
    const res = await db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.departmentId, departmentId));
    return Number(res[0]?.count || 0);
  },

  async create(record: NewDepartmentRecord): Promise<DepartmentRecord> {
    const res = await db.insert(departments).values(record).returning();
    return res[0];
  },

  async update(id: string, patch: Partial<NewDepartmentRecord>): Promise<DepartmentRecord | null> {
    const res = await db
      .update(departments)
      .set(patch)
      .where(eq(departments.id, id))
      .returning();
    return res[0] || null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await db.delete(departments).where(eq(departments.id, id)).returning();
    return res.length > 0;
  },
};
