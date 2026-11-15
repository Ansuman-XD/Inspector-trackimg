export declare const config: {
    port: number;
    databaseUrl: string;
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiresIn: string;
        refreshExpiresInDays: number;
    };
    corsOrigins: string[];
    internalCleanupSecret: string;
    gpsMaxAccuracyMeters: number;
    timeDiffFlagThresholdMinutes: number;
    photoRetentionDays: number;
    importantPhotoRetentionDays: number;
    notificationRetentionDays: number;
};
