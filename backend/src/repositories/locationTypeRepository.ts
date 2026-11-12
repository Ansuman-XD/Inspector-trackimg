import { eq, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { locationTypes, locations } from "../db/schema.js";

export type LocationTypeRecord = typeof locationTypes.$inferSelect;
export type NewLocationTypeRecord = typeof locationTypes.$inferInsert;

export const locationTypeRepository = {
  async findAll(): Promise<LocationTypeRecord[]> {
    return db.select().from(locationTypes).orderBy(locationTypes.name);
  },

  async findById(id: string): Promise<LocationTypeRecord | null> {
    const res = await db.select().from(locationTypes).where(eq(locationTypes.id, id));
    return res[0] || null;
  },

  async findByName(name: string): Promise<LocationTypeRecord | null> {
    const res = await db.select().from(locationTypes).where(eq(locationTypes.name, name));
    return res[0] || null;
  },

  async findByCode(code: string): Promise<LocationTypeRecord | null> {
    const res = await db.select().from(locationTypes).where(eq(locationTypes.code, code.toUpperCase()));
    return res[0] || null;
  },

  async countLocations(locationTypeId: string): Promise<number> {
    const res = await db
      .select({ count: count() })
      .from(locations)
      .where(eq(locations.locationTypeId, locationTypeId));
    return Number(res[0]?.count || 0);
  },

  async create(record: NewLocationTypeRecord): Promise<LocationTypeRecord> {
    const res = await db.insert(locationTypes).values(record).returning();
    return res[0];
  },

  async update(id: string, patch: Partial<NewLocationTypeRecord>): Promise<LocationTypeRecord | null> {
    const res = await db
      .update(locationTypes)
      .set(patch)
      .where(eq(locationTypes.id, id))
      .returning();
    return res[0] || null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await db.delete(locationTypes).where(eq(locationTypes.id, id)).returning();
    return res.length > 0;
  },
};
