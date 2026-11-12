import { employees, refreshTokens } from "../db/schema.js";
export type EmployeeRecord = typeof employees.$inferSelect;
export type NewEmployeeRecord = typeof employees.$inferInsert;
export declare const employeeRepository: {
    findAll(): Promise<EmployeeRecord[]>;
    findById(id: string): Promise<EmployeeRecord | null>;
    findByBadgeId(badgeId: string): Promise<EmployeeRecord | null>;
    findByEmail(email: string): Promise<EmployeeRecord | null>;
    countOpenTasks(employeeId: string): Promise<number>;
    create(record: NewEmployeeRecord): Promise<EmployeeRecord>;
    update(id: string, patch: Partial<NewEmployeeRecord>): Promise<EmployeeRecord | null>;
    remove(id: string): Promise<boolean>;
    updateLastLogin(id: string, date?: Date): Promise<void>;
    createRefreshToken(record: typeof refreshTokens.$inferInsert): Promise<void>;
    findValidRefreshToken(tokenId: string, tokenHash: string): Promise<typeof refreshTokens.$inferSelect | null>;
    revokeRefreshToken(tokenId: string): Promise<void>;
    revokeAllUserRefreshTokens(employeeId: string): Promise<void>;
};
