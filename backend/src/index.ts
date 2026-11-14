import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { authRoutes } from "./routes/authRoutes.js";
import { departmentRoutes } from "./routes/departmentRoutes.js";
import { locationTypeRoutes } from "./routes/locationTypeRoutes.js";
import { locationRoutes } from "./routes/locationRoutes.js";
import { employeeRoutes } from "./routes/employeeRoutes.js";
import { taskRoutes } from "./routes/taskRoutes.js";
import { photoRoutes } from "./routes/photoRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { photoRepository } from "./repositories/photoRepository.js";

const app = new Hono();

// CORS configuration
app.use(
  "/*",
  cors({
    origin: config.corsOrigins,
    allowHeaders: ["Content-Type", "Authorization", "X-Cleanup-Secret"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Type", "Content-Disposition"],
    maxAge: 600,
  })
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "inspector-tracking-api",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.route("/auth", authRoutes);
app.route("/departments", departmentRoutes);
app.route("/location-types", locationTypeRoutes);
app.route("/locations", locationRoutes);
app.route("/employees", employeeRoutes);
app.route("/tasks", taskRoutes);
app.route("/photos", photoRoutes);
app.route("/admin", adminRoutes);
app.route("/reports", reportRoutes);
app.route("/", photoRoutes); // For POST /internal/cleanup directly

// Server startup
if (process.env.NODE_ENV !== "test") {
  const server = serve(
    {
      fetch: app.fetch,
      port: config.port,
    },
    async (info) => {
      console.log("\n=======================================================");
      console.log("       🚆 INDIAN RAILWAY INSPECTOR TRACKING API        ");
      console.log("=======================================================");
      console.log(`⚡ [SERVER] Listening on http://localhost:${info.port}`);
      console.log(`🌐 [ENV]    Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔒 [CORS]   Allowed Origins: ${config.corsOrigins.join(", ")}`);

      // Verify Database Connection
      try {
        const { checkDatabaseConnection } = await import("./db/index.js");
        const dbStatus = await checkDatabaseConnection();
        if (dbStatus.ok) {
          console.log(`✅ [DATABASE] Connected successfully!`);
          console.log(`              ${dbStatus.version?.split(" on ")[0] || "PostgreSQL"}`);
        } else {
          console.error(`❌ [DATABASE] Connection failed: ${dbStatus.message}`);
        }
      } catch (err: any) {
        console.error(`❌ [DATABASE] Error during connection check: ${err.message}`);
      }

      console.log("-------------------------------------------------------");
      console.log("📌 Mounted Endpoints:");
      console.log("   • GET    /health");
      console.log("   • POST   /auth/login, /auth/refresh, /auth/logout, GET /auth/me");
      console.log("   • CRUD   /departments, /location-types, /locations, /employees");
      console.log("   • CRUD   /tasks, /tasks/:id/checkin, /tasks/:id/checkout, /tasks/:id/override");
      console.log("   • GET    /photos/:id, POST /internal/cleanup");
      console.log("   • GET    /admin/monitoring");
      console.log("   • GET    /reports/visits (CSV export)");
      console.log("=======================================================\n");
    }
  );
  const runCleanup = () =>
  photoRepository
    .deleteExpiredPhotos()
    .then((n) => n && console.log(`🧹 Deleted ${n} expired photo(s)`))
    .catch((e) => console.error("Photo cleanup failed:", e));
runCleanup();
setInterval(runCleanup, 6 * 60 * 60 * 1000); // every 6 hours
}

export default app;
