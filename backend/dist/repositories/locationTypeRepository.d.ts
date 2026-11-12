import { locationTypes } from "../db/schema.js";
export type LocationTypeRecord = typeof locationTypes.$inferSelect;
export type NewLocationTypeRecord = typeof locationTypes.$inferInsert;
export declare const locationTypeRepository: {
    findAll(): Promise<LocationTypeRecord[]>;
    findById(id: string): Promise<LocationTypeRecord | null>;
    findByName(name: string): Promise<LocationTypeRecord | null>;
    findByCode(code: string): Promise<LocationTypeRecord | null>;
    countLocations(locationTypeId: string): Promise<number>;
    create(record: NewLocationTypeRecord): Promise<LocationTypeRecord>;
    update(id: string, patch: Partial<NewLocationTypeRecord>): Promise<LocationTypeRecord | null>;
    remove(id: string): Promise<boolean>;
};
