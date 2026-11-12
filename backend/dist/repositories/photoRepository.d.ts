import { stagePhotos } from "../db/schema.js";
export declare const photoRepository: {
    findStagePhotoById(id: string): Promise<typeof stagePhotos.$inferSelect | null>;
    findStagePhotoByStageId(stageId: string): Promise<typeof stagePhotos.$inferSelect | null>;
    deleteExpiredPhotos(now?: Date): Promise<number>;
    findRejectedPhoto(rejectedSubmissionId: string): Promise<{
        data: Buffer | null;
        mime: string | null;
    } | null>;
};
