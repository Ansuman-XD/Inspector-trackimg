import { type DepartmentRecord } from "../repositories/departmentRepository.js";
export interface DepartmentInput {
    name: string;
    code: string;
    description?: string;
}
export declare function validateDepartment(d: DepartmentInput): void;
export declare const departmentService: {
    list(): Promise<DepartmentRecord[]>;
    getById(id: string): Promise<DepartmentRecord>;
    create(input: DepartmentInput): Promise<DepartmentRecord>;
    update(id: string, input: DepartmentInput): Promise<DepartmentRecord>;
    remove(id: string): Promise<void>;
};
