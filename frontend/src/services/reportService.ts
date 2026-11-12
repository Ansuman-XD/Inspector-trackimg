import type { DB, Employee, Task, VisitLocation } from "@/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { isSelfPlanned } from "@/lib/visitRules";

export interface ReportFilters {
  from: string;
  to: string;
  employeeId: string;
  department: string;
  locationId: string;
  status: string;
  /** "admin" | "self" | "" */
  planning: string;
  /** "employee" | "admin" | "" — who performed the check-in/out */
  checkInBy: string;
  checkOutBy: string;
}

export function filterTasks(db: DB, f: ReportFilters): Task[] {
  return db.tasks
    .filter((t) => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to))
    .filter((t) => !f.employeeId || t.employeeId === f.employeeId)
    .filter((t) => !f.locationId || t.locationId === f.locationId)
    .filter((t) => !f.status || t.status === f.status)
    .filter((t) => !f.department || db.employees.find((e) => e.id === t.employeeId)?.department === f.department)
    .filter((t) => !f.planning || (f.planning === "self" ? isSelfPlanned(t) : !isSelfPlanned(t)))
    .filter((t) => !f.checkInBy || (f.checkInBy === "admin" ? !!t.checkIn?.override : !!t.checkIn && !t.checkIn.override))
    .filter((t) => !f.checkOutBy || (f.checkOutBy === "admin" ? !!t.checkOut?.override : !!t.checkOut && !t.checkOut.override))
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadCsv(filename: string, head: string[], rows: unknown[][]) {
  const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stageBy = (override?: { reason: string; at: string; by: string }) => (override ? "Admin Override" : "Self");
const stageGps = (t: Task, stage: "checkIn" | "checkOut") => {
  const s = t[stage];
  if (!s) return "";
  if (s.override) return "Override";
  return "Yes";
};
const stagePhoto = (t: Task, stage: "checkIn" | "checkOut") => {
  const s = t[stage];
  if (!s) return "";
  return s.photo ? "Yes" : "No";
};

const VISIT_HEAD = [
  "Visit ID", "Employee Name", "Employee ID", "Location Name", "Location Assigned By", "Location Priority",
  "Check-In By", "Check-In Time", "Check-In GPS Verified", "Check-In Photo Submitted",
  "Check-Out By", "Check-Out Time", "Check-Out GPS Verified", "Check-Out Photo Submitted", "Status",
];

function visitRow(db: DB, t: Task) {
  const e = db.employees.find((x) => x.id === t.employeeId);
  const l = db.locations.find((x) => x.id === t.locationId);
  return [
    t.id,
    e?.name ?? t.employeeId,
    t.employeeId,
    l?.name ?? t.locationId,
    isSelfPlanned(t) ? "Self" : "Admin",
    t.priority,
    stageBy(t.checkIn?.override),
    t.checkIn ? fmtDateTime(t.checkIn.at) : "",
    stageGps(t, "checkIn"),
    stagePhoto(t, "checkIn"),
    stageBy(t.checkOut?.override),
    t.checkOut ? fmtDateTime(t.checkOut.at) : "",
    stageGps(t, "checkOut"),
    stagePhoto(t, "checkOut"),
    STATUS_META[t.status].label,
  ];
}

/** Full 15-column visit export used by Visit Monitoring, Reports and the location drawer. */
export function exportVisitsCsv(db: DB, tasks: Task[], filename = "inspector-tracking-visits.csv") {
  downloadCsv(filename, VISIT_HEAD, tasks.map((t) => visitRow(db, t)));
}

export function exportEmployeesCsv(db: DB, employees: Employee[], filename = "inspector-tracking-employees.csv") {
  const head = ["Employee ID", "Name", "Designation", "Department", "Phone", "Email", "Status", "Joining Date", "Total Completed Visits"];
  const rows = employees.map((e) => [
    e.id, e.name, e.designation, e.department, e.phone, e.email,
    e.status === "active" ? "Active" : "Inactive", fmtDate(e.joiningDate),
    db.tasks.filter((t) => t.employeeId === e.id && t.status === "verified").length,
  ]);
  downloadCsv(filename, head, rows);
}

export function exportLocationsCsv(db: DB, locations: VisitLocation[], filename = "inspector-tracking-locations.csv") {
  const head = ["Location ID", "Name", "Location Type", "Verification Radius (m)", "Latitude", "Longitude", "Address", "Status", "Total Visits"];
  const rows = locations.map((l) => [
    l.id, l.name, l.type, l.verificationRadius ?? 100, l.lat, l.lng, l.address,
    l.status === "active" ? "Active" : "Inactive",
    db.tasks.filter((t) => t.locationId === l.id).length,
  ]);
  downloadCsv(filename, head, rows);
}

/** Historical visits for one location, as shown in its details drawer. */
export function exportLocationVisitsCsv(db: DB, location: VisitLocation, filename?: string) {
  const tasks = db.tasks
    .filter((t) => t.locationId === location.id)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  downloadCsv(
    filename ?? `inspector-tracking-${location.name.replace(/\W+/g, "-").toLowerCase()}-visits.csv`,
    ["Location Name", "Date", "Inspector Name", "Inspector ID", "Planned By", "Status", "Check-In Time", "Check-In By", "Check-In GPS Verified", "Check-In Photo", "Check-Out Time", "Check-Out By", "Check-Out GPS Verified", "Check-Out Photo"],
    tasks.map((t) => {
      const e = db.employees.find((x) => x.id === t.employeeId);
      return [
        location.name, fmtDate(t.date), e?.name ?? t.employeeId, t.employeeId,
        isSelfPlanned(t) ? "Self" : "Admin", STATUS_META[t.status].label,
        t.checkIn ? fmtDateTime(t.checkIn.at) : "", stageBy(t.checkIn?.override), stageGps(t, "checkIn") || "No", stagePhoto(t, "checkIn") || "No",
        t.checkOut ? fmtDateTime(t.checkOut.at) : "", stageBy(t.checkOut?.override), stageGps(t, "checkOut") || "No", stagePhoto(t, "checkOut") || "No",
      ];
    }),
  );
}
