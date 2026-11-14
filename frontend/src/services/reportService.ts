import type { DB, Employee, Task, VisitLocation } from "@/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { isSelfPlanned } from "@/lib/visitRules";
import { BRAND } from "@/lib/branding";

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
    /** "important" | "normal" | "" (all) */
  important: string;
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
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
    .filter((t) => !f.important || (f.important === "important" ? !!t.important : !t.important));
}

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// function downloadCsv(filename: string, head: string[], rows: unknown[][]) {
//   const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
//   const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
//   setTimeout(() => URL.revokeObjectURL(url), 1000);
// }

const TONES: Record<string, { bg: string; fg: string }> = {
  completed: { bg: "FFDCFCE7", fg: "FF166534" }, active: { bg: "FFDCFCE7", fg: "FF166534" }, yes: { bg: "FFDCFCE7", fg: "FF166534" },
  "not visited": { bg: "FFFEE2E2", fg: "FF991B1B" }, "verification failed": { bg: "FFFEE2E2", fg: "FF991B1B" },
  pending: { bg: "FFFEF3C7", fg: "FF92400E" }, override: { bg: "FFFEF3C7", fg: "FF92400E" }, "admin override": { bg: "FFFEF3C7", fg: "FF92400E" },
  assigned: { bg: "FFDBEAFE", fg: "FF1E40AF" }, "in progress": { bg: "FFDBEAFE", fg: "FF1E40AF" },
  "location reached": { bg: "FFDBEAFE", fg: "FF1E40AF" }, "checked in": { bg: "FFDBEAFE", fg: "FF1E40AF" },
  inactive: { bg: "FFF1F5F9", fg: "FF475569" }, expired: { bg: "FFF1F5F9", fg: "FF475569" }, cancelled: { bg: "FFF1F5F9", fg: "FF475569" },
};

async function downloadCsv(filename: string, head: string[], rows: unknown[][], title = "Report") {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  const ws = wb.addWorksheet(title.slice(0, 31), { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  const n = head.length;
  const thin = { style: "thin" as const, color: { argb: "FFE2E8F0" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // Banner rows
  // ws.mergeCells(1, 1, 1, n); ws.mergeCells(2, 1, 2, n); ws.mergeCells(3, 1, 3, n);
  // const banner = ws.getCell(1, 1);
  // banner.value = BRAND.toUpperCase();
  // banner.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  // banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8F1D24" } };
  // banner.alignment = { vertical: "middle", indent: 1 };
  // ws.getRow(1).height = 32;
  // const sub = ws.getCell(2, 1);
  // sub.value = `${title} · East Coast Railway, Khurda Road Division`;
  // sub.font = { size: 11, bold: true, color: { argb: "FF1E293B" } };
  // sub.alignment = { indent: 1 };
  // const meta = ws.getCell(3, 1);
  // meta.value = `Generated ${fmtDateTime(new Date().toISOString())} · ${rows.length} record${rows.length === 1 ? "" : "s"}`;
  // meta.font = { size: 10, italic: true, color: { argb: "FF64748B" } };
  // meta.alignment = { indent: 1 };

  // Header row
  const h = ws.getRow(1);
  head.forEach((t, i) => {
    const c = h.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = border;
  });
  h.height = 28;

  // Data rows
  rows.forEach((r, ri) => {
    const row = ws.addRow(r.map((v) => v ?? ""));
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = { size: 10, color: { argb: "FF0F172A" } };
      c.border = border;
      c.alignment = { vertical: "middle", horizontal: "left" };
      if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      const tone = TONES[String(c.value ?? "").toLowerCase()];
      if (tone) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone.bg } };
        c.font = { size: 10, bold: true, color: { argb: tone.fg } };
        c.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  // Column widths, filter, print layout
  head.forEach((t, i) => {
    const longest = Math.max(t.length + 4, ...rows.map((r) => String(r[i] ?? "").length + 2));
    ws.getColumn(i + 1).width = Math.min(48, Math.max(12, longest));
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: n } };
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.replace(/\.csv$/i, "") + ".xlsx";
  document.body.appendChild(a); a.click(); a.remove();
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
  downloadCsv(filename, VISIT_HEAD, tasks.map((t) => visitRow(db, t)), "Visit Report");
}

export function exportEmployeesCsv(db: DB, employees: Employee[], filename = "inspector-tracking-employees.csv") {
  const head = ["Employee ID", "Name", "Designation", "Department", "Phone", "Email", "Status", "Joining Date", "Total Completed Visits"];
  const rows = employees.map((e) => [
    e.id, e.name, e.designation, e.department, e.phone, e.email,
    e.status === "active" ? "Active" : "Inactive", fmtDate(e.joiningDate),
    db.tasks.filter((t) => t.employeeId === e.id && t.status === "verified").length,
  ]);
  downloadCsv(filename, head, rows, "Employee Register");
}

export function exportLocationsCsv(db: DB, locations: VisitLocation[], filename = "inspector-tracking-locations.csv") {
  const head = ["Location ID", "Name", "Location Type", "Verification Radius (m)", "Latitude", "Longitude", "Address", "Status", "Total Visits"];
  const rows = locations.map((l) => [
    l.id, l.name, l.type, l.verificationRadius ?? 100, l.lat, l.lng, l.address,
    l.status === "active" ? "Active" : "Inactive",
    db.tasks.filter((t) => t.locationId === l.id).length,
  ]);
  downloadCsv(filename, head, rows, "Location Register");
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
    }),"Location Visit History"
  );
}
