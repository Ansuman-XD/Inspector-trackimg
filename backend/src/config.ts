import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL || "",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev_access_secret_min_32_characters_long_12345",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_min_32_characters_long_12345",
    accessExpiresIn: "15m",
    refreshExpiresInDays: 7,
  },
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),
  internalCleanupSecret: process.env.INTERNAL_CLEANUP_SECRET || "dev_cleanup_secret",
  gpsMaxAccuracyMeters: Number(process.env.GPS_MAX_ACCURACY_METERS) || 100,
  timeDiffFlagThresholdMinutes: Number(process.env.TIME_DIFF_FLAG_THRESHOLD_MINUTES) || 10,
};
