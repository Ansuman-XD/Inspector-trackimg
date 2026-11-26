import { type EmployeeRecord } from "../repositories/employeeRepository.js";
export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        badgeId: string;
        name: string;
        email: string;
        role: "admin" | "employee";
        department: string;
        designation: string;
        mustChangePw: boolean;
    };
}
export declare class AuthError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
export declare const authService: {
    login(badgeIdInput: string, passwordInput: string, requestedRole: "admin" | "employee"): Promise<LoginResult>;
    refresh(refreshTokenInput: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshTokenInput: string): Promise<void>;
    getMe(userId: string): Promise<Omit<EmployeeRecord, "passwordHash">>;
    changePassword(badgeIdInput: string, oldPassword: string, newPassword: string): Promise<void>;
};
