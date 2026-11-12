import { eq, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { locations, tasks } from "../db/schema.js";

export type LocationRecord = typeof locations.$inferSelect;
export type NewLocationRecord = typeof locations.$inferInsert;

export const locationRepository = {
  async findAll(): Promise<LocationRecord[]> {
    return db.select().from(locations).orderBy(locations.name);
  },

  async findById(id: string): Promise<LocationRecord | null> {
    const res = await db.select().from(locations).where(eq(locations.id, id));
    return res[0] || null;
  },

  async findByName(name: string): Promise<LocationRecord | null> {
    const res = await db.select().from(locations).where(eq(locations.name, name));
    return res[0] || null;
  },

  async countTasks(locationId: string): Promise<number> {
    const res = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.locationId, locationId));
    return Number(res[0]?.count || 0);
  },

  async create(record: NewLocationRecord): Promise<LocationRecord> {
    const res = await db.insert(locations).values(record).returning();
    return res[0];
  },

  async update(id: string, patch: Partial<NewLocationRecord>): Promise<LocationRecord | null> {
    const res = await db
      .update(locations)
      .set(patch)
      .where(eq(locations.id, id))
      .returning();
    return res[0] || null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await db.delete(locations).where(eq(locations.id, id)).returning();
    return res.length > 0;
  },
};
