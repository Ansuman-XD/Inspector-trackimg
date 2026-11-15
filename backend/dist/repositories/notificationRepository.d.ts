import { notifications } from "../db/schema.js";
export type NewNotificationRecord = typeof notifications.$inferInsert;
export declare const notificationRepository: {
    listForAudience(audience: string, since: Date): Promise<{
        id: string;
        type: string;
        title: string;
        message: string;
        audience: string;
        taskId: string | null;
        read: boolean;
        createdAt: Date;
    }[]>;
    /** Same id twice = ignored, so duplicates are impossible. */
    insertMany(rows: NewNotificationRecord[]): Promise<void>;
    markRead(id: string, audience: string): Promise<void>;
    markAllRead(audience: string): Promise<void>;
    deleteOlderThan(cutoff: Date): Promise<number>;
};
