import { Hono } from "hono";
import { monitoringRepository } from "../repositories/monitoringRepository.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const VISIT_HEAD = [
    "Visit ID",
    "Employee Name",
    "Employee ID",
    "Location Name",
    "Location Assigned By",
    "Location Priority",
    "Check-In By",
    "Check-In Time",
    "Check-In GPS Verified",
    "Check-In Photo Submitted",
    "Check-Out By",
    "Check-Out Time",
    "Check-Out GPS Verified",
    "Check-Out Photo Submitted",
    "Status",
];
export const reportRoutes = new Hono();
reportRoutes.use("/*", requireAuth, requireAdmin);
// GET /reports/visits (Returns JSON or CSV with exact 15 columns)
reportRoutes.get("/visits", async (c) => {
    const query = c.req.query();
    const format = query.format || "json";
    const rows = await monitoringRepository.getMonitoringData({
        from: query.from,
        to: query.to,
        date: query.date,
        employeeId: query.employeeId,
        locationId: query.locationId,
        department: query.department,
        status: query.status,
    });
    if (format === "csv") {
        const csvRows = rows.map((r) => {
            const checkInBy = r.checkIn?.overrideReason ? "Admin Override" : r.checkIn ? "Self" : "";
            const checkInGps = r.checkIn?.overrideReason ? "Override" : r.checkIn ? "Yes" : "";
            const checkInPhoto = r.checkIn ? (r.checkIn.photoSha256 ? "Yes" : "No") : "";
            const checkOutBy = r.checkOut?.overrideReason ? "Admin Override" : r.checkOut ? "Self" : "";
            const checkOutGps = r.checkOut?.overrideReason ? "Override" : r.checkOut ? "Yes" : "";
            const checkOutPhoto = r.checkOut ? (r.checkOut.photoSha256 ? "Yes" : "No") : "";
            const statusLabels = {
                assigned: "Assigned",
                in_progress: "In Progress",
                location_reached: "Location Reached",
                checked_in: "Checked In",
                verified: "Completed",
                pending: "Pending",
                not_visited: "Not Visited",
                verification_failed: "Verification Failed",
                expired: "Expired",
                cancelled: "Cancelled",
            };
            return [
                r.id,
                r.employeeName,
                r.employeeId,
                r.locationName,
                r.source === "self" ? "Self" : "Admin",
                r.priority,
                checkInBy,
                r.checkIn?.at ? r.checkIn.at.toISOString() : "",
                checkInGps,
                checkInPhoto,
                checkOutBy,
                r.checkOut?.at ? r.checkOut.at.toISOString() : "",
                checkOutGps,
                checkOutPhoto,
                statusLabels[r.status] || r.status,
            ];
        });
        const csvContent = "\uFEFF" + [VISIT_HEAD, ...csvRows].map((r) => r.map(esc).join(",")).join("\r\n");
        c.header("Content-Type", "text/csv; charset=utf-8");
        c.header("Content-Disposition", `attachment; filename="inspector-tracking-visits-${query.date || "report"}.csv"`);
        return c.body(csvContent);
    }
    // JSON format
    return c.json({
        data: rows,
        total: rows.length,
        timestamp: new Date().toISOString(),
    });
});
