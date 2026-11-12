import { type EmployeeRecord } from "../repositories/employeeRepository.js";
export interface EmployeeInput {
    id?: string;
    badgeId?: string;
    name: string;
    phone: string;
    email: string;
    department?: string;
    departmentId?: string;
    designation: string;
    joiningDate?: string;
    status?: "active" | "inactive";
    role?: "admin" | "employee";
    password?: string;
    photo?: string;
}
export declare function validateEmployee(e: Partial<EmployeeInput>, isCreate: boolean): void;
export declare const employeeService: {
    list(): Promise<Omit<EmployeeRecord, "passwordHash">[]>;
    getById(id: string): Promise<Omit<EmployeeRecord, "passwordHash">>;
    create(input: EmployeeInput): Promise<Omit<EmployeeRecord, "passwordHash">>;
    update(id: string, input: Partial<EmployeeInput>): Promise<Omit<EmployeeRecord, "passwordHash">>;
    setStatus(id: string, active: boolean): Promise<void>;
    resetPassword(id: string, newPassword: string): Promise<void>;
    remove(id: string): Promise<void>;
};
