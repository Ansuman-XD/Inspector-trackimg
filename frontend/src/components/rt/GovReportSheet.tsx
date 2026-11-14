import type { DB, Task } from "@/types";
import { fmtDate, fmtDateTime, fmtTime, fmtWindow } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { taskStats } from "@/services/taskService";

interface Props {
  db: DB;
  rows: Task[];
  filterSummary: string;
  from: string;
  to: string;
}

/** Print-only statement in the style of an Indian Railways office report. No logo. */
export function GovReportSheet({ db, rows, filterSummary, from, to }: Props) {
  const s = taskStats(rows);
  const imp = rows.filter((t) => t.important).length;
  const rate = s.total ? Math.round((s.verified / s.total) * 100) : 0;
  const now = new Date();
  const ref = `ITS/FVR/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(rows.length).padStart(3, "0")}`;
  const period = from || to ? `${from ? fmtDate(from) : "Beginning"} to ${to ? fmtDate(to) : "Date"}` : "All records on file";

  const remarks = (t: Task) =>
    [t.important && "IMPORTANT", (t.checkIn?.override || t.checkOut?.override) && "Admin override", t.createdBy === t.employeeId && "Self-planned"]
      .filter(Boolean).join("; ") || "—";

  return (
    <div className="gov-report">
      <div className="gov-border" />

      <div className="gov-head">
        <p className="gov-hi">भारत सरकार · रेल मंत्रालय</p>
        <p className="gov-en">GOVERNMENT OF INDIA · MINISTRY OF RAILWAYS</p>
        <p className="gov-zone">EAST COAST RAILWAY · KHURDA ROAD DIVISION</p>
      </div>
      <div className="gov-rule" />

      <div className="gov-meta">
        <span>No.: <b>{ref}</b></span>
        <span>Date: <b>{fmtDate(now.toISOString())}</b></span>
      </div>

      <h1 className="gov-title">FIELD VISIT INSPECTION REPORT</h1>
      <p className="gov-subject"><b>Subject:</b> Statement of field inspection visits assigned to and performed by inspectors, with GPS and photographic verification status.</p>

      <h2 className="gov-h2">1. Particulars of the Report</h2>
      <table className="gov-kv">
        <tbody>
          <tr><th>Period covered</th><td>{period}</td></tr>
          <tr><th>Filters applied</th><td>{filterSummary}</td></tr>
          <tr><th>Records in statement</th><td>{rows.length}</td></tr>
          <tr><th>Generated on (IST)</th><td>{fmtDateTime(now.toISOString())}</td></tr>
        </tbody>
      </table>

      <h2 className="gov-h2">2. Summary Statement</h2>
      <table>
        <thead>
          <tr><th>Total Visits</th><th>Completed</th><th>Open / Pending</th><th>Missed / Expired</th><th>GPS Verification Failed</th><th>Important Visits</th><th>Completion Rate</th></tr>
        </thead>
        <tbody>
          <tr className="gov-center"><td>{s.total}</td><td>{s.verified}</td><td>{s.pending}</td><td>{s.missed}</td><td>{s.failed}</td><td>{imp}</td><td>{rate}%</td></tr>
        </tbody>
      </table>

      <h2 className="gov-h2">3. Detailed Statement of Visits</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "4%" }}>Sl. No.</th><th>Visit ID</th><th>Inspector (ID)</th><th>Department</th><th>Location</th>
            <th>Date</th><th>Window</th><th>Priority</th><th>Status</th><th>Check-In</th><th>Check-Out</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={12} className="gov-center">No records found for the selected criteria.</td></tr>}
          {rows.map((t, i) => {
            const e = db.employees.find((x) => x.id === t.employeeId);
            return (
              <tr key={t.id} className={t.important ? "gov-imp" : undefined}>
                <td className="gov-center">{i + 1}</td>
                <td>{t.id}</td>
                <td>{e?.name ?? t.employeeId} ({t.employeeId})</td>
                <td>{e?.department ?? "—"}</td>
                <td>{db.locations.find((l) => l.id === t.locationId)?.name ?? t.locationId}</td>
                <td>{fmtDate(t.date)}</td>
                <td>{fmtWindow(t)}</td>
                <td className="gov-center" style={{ textTransform: "capitalize" }}>{t.priority}</td>
                <td>{STATUS_META[t.status]?.label ?? t.status}</td>
                <td>{t.checkIn ? fmtTime(t.checkIn.at) : "—"}</td>
                <td>{t.checkOut ? fmtTime(t.checkOut.at) : "—"}</td>
                <td>{remarks(t)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="gov-note">Rows shaded and marked “IMPORTANT” are visits flagged by the Administrator; their photographic evidence is retained for 30 days instead of 7 days.</p>

      <p className="gov-cert">Certified that the particulars given above are correct as per the records maintained in the Inspector Tracking System.</p>

      <div className="gov-sign">
        <div><span>Prepared by</span><small>(Name &amp; Designation)</small></div>
        <div><span>Checked by</span><small>(Name &amp; Designation)</small></div>
        <div><span>Approved by</span><small>(Name &amp; Designation)</small></div>
      </div>
      <p className="gov-foot">This is a computer-generated statement from the Inspector Tracking System and is valid for official use only when signed by the competent authority.</p>
    </div>
  );
}