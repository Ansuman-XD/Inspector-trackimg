/**
 * Official-format PDF reports for the Inspector Tracking System.
 * Used by: Employee > My Visits > Download Report, and
 *          Admin > Employees > Download Work History.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DB, Employee, Task, VisitStage } from "@/types";
import { fmtDate, fmtDateTime, fmtWindow, fmtTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { isSelfPlanned } from "@/lib/visitRules";
import type { ReportingRow } from "@/services/reportService";

type RGB = [number, number, number];
const NAVY: RGB = [15, 35, 75];
const MAROON: RGB = [143, 29, 36];
const INK: RGB = [25, 25, 25];
const GREY: RGB = [105, 105, 105];
const LINE: RGB = [150, 150, 150];
const TINT: RGB = [236, 239, 246];

const PW = 210;
const M = 14;
const CW = PW - M * 2; // 182 mm usable width

const CERT =
  "Certified that the visit entries in this report have been recorded through the Inspector Tracking System. " +
  "Each check-in and check-out is validated by GPS proximity to the assigned location and supported by " +
  "photographic evidence captured at the site. Entries marked 'Admin override' were authorised by the " +
  "Administrator with a recorded justification. This is a computer-generated report.";

const endY = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;

const gridBase = {
  theme: "grid" as const,
  styles: {
    font: "helvetica",
    fontSize: 8.5,
    cellPadding: 2,
    lineColor: LINE,
    lineWidth: 0.2,
    textColor: INK,
    valign: "middle" as const,
  },
  margin: { left: M, right: M, top: 20, bottom: 20 },
};

function section(doc: jsPDF, title: string, y: number): number {
  if (y > 255) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...NAVY);
  doc.rect(M, y, CW, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), M + 3, y + 4.6);
  doc.setTextColor(...INK);
  return y + 6.5;
}

function header(doc: jsPDF, title: string, ref: string, generated: string): number {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.text("RESEARCH DESIGNS & STANDARDS ORGANISATION", PW / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(...MAROON);
  doc.text("KOLKATA BRANCH OFFICE · KOILAGHAT STREET, KOLKATA – 700 001", PW / 2, 24, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("Inspector Tracking System - Field Visit Management", PW / 2, 29, { align: "center" });

  // double rule
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, 32, PW - M, 32);
  doc.setLineWidth(0.2);
  doc.line(M, 33.4, PW - M, 33.4);

  // title, underlined
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(title, PW / 2, 42, { align: "center" });
  const w = doc.getTextWidth(title);
  doc.setLineWidth(0.4);
  doc.setDrawColor(...INK);
  doc.line(PW / 2 - w / 2, 43.8, PW / 2 + w / 2, 43.8);

  // reference line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(`Report No.: ${ref}`, M, 50);
  doc.text(`Date of Generation: ${generated}`, PW - M, 50, { align: "right" });
  return 54;
}

const stageText = (s?: VisitStage) =>
  !s ? "-" : [fmtDateTime(s.at), s.override ? "Admin override" : "GPS verified", s.photo ? "Photo: Yes" : "Photo: No"].join("\n");

const stageDist = (s?: VisitStage) =>
  !s ? "-" : s.override ? "Override" : s.distance != null ? `${Math.round(s.distance)} m` : "Verified";

function signatures(doc: jsPDF, y: number) {
  if (y > 205) {
    doc.addPage();
    y = 22;
  }
  y = section(doc, "Certification", y + 2);
  const lines = doc.splitTextToSize(CERT, CW - 6) as string[];
  const h = lines.length * 4 + 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(lines, M + 3, y + 5);
  y += h + 24;

  const w = 70;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + w, y);
  doc.line(PW - M - w, y, PW - M, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Signature of Inspector", M + w / 2, y + 4.5, { align: "center" });
  doc.text("Countersigned by Divisional Officer", PW - M - w / 2, y + 4.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text("Name, Designation & Date", M + w / 2, y + 8.5, { align: "center" });
  doc.text("Name, Designation, Seal & Date", PW - M - w / 2, y + 8.5, { align: "center" });
}

function finalize(doc: jsPDF, ref: string, filename: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.rect(7, 7, 196, 283);
    doc.setLineWidth(0.2);
    doc.rect(8.6, 8.6, 192.8, 279.8);
    doc.setDrawColor(...LINE);
    doc.line(M, 281, PW - M, 281);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(`Ref: ${ref}`, M, 285.5);
    doc.text("Computer generated report - Inspector Tracking System", PW / 2, 285.5, { align: "center" });
    doc.text(`Page ${i} of ${pages}`, PW - M, 285.5, { align: "right" });
  }
  doc.save(filename);
}

function buildReport(o: {
  title: string;
  prefix: string;
  db: DB;
  employee: Employee;
  tasks: Task[];
  from: string;
  to: string;
  filename: string;
}) {
  const { db, employee, tasks, from, to } = o;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const ref = `${o.prefix}/${employee.id}/${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  let y = header(doc, o.title, ref, fmtDateTime(now.toISOString()));

  // 1. Particulars
  y = section(doc, "Particulars of Inspector", y);
  autoTable(doc, {
    ...gridBase,
    startY: y,
    body: [
      ["Name", employee.name, "Employee ID", employee.id],
      ["Department", employee.department, "Designation", employee.designation],
      ["Phone", employee.phone, "Email", employee.email],
      ["Joining Date", fmtDate(employee.joiningDate), "Status", employee.status === "active" ? "Active" : "Inactive"],
    ],
    columnStyles: {
      0: { cellWidth: 28, fillColor: TINT, fontStyle: "bold" },
      1: { cellWidth: 63 },
      2: { cellWidth: 28, fillColor: TINT, fontStyle: "bold" },
      3: { cellWidth: 63 },
    },
  });
  y = endY(doc) + 6;

  // 2. Summary
  const completed = tasks.filter((t) => t.status === "verified").length;
  const pending = tasks.filter((t) => ["assigned", "pending", "in_progress", "location_reached", "checked_in"].includes(t.status)).length;
  const missed = tasks.filter((t) => ["not_visited", "expired"].includes(t.status)).length;
  const failed = tasks.filter((t) => t.status === "verification_failed").length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const period = from || to ? `${from ? fmtDate(from) : "Beginning"} to ${to ? fmtDate(to) : "Date"}` : "All Time";

  y = section(doc, `Summary of Visits - ${period}`, y);
  autoTable(doc, {
    ...gridBase,
    startY: y,
    head: [["Total Visits", "Completed", "Pending", "Missed / Expired", "GPS Failed", "Completion"]],
    body: [[String(tasks.length), String(completed), String(pending), String(missed), String(failed), `${rate}%`]],
    headStyles: { fillColor: TINT, textColor: NAVY, fontStyle: "bold", halign: "center", fontSize: 8 },
    bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 11, cellPadding: 3 },
  });
  y = endY(doc) + 6;

  // 3. Visit register
  y = section(doc, "Visit Register", y);
  autoTable(doc, {
    ...gridBase,
    startY: y,
    styles: { ...gridBase.styles, fontSize: 7.5, cellPadding: 1.8 },
    head: [["Sr.", "Date & Window", "Location / Visit ID", "Planned By", "Check-In", "Check-Out", "Distance (In / Out)", "Status"]],
    body:
      tasks.length === 0
        ? [["-", "-", "No visits recorded in this period", "-", "-", "-", "-", "-"]]
        : tasks.map((t, i) => [
            String(i + 1),
            `${fmtDate(t.date)}\n${fmtWindow(t)}`,
            `${db.locations.find((l) => l.id === t.locationId)?.name ?? t.locationId}\n${t.id}`,
            isSelfPlanned(t) ? "Self" : "Admin",
            stageText(t.checkIn),
            stageText(t.checkOut),
            `In: ${stageDist(t.checkIn)}\nOut: ${stageDist(t.checkOut)}`,
            STATUS_META[t.status]?.label ?? t.status,
          ]),
    headStyles: { fillColor: TINT, textColor: NAVY, fontStyle: "bold", halign: "center", fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 34 },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 26 },
      5: { cellWidth: 26 },
      6: { cellWidth: 26 },
      7: { cellWidth: 26, halign: "center", fontStyle: "bold" },
    },
  });

  signatures(doc, endY(doc) + 4);
  finalize(doc, ref, o.filename);
}

/** Admin > Employees > Download Work History (All Time / date range). */
export function downloadEmployeeWorkHistory(db: DB, employee: Employee, from = "", to = "") {
  const tasks = db.tasks
    .filter((t) => t.employeeId === employee.id && (!from || t.date >= from) && (!to || t.date <= to))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  buildReport({
    title: "EMPLOYEE WORK HISTORY REPORT",
    prefix: "ITS/WH",
    db,
    employee,
    tasks,
    from,
    to,
    filename: `inspector-tracking-work-history-${employee.id.toLowerCase()}.pdf`,
  });
}

/** Employee > My Visits > Download Report. */
export function downloadEmployeeVisitReport(db: DB, employee: Employee, tasks: Task[], from = "", to = "") {
  buildReport({
    title: "INSPECTOR FIELD VISIT REPORT",
    prefix: "ITS/FV",
    db,
    employee,
    tasks,
    from,
    to,
    filename: `inspector-tracking-visit-report-${employee.id.toLowerCase()}.pdf`,
  });
}

/** Admin > Dashboard > Reporting Time download. */
export function downloadReportingTimePdf(rows: ReportingRow[], date: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ref = `ITS/RT/${date.replace(/-/g, "")}`;
  let y = header(doc, "EMPLOYEE REPORTING TIME REPORT", ref, fmtDateTime(new Date().toISOString()));
  y = section(doc, `Reporting Date - ${fmtDate(date)}`, y);
  autoTable(doc, {
    ...gridBase,
    startY: y,
    head: [["Sr.", "Date", "Employee ID", "Name", "Check-In Time"]],
    body: rows.length
      ? rows.map((r, i) => [
          String(i + 1),
          fmtDate(date),
          r.id,
          r.name,
          r.firstCheckIn ? fmtTime(r.firstCheckIn) : "Not reported",
        ])
      : [["-", "-", "-", "No employees found", "-"]],
    headStyles: { fillColor: TINT, textColor: NAVY, fontStyle: "bold", halign: "center", fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      4: { cellWidth: 40, halign: "center", fontStyle: "bold" },
    },
  });
  finalize(doc, ref, `inspector-tracking-reporting-time-${date}.pdf`);
}