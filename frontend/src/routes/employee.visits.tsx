import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, RotateCcw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/rt/common";
import { EmployeeTaskCard } from "@/components/rt/EmployeeTaskCard";
import { useEmployeeSession } from "@/components/rt/employeeContext";
import { useDB } from "@/hooks/useDB";
import { MISSED, taskStats } from "@/services/taskService";
import { downloadEmployeeVisitReport } from "@/lib/pdf";
import { taskDateTime, todayISO } from "@/lib/format";
import { effEnd } from "@/lib/visitRules";
import { exportVisitsCsv } from "@/services/reportService";

export const Route = createFileRoute("/employee/visits")({
  head: () => ({ meta: [{ title: "My Visits — Inspector Tracking System" }, { name: "description", content: "History of completed and missed visits." }] }),
  component: Visits,
});

function Visits() {
  const db = useDB();
  const { session } = useEmployeeSession();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const employee = db.employees.find((e) => e.id === session.userId);
  const past = useMemo(() => {
    const now = new Date();
    const today = todayISO(now);

    return db.tasks
      .filter((t) => {
        if (t.employeeId !== session.userId) return false;
        if (t.status === "verified" || MISSED.includes(t.status)) return true;
        // Treat visits whose date or scheduled window has passed as past/missed visits
        if (t.date < today) return true;
        if (t.date === today) {
          const end = taskDateTime(t.date, effEnd(t));
          return end < now;
        }
        return false;
      })
      .filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [db.tasks, session.userId, from, to]);

  const s = useMemo(() => taskStats(past), [past]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Visits</h1>
        {employee && (
  <div className="flex gap-2">
    <Button size="sm" variant="outline" onClick={() => downloadEmployeeVisitReport(db, employee, past, from, to)} disabled={past.length === 0}>
      <Download className="mr-1.5 h-4 w-4" />PDF
    </Button>
    <Button size="sm" variant="outline" onClick={() => exportVisitsCsv(db, past, `inspector-tracking-my-visits-${employee.id.toLowerCase()}.xlsx`)} disabled={past.length === 0}>
      <FileSpreadsheet className="mr-1.5 h-4 w-4" />Excel
    </Button>
  </div>
)}
      </div>
     {/* Filter bar */}
<div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] space-y-3">
  {/* Row 1: From date + To date */}
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground" htmlFor="visits-from">
        From date
      </label>
      <Input
        id="visits-from"
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="w-full bg-background"
      />
    </div>
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground" htmlFor="visits-to">
        To date
      </label>
      <Input
        id="visits-to"
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-full bg-background"
      />
    </div>
  </div>

  {/* Row 2: Reset button */}
  {/* Row 2: Reset button */}
<div>
  <Button
    size="sm"
    variant="outline"
    className="w-full h-9"
    onClick={() => {
      setFrom("");
      setTo("");
    }}
    disabled={!from && !to}
  >
    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
    Reset
  </Button>
</div>
</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-card p-3"><p className="text-2xl font-semibold tabular">{s.verified}</p><p className="text-xs text-muted-foreground">Verified</p></div>
        <div className="rounded-lg border bg-card p-3"><p className="text-2xl font-semibold tabular">{s.missed}</p><p className="text-xs text-muted-foreground">Missed</p></div>
      </div>
      {past.length === 0 ? <EmptyState title="No visit history yet" text={from || to ? "No visits in this date range." : "Completed and missed visits appear here."} /> : <div className="space-y-2">{past.map((t) => <EmployeeTaskCard key={t.id} task={t} location={db.locations.find((l) => l.id === t.locationId)} />)}</div>}
    </div>
  );
}
