/**
 * Branded PDF documents for the Inspector Tracking System.
 * Runs fully in the browser via jsPDF — employee work history (admin) and
 * the employee's own field visit report respect any applied date filters.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DB, Employee, Task } from "@/types";
import { fmtDate, fmtDateTime, fmtTime, fmtWindow } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { isSelfPlanned } from "@/lib/visitRules";

const BRAND = "Inspector Tracking System";
const MAROON: [number, number, number] = [143, 29, 36];
const NAVY: [number, number, number] = [30, 41, 59];

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(BRAND.toUpperCase(), 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title, 14, 19);
  doc.text(subtitle, 196, 19, { align: "right" });
  doc.setTextColor(30, 30, 30);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${BRAND} · East Coast Railway, Khurda Road Division`, 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(text, 14, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  return y;
}

function infoGrid(doc: jsPDF, rows: [string, string][], y: number, cols = 2): number {
  let yy = y;
  const colW = 90;
  rows.forEach(([k, v], i) => {
    const x = 14 + (i % cols) * colW;
    if (i % cols === 0 && i > 0) yy += 6;
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(k, x, yy);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(String(v).slice(0, 45), x + 30, yy);
    doc.setFont("helvetica", "normal");
  });
  return yy + 10;
}

function chip(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFillColor(245, 246, 248);
  doc.roundedRect(x, y, 38, 16, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(value, x + 19, y + 7, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text(label.toUpperCase(), x + 19, y + 13, { align: "center" });
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
}

const stageDetail = (t: Task, stage: "checkIn" | "checkOut") => {
  const s = t[stage];
  if (!s) return "—";
  const parts = [fmtDateTime(s.at)];
  if (s.override) parts.push("By Admin (override)");
  parts.push(s.photo ? "Photo ✓" : "No photo");
  return parts.join("\n");
};

const stageGpsCell = (t: Task, stage: "checkIn" | "checkOut") => {
  const s = t[stage];
  if (!s) return "—";
  const d = s.distance != null ? ` ±${Math.round(s.distance)}m off` : "";
  return (s.override ? "Override" : "GPS verified") + d;
};

function finalize(doc: jsPDF, filename: string) {
  footer(doc);
  doc.save(filename);
}

/** Admin → Employees → Download Work History (respects All-Time / date range). */
export function downloadEmployeeWorkHistory(db: DB, employee: Employee, from = "", to = "") {
  const tasks = db.tasks
    .filter((t) => t.employeeId === employee.id && (!from || t.date >= from) && (!to || t.date <= to))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const completed = tasks.filter((t) => t.status === "verified").length;
  const pending = tasks.filter((t) => ["assigned", "in_progress", "pending", "location_reached", "checked_in"].includes(t.status)).length;
  const missed = tasks.filter((t) => ["not_visited", "expired"].includes(t.status)).length;
  const failed = tasks.filter((t) => t.status === "verification_failed").length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const doc = new jsPDF();
  header(doc, "Employee Work History Report", `Generated ${fmtDateTime(new Date().toISOString())}`);

  let y = sectionTitle(doc, "Employee Profile", 36);
  y = infoGrid(doc, [
    ["Name", employee.name], ["Employee ID", employee.id],
    ["Department", employee.department], ["Designation", employee.designation],
    ["Phone", employee.phone], ["Email", employee.email],
    ["Joining Date", fmtDate(employee.joiningDate)], ["Status", employee.status === "active" ? "Active" : "Inactive"],
  ], y + 4);

  y = sectionTitle(doc, `Visit Summary · ${from ? `${fmtDate(from)} to ${fmtDate(to)}` : "All Time"}`, y);
  chip(doc, "Scheduled", String(tasks.length), 14, y + 2);
  chip(doc, "Completed", String(completed), 56, y + 2);
  chip(doc, "Pending", String(pending), 98, y + 2);
  chip(doc, "Missed/Expired", String(missed), 140, y + 2);
  chip(doc, "GPS Failed", String(failed), 14, y + 21);
  chip(doc, "Completion %", `${rate}%`, 56, y + 21);
  y += 44;

  y = sectionTitle(doc, "Detailed Visit Register", y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Date", "Location", "Window", "Planned By", "Check-In Details", "Check-Out Details", "Status"]],
    body: tasks.length === 0 ? [["—", "No visits in this period", "—", "—", "—", "—", "—"]] : tasks.map((t) => [
      fmtDate(t.date),
      db.locations.find((l) => l.id === t.locationId)?.name ?? t.locationId,
      fmtWindow(t),
      isSelfPlanned(t) ? "Self" : "Admin",
      stageDetail(t, "checkIn"),
      stageDetail(t, "checkOut"),
      STATUS_META[t.status].label,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: MAROON, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: { 4: { cellWidth: 34 }, 5: { cellWidth: 34 } },
    margin: { left: 14, right: 14 },
  });
  finalize(doc, `inspector-tracking-work-history-${employee.id.toLowerCase()}.pdf`);
}

/** Employee PWA → My Visits → Download Report. */
export function downloadEmployeeVisitReport(db: DB, employee: Employee, tasks: Task[], from = "", to = "") {
  const completed = tasks.filter((t) => t.status === "verified").length;
  const checkedIn = tasks.filter((t) => !!t.checkIn).length;
  const missed = tasks.filter((t) => ["not_visited", "expired", "verification_failed"].includes(t.status)).length;
  const doc = new jsPDF();
  header(doc, "Inspector Field Visit Report", `Generated ${fmtDateTime(new Date().toISOString())}`);

  let y = sectionTitle(doc, "Inspector Details", 36);
  y = infoGrid(doc, [
    ["Name", employee.name], ["Employee ID", employee.id],
    ["Department", employee.department], ["Designation", employee.designation],
    ["Phone", employee.phone], ["Email", employee.email],
  ], y + 4);

  y = sectionTitle(doc, `Summary · ${from || to ? `${from ? fmtDate(from) : "…"} to ${to ? fmtDate(to) : "…"}` : "All Time"}`, y);
  chip(doc, "Total Visits", String(tasks.length), 14, y + 2);
  chip(doc, "Checked In", String(checkedIn), 56, y + 2);
  chip(doc, "Completed", String(completed), 98, y + 2);
  chip(doc, "Missed/Failed", String(missed), 140, y + 2);
  y += 30;

  y = sectionTitle(doc, "Visit Log (chronological)", y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Date", "Location", "Check-In", "Check-Out", "GPS Compliance", "Photos", "Status"]],
    body: tasks.length === 0 ? [["—", "No visits in this period", "—", "—", "—", "—", "—"]] : tasks.map((t) => [
      fmtDate(t.date),
      db.locations.find((l) => l.id === t.locationId)?.name ?? t.locationId,
      t.checkIn ? fmtTime(t.checkIn.at) : "—",
      t.checkOut ? fmtTime(t.checkOut.at) : "—",
      `${stageGpsCell(t, "checkIn")}\n${stageGpsCell(t, "checkOut")}`,
      `${t.checkIn?.photo ? "In ✓" : "In ✗"} / ${t.checkOut?.photo ? "Out ✓" : "Out ✗"}`,
      STATUS_META[t.status].label,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: MAROON, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 14, right: 14 },
  });
  finalize(doc, `inspector-tracking-visit-report-${employee.id.toLowerCase()}.pdf`);
}
