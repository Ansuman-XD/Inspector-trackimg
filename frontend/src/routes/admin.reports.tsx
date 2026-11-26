import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Printer, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/rt/common";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { useDB } from "@/hooks/useDB";
import { exportVisitsCsv, filterTasks, type ReportFilters } from "@/services/reportService";
import { taskStats } from "@/services/taskService";
import { ALL_STATUSES, STATUS_META, IMPORTANT_ROW  } from "@/lib/status";
import { fmtDate, fmtDateTime, fmtDistance, todayISO, fmtWindow } from "@/lib/format";
import { BRAND, printFilterSummary } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { GovReportSheet } from "@/components/rt/GovReportSheet";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Inspector Tracking System" }, { name: "description", content: "Visit reports with CSV export and print." }] }),
  component: Reports,
});

const ALL = "__all";
const v = (s: string) => (s === ALL ? "" : s);

const emptyFilters = (): ReportFilters => {
  const today = todayISO();
  return {
    from: today,
    to: today,
    employeeId: "",
    department: "",
    locationId: "",
    status: "",
    planning: "",
    checkInBy: "",
    checkOutBy: "",
    important: "",
  };
};

function Reports() {
  const db = useDB();
  const drawer = useTaskDrawer();
  const [f, setF] = useState<ReportFilters>(emptyFilters);
  const set = (k: keyof ReportFilters) => (val: string) => setF((p) => ({ ...p, [k]: val }));
  const rows = useMemo(() => filterTasks(db, {
    ...f,
    employeeId: v(f.employeeId), department: v(f.department), locationId: v(f.locationId),
    status: v(f.status), planning: v(f.planning), checkInBy: v(f.checkInBy), checkOutBy: v(f.checkOutBy), important: v(f.important),
  }), [db, f]);
  const s = taskStats(rows);
  const rate = s.total ? Math.round((s.verified / s.total) * 100) : 0;
  const summary = printFilterSummary({ ...f, employeeId: v(f.employeeId), department: v(f.department), locationId: v(f.locationId), status: v(f.status), planning: v(f.planning), checkInBy: v(f.checkInBy), checkOutBy: v(f.checkOutBy), important: v(f.important), }, db);
  const filtered = summary !== "No filters applied — all records";

  const reset = () => setF(emptyFilters());
const printReport = () => {
  const prev = document.title;
  document.title = `Field-Visit-Report-${todayISO()}`;
  window.print();
  document.title = prev;
};
  return (
     <>
    <div className="no-print">
      {/* <div className="print-only">
        <div className="border-b-2 border-primary pb-2 mb-3">
          <h1 className="text-lg font-bold uppercase tracking-wide">{BRAND}</h1>
          <p className="text-xs">Visit Report · East Coast Railway, Khurda Road Division</p>
          <p className="text-xs">Generated {fmtDateTime(new Date().toISOString())} · Filters: {summary}</p>
        </div>
        <p className="mb-2 text-xs">Executive summary — Total: <b>{s.total}</b> · Completed/Verified: <b>{s.verified}</b> · Open: <b>{s.pending}</b> · Missed/Expired: <b>{s.missed}</b> · Failed: <b>{s.failed}</b> · Completion rate: <b>{rate}%</b></p>
      </div> */}
      <PageHeader title="Reports" subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"} · ${filtered ? "filtered" : "all time"}`} actions={<div className="flex gap-2 no-print">
        <Button variant="outline" onClick={printReport}><Printer className="mr-1.5 h-4 w-4" />Print / Save as PDF</Button>
        <Button onClick={() => { if (!rows.length) { toast.error("No records to export."); return; } exportVisitsCsv(db, rows, `inspector-tracking-visits-${f.from || "all"}_${f.to || "time"}.csv`); toast.success(`${rows.length} records exported.`); }}><Download className="mr-1.5 h-4 w-4" />Download CSV</Button>
        <Button variant="ghost" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Reset Filters</Button>
      </div>} />
      <Panel className="mb-4 no-print">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="text-xs text-foreground font-medium">From Date<Input type="date" value={f.from} onChange={(e) => set("from")(e.target.value)} className="mt-1" /></label>
          <label className="text-xs text-foreground font-medium">To Date<Input type="date" value={f.to} onChange={(e) => set("to")(e.target.value)} className="mt-1" /></label>
          <Sel label="Planning Visit" value={f.planning} onChange={set("planning")} opts={[["self", "Self-Planned (Employee)"], ["admin", "Admin-Assigned"]]} />
          <Sel label="Check-In By" value={f.checkInBy} onChange={set("checkInBy")} opts={[["employee", "Employee"], ["admin", "Admin Override"]]} />
          <Sel label="Check-Out By" value={f.checkOutBy} onChange={set("checkOutBy")} opts={[["employee", "Employee"], ["admin", "Admin Override"]]} />
          <Sel label="Employee" value={f.employeeId} onChange={set("employeeId")} opts={db.employees.map((e) => [e.id, e.name])} />
          <Sel label="Department" value={f.department} onChange={set("department")} opts={db.departments.map((d) => [d.name, d.name])} />
          <Sel label="Location" value={f.locationId} onChange={set("locationId")} opts={db.locations.map((l) => [l.id, l.name])} />
          <Sel label="Status" value={f.status} onChange={set("status")} opts={ALL_STATUSES.map((x) => [x, STATUS_META[x].label])} />
          <Sel label="Importance" value={f.important} onChange={set("important")} opts={[["important", "Important Only"], ["normal", "Normal Only"]]} />
        </div>
      </Panel>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Total visits", s.total], ["Verified", s.verified], ["Open", s.pending], ["Missed", s.missed], ["Completion rate", `${rate}%`]].map(([l, n]) => (
          <div key={l} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-semibold tabular">{n}</p></div>
        ))}
      </div>
      <Panel title="Visit register" bodyClass="p-0">
        {rows.length === 0 ? <EmptyState title="No records for these filters" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Visit ID", "Employee", "Location", "Date", "Window", "Status", "Distance", "Verified at"].map((h) => <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => drawer.open(t.id)} className={cn("cursor-pointer border-t hover:bg-muted/40", t.important && IMPORTANT_ROW)}>
  <td className="px-4 py-2 font-mono text-xs">{t.important && <Star className="mr-1 inline h-3.5 w-3.5 fill-warning text-warning" />}{t.id}</td>
                    <td className="px-4 py-2">{db.employees.find((e) => e.id === t.employeeId)?.name}</td>
                    <td className="px-4 py-2">{db.locations.find((l) => l.id === t.locationId)?.name}</td>
                    <td className="whitespace-nowrap px-4 py-2">{fmtDate(t.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular">{fmtWindow(t)}</td>
                    <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2 tabular">{fmtDistance(t.distanceFromLocation)}</td>
                    <td className="whitespace-nowrap px-4 py-2">{t.verifiedAt ? fmtDateTime(t.verifiedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>

    <div className="print-only">
      <GovReportSheet
        db={db}
        rows={rows}
        filterSummary={summary}
        from={f.from}
        to={f.to}
      />
    </div>
  </>
  );
}

function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[][] }) {
  return (
    <label className="text-xs font-medium text-foreground">
      {label}
      <Select value={value || ALL} onValueChange={onChange}>
        <SelectTrigger className="mt-1 text-foreground data-[placeholder]:text-muted-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {opts.map(([k, n]) => (
            <SelectItem key={k} value={k}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}