import { locations } from "../db/schema.js";
export type LocationRecord = typeof locations.$inferSelect;
export type NewLocationRecord = typeof locations.$inferInsert;
export declare const locationRepository: {
    findAll(): Promise<LocationRecord[]>;
    findById(id: string): Promise<LocationRecord | null>;
    findByName(name: string): Promise<LocationRecord | null>;
    countTasks(locationId: string): Promise<number>;
    create(record: NewLocationRecord): Promise<LocationRecord>;
    update(id: string, patch: Partial<NewLocationRecord>): Promise<LocationRecord | null>;
    remove(id: string): Promise<boolean>;
};
