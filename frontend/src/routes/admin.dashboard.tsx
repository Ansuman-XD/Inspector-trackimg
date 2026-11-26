import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, UserCheck, CalendarCheck, CheckCircle2, Hourglass, XCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { useDB } from "@/hooks/useDB";
import { Panel, StatusBadge, EmptyState } from "@/components/rt/common";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { MISSED, taskStats } from "@/services/taskService";
import { addDaysISO, fmtDate, fmtLongDate, greeting, todayISO, fmtWindow, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IMPORTANT_ROW } from "@/lib/status";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Inspector Tracking System" }, { name: "description", content: "Operational overview of field visits." }, { property: "og:title", content: "Dashboard — Inspector Tracking System" }, { property: "og:description", content: "Operational overview of field visits." }] }),
  component: Dashboard,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--popover-foreground)" } };

function Kpi({ label, value, icon: Icon, tone, sub }: { label: string; value: number; icon: typeof Users; tone: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tone)}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const db = useDB();
  const drawer = useTaskDrawer();
  const today = todayISO();
  const todays = db.tasks.filter((t) => t.date === today);
  const s = taskStats(todays);
  const activeEmp = db.employees.filter((e) => e.status === "active");
  const onFieldToday = new Set(todays.map((t) => t.employeeId)).size;

  const donut = useMemo(() => {
    const a = taskStats(db.tasks.filter((t) => t.date <= today && t.date >= addDaysISO(today, -6)));
    return [
      { name: "Verified", value: a.verified, color: "var(--chart-1)" },
      { name: "Pending", value: a.pending, color: "var(--chart-2)" },
      { name: "Not Visited", value: a.missed, color: "var(--chart-3)" },
      { name: "Failed", value: a.failed, color: "var(--chart-5)" },
    ];
  }, [db.tasks, today]);
  const donutTotal = donut.reduce((a, b) => a + b.value, 0);

  const trend = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = addDaysISO(today, i - 6);
    const ts = db.tasks.filter((t) => t.date === d);
    return { day: fmtDate(d).slice(0, 6), Assigned: ts.length, Verified: ts.filter((t) => t.status === "verified").length };
  }), [db.tasks, today]);

  const perEmp = useMemo(() => activeEmp.map((e) => {
    const ts = db.tasks.filter((t) => t.employeeId === e.id && t.date >= addDaysISO(today, -6) && t.date <= today);
    const st = taskStats(ts);
    return { name: e.name.split(" ")[0], Assigned: st.total, Completed: st.verified, Pending: st.pending, Missed: st.missed + st.failed };
  }), [db.tasks, activeEmp, today]);

  const upcoming = [...todays].sort((a, b) => a.startTime.localeCompare(b.startTime));
const coverage = useMemo(() => {
  const m = new Map<string, typeof todays>();
  for (const t of todays) m.set(t.locationId, [...(m.get(t.locationId) ?? []), t]);
  return [...m].map(([id, ts]) => ({
    name: db.locations.find((l) => l.id === id)?.name ?? id,
    total: ts.length,
    done: ts.filter((t) => t.status === "verified").length,
  })).sort((a, b) => b.total - a.total);
}, [todays, db.locations]);
  return (
    <div>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Admin</h1>
          <p className="text-sm text-muted-foreground">{fmtLongDate()} · Field operations overview</p>
        </div>
        <Link to="/admin/tasks" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Assign Visit<ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Total Employees" value={db.employees.length} icon={Users} tone="bg-secondary text-secondary-foreground" sub={`${db.employees.length - activeEmp.length} inactive`} />
        <Kpi label="Active Employees" value={activeEmp.length} icon={UserCheck} tone="bg-info/10 text-info" sub={`${onFieldToday} on field today`} />
        <Kpi label="Today's Visits" value={s.total} icon={CalendarCheck} tone="bg-accent text-accent-foreground" />
        <Kpi label="Completed Visits" value={s.verified} icon={CheckCircle2} tone="bg-success/12 text-success" sub={s.total ? `${Math.round((s.verified / s.total) * 100)}% of today` : undefined} />
        <Kpi label="Pending Visits" value={s.pending} icon={Hourglass} tone="bg-warning/15 text-warning-foreground dark:text-warning" />
        <Kpi label="Not Visited" value={s.missed} icon={XCircle} tone="bg-danger/10 text-danger" />
        <Kpi label="Verification Failed" value={s.failed} icon={ShieldAlert} tone="bg-danger/10 text-danger" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Visit Status · last 7 days">
          {donutTotal === 0 ? <EmptyState title="No visits in this period" /> : (
            <div className="flex items-center gap-4">
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer><PieChart><Pie data={donut} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">{donut.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold tabular">{donutTotal}</span><span className="text-xs text-muted-foreground">visits</span></div>
              </div>
              <ul className="flex-1 space-y-2.5 text-sm">
                {donut.map((d) => (
                  <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} /><span className="flex-1 text-muted-foreground">{d.name}</span><span className="font-semibold tabular">{d.value}</span><span className="w-10 text-right text-xs text-muted-foreground tabular">{Math.round((d.value / donutTotal) * 100)}%</span></li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
        <Panel title="Daily Visit Trend" className="xl:col-span-2">
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Assigned" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="Verified" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Employee Activity · last 7 days">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={perEmp} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Assigned" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Completed" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Pending" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Missed" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title={`Today's Schedule · ${fmtDate(today)}`} className="mt-4" bodyClass="p-0" action={<Link to="/admin/monitoring" className="text-xs font-medium text-primary hover:underline">Open monitoring</Link>}>
        {upcoming.length === 0 ? <EmptyState title="No visits scheduled today" action={<Link to="/admin/tasks" className="text-sm font-medium text-primary">Assign a visit</Link>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Time</th><th className="px-4 py-2 font-medium">Employee</th><th className="px-4 py-2 font-medium">Location</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Check-In</th><th className="px-4 py-2 font-medium">Check-Out</th></tr></thead>
              <tbody>
                {upcoming.map((t) => (
                  <tr key={t.id} onClick={() => drawer.open(t.id)} className={cn("cursor-pointer border-t hover:bg-muted/40", MISSED.includes(t.status) && "opacity-80", t.important && IMPORTANT_ROW)}>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtWindow(t)}</td>
                    <td className="px-4 py-2.5">{db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId}</td>
                    <td className="px-4 py-2.5">{db.locations.find((l) => l.id === t.locationId)?.name}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtTime(t.checkIn?.at)}</td>
<td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtTime(t.checkOut?.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Location Coverage · today" className="mt-4" bodyClass="p-0">
  {coverage.length === 0 ? <EmptyState title="No locations scheduled today" /> : (
    <ul className="divide-y">
      {coverage.map((c) => (
        <li key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="font-medium">{c.name}</span>
          <span className="text-muted-foreground tabular">{c.done}/{c.total} inspectors completed</span>
        </li>
      ))}
    </ul>
  )}
</Panel>
    </div>
  );
}
