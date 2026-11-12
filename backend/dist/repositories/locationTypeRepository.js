import { eq, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { locationTypes, locations } from "../db/schema.js";
export const locationTypeRepository = {
    async findAll() {
        return db.select().from(locationTypes).orderBy(locationTypes.name);
    },
    async findById(id) {
        const res = await db.select().from(locationTypes).where(eq(locationTypes.id, id));
        return res[0] || null;
    },
    async findByName(name) {
        const res = await db.select().from(locationTypes).where(eq(locationTypes.name, name));
        return res[0] || null;
    },
    async findByCode(code) {
        const res = await db.select().from(locationTypes).where(eq(locationTypes.code, code.toUpperCase()));
        return res[0] || null;
    },
    async countLocations(locationTypeId) {
        const res = await db
            .select({ count: count() })
            .from(locations)
            .where(eq(locations.locationTypeId, locationTypeId));
        return Number(res[0]?.count || 0);
    },
    async create(record) {
        const res = await db.insert(locationTypes).values(record).returning();
        return res[0];
    },
    async update(id, patch) {
        const res = await db
            .update(locationTypes)
            .set(patch)
            .where(eq(locationTypes.id, id))
            .returning();
        return res[0] || null;
    },
    async remove(id) {
        const res = await db.delete(locationTypes).where(eq(locationTypes.id, id)).returning();
        return res.length > 0;
    },
};
