import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/rt/common";
import { EmployeeTaskCard } from "@/components/rt/EmployeeTaskCard";
import { useEmployeeSession } from "@/components/rt/employeeContext";
import { useDB } from "@/hooks/useDB";
import { OPEN, taskStats } from "@/services/taskService";
import { fmtLongDate, greeting, todayISO } from "@/lib/format";

export const Route = createFileRoute("/employee/dashboard")({
  head: () => ({ meta: [{ title: "Home — Inspector Tracking System" }, { name: "description", content: "Today's assigned field visits." }] }),
  component: EmpHome,
});

function EmpHome() {
  const db = useDB();
  const { session } = useEmployeeSession();
  const today = todayISO();
  const mine = db.tasks.filter((t) => t.employeeId === session.userId);
  const todays = mine.filter((t) => t.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const s = taskStats(todays);
  const next = todays.find((t) => OPEN.includes(t.status));
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">{greeting()}, {session.name.split(" ")[0]}</h1><p className="text-sm text-muted-foreground">{fmtLongDate()}</p></div>
      <div className="grid grid-cols-3 gap-2">
        {[["Today", s.total], ["Done", s.verified], ["Open", s.pending + s.failed]].map(([l, n]) => (
          <div key={l} className="rounded-lg border bg-card p-3 text-center"><p className="text-2xl font-semibold tabular">{n}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </div>
      {next && (<div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Up next</p><EmployeeTaskCard task={next} location={db.locations.find((l) => l.id === next.locationId)} /></div>)}
      <div>
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's visits</p><Link to="/employee/tasks" className="text-xs text-primary">All tasks</Link></div>
        {todays.length === 0 ? <EmptyState title="No visits today" text="New assignments will appear here." /> : (
          <div className="space-y-2">{todays.map((t) => <EmployeeTaskCard key={t.id} task={t} location={db.locations.find((l) => l.id === t.locationId)} />)}</div>
        )}
      </div>
    </div>
  );
}
