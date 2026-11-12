import { departments } from "../db/schema.js";
export type DepartmentRecord = typeof departments.$inferSelect;
export type NewDepartmentRecord = typeof departments.$inferInsert;
export declare const departmentRepository: {
    findAll(): Promise<DepartmentRecord[]>;
    findById(id: string): Promise<DepartmentRecord | null>;
    findByName(name: string): Promise<DepartmentRecord | null>;
    findByCode(code: string): Promise<DepartmentRecord | null>;
    countEmployees(departmentId: string): Promise<number>;
    create(record: NewDepartmentRecord): Promise<DepartmentRecord>;
    update(id: string, patch: Partial<NewDepartmentRecord>): Promise<DepartmentRecord | null>;
    remove(id: string): Promise<boolean>;
};
