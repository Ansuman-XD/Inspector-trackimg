// import { createFileRoute, Link } from "@tanstack/react-router";
// import { useMemo } from "react";
// import { Users, UserCheck, CalendarCheck, CheckCircle2, Hourglass, XCircle, ShieldAlert, ArrowRight } from "lucide-react";
// import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from "recharts";
// import { useDB } from "@/hooks/useDB";
// import { Panel, StatusBadge, EmptyState } from "@/components/rt/common";
// import { useTaskDrawer } from "@/components/rt/drawerContext";
// import { MISSED, taskStats } from "@/services/taskService";
// import { addDaysISO, fmtDate, fmtLongDate, greeting, todayISO, fmtWindow, fmtTime } from "@/lib/format";
// import { cn } from "@/lib/utils";
// import { IMPORTANT_ROW } from "@/lib/status";

// export const Route = createFileRoute("/admin/dashboard")({
//   head: () => ({ meta: [{ title: "Dashboard — Inspector Tracking System" }, { name: "description", content: "Operational overview of field visits." }, { property: "og:title", content: "Dashboard — Inspector Tracking System" }, { property: "og:description", content: "Operational overview of field visits." }] }),
//   component: Dashboard,
// });

// const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--popover-foreground)" } };

// function Kpi({ label, value, icon: Icon, tone, sub }: { label: string; value: number; icon: typeof Users; tone: string; sub?: string }) {
//   return (
//     <div className="rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]">
//       <div className="flex items-center justify-between">
//         <span className="text-xs font-medium text-muted-foreground">{label}</span>
//         <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tone)}><Icon className="h-3.5 w-3.5" /></span>
//       </div>
//       <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular">{value}</div>
//       {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
//     </div>
//   );
// }

// function Dashboard() {
//   const db = useDB();
//   const drawer = useTaskDrawer();
//   const today = todayISO();
//   const todays = db.tasks.filter((t) => t.date === today);
//   const s = taskStats(todays);
//   const activeEmp = db.employees.filter((e) => e.status === "active");
//   const onFieldToday = new Set(todays.map((t) => t.employeeId)).size;

//   const donut = useMemo(() => {
//     const a = taskStats(db.tasks.filter((t) => t.date <= today && t.date >= addDaysISO(today, -6)));
//     return [
//       { name: "Verified", value: a.verified, color: "var(--chart-1)" },
//       { name: "Pending", value: a.pending, color: "var(--chart-2)" },
//       { name: "Not Visited", value: a.missed, color: "var(--chart-3)" },
//       { name: "Failed", value: a.failed, color: "var(--chart-5)" },
//     ];
//   }, [db.tasks, today]);
//   const donutTotal = donut.reduce((a, b) => a + b.value, 0);

//   const trend = useMemo(() => Array.from({ length: 7 }, (_, i) => {
//     const d = addDaysISO(today, i - 6);
//     const ts = db.tasks.filter((t) => t.date === d);
//     return { day: fmtDate(d).slice(0, 6), Assigned: ts.length, Verified: ts.filter((t) => t.status === "verified").length };
//   }), [db.tasks, today]);

//   const perEmp = useMemo(() => activeEmp.map((e) => {
//     const ts = db.tasks.filter((t) => t.employeeId === e.id && t.date >= addDaysISO(today, -6) && t.date <= today);
//     const st = taskStats(ts);
//     return { name: e.name.split(" ")[0], Assigned: st.total, Completed: st.verified, Pending: st.pending, Missed: st.missed + st.failed };
//   }), [db.tasks, activeEmp, today]);

//   const upcoming = [...todays].sort((a, b) => a.startTime.localeCompare(b.startTime));
// const coverage = useMemo(() => {
//   const m = new Map<string, typeof todays>();
//   for (const t of todays) m.set(t.locationId, [...(m.get(t.locationId) ?? []), t]);
//   return [...m].map(([id, ts]) => ({
//     name: db.locations.find((l) => l.id === id)?.name ?? id,
//     total: ts.length,
//     done: ts.filter((t) => t.status === "verified").length,
//   })).sort((a, b) => b.total - a.total);
// }, [todays, db.locations]);
//   return (
//     <div>
//       <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Admin</h1>
//           <p className="text-sm text-muted-foreground">{fmtLongDate()} · Field operations overview</p>
//         </div>
//         <Link to="/admin/tasks" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Assign Visit<ArrowRight className="h-4 w-4" /></Link>
//       </div>

//       <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
//         <Kpi label="Total Employees" value={db.employees.length} icon={Users} tone="bg-secondary text-secondary-foreground" sub={`${db.employees.length - activeEmp.length} inactive`} />
//         <Kpi label="Active Employees" value={activeEmp.length} icon={UserCheck} tone="bg-info/10 text-info" sub={`${onFieldToday} on field today`} />
//         <Kpi label="Today's Visits" value={s.total} icon={CalendarCheck} tone="bg-accent text-accent-foreground" />
//         <Kpi label="Completed Visits" value={s.verified} icon={CheckCircle2} tone="bg-success/12 text-success" sub={s.total ? `${Math.round((s.verified / s.total) * 100)}% of today` : undefined} />
//         <Kpi label="Pending Visits" value={s.pending} icon={Hourglass} tone="bg-warning/15 text-warning-foreground dark:text-warning" />
//         <Kpi label="Not Visited" value={s.missed} icon={XCircle} tone="bg-danger/10 text-danger" />
//         <Kpi label="Verification Failed" value={s.failed} icon={ShieldAlert} tone="bg-danger/10 text-danger" />
//       </div>

//       <div className="mt-4 grid gap-4 xl:grid-cols-3">
//         <Panel title="Visit Status · last 7 days">
//           {donutTotal === 0 ? <EmptyState title="No visits in this period" /> : (
//             <div className="flex items-center gap-4">
//               <div className="relative h-48 w-48 shrink-0">
//                 <ResponsiveContainer><PieChart><Pie data={donut} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">{donut.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
//                 <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold tabular">{donutTotal}</span><span className="text-xs text-muted-foreground">visits</span></div>
//               </div>
//               <ul className="flex-1 space-y-2.5 text-sm">
//                 {donut.map((d) => (
//                   <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} /><span className="flex-1 text-muted-foreground">{d.name}</span><span className="font-semibold tabular">{d.value}</span><span className="w-10 text-right text-xs text-muted-foreground tabular">{Math.round((d.value / donutTotal) * 100)}%</span></li>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </Panel>
//         <Panel title="Daily Visit Trend" className="xl:col-span-2">
//           <div className="h-48">
//             <ResponsiveContainer>
//               <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
//                 <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
//                 <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
//                 <Tooltip {...tip} />
//                 <Legend wrapperStyle={{ fontSize: 12 }} />
//                 <Area type="monotone" dataKey="Assigned" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.12} strokeWidth={2} />
//                 <Area type="monotone" dataKey="Verified" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </Panel>
//       </div>

//       <div className="mt-4">
//         <Panel title="Employee Activity · last 7 days">
//           <div className="h-64">
//             <ResponsiveContainer>
//               <BarChart data={perEmp} margin={{ left: -20, right: 8, top: 8 }}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
//                 <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
//                 <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
//                 <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
//                 <Legend wrapperStyle={{ fontSize: 12 }} />
//                 <Bar dataKey="Assigned" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
//                 <Bar dataKey="Completed" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
//                 <Bar dataKey="Pending" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
//                 <Bar dataKey="Missed" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </Panel>
//       </div>

//       <Panel title={`Today's Schedule · ${fmtDate(today)}`} className="mt-4" bodyClass="p-0" action={<Link to="/admin/monitoring" className="text-xs font-medium text-primary hover:underline">Open monitoring</Link>}>
//         {upcoming.length === 0 ? <EmptyState title="No visits scheduled today" action={<Link to="/admin/tasks" className="text-sm font-medium text-primary">Assign a visit</Link>} /> : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Time</th><th className="px-4 py-2 font-medium">Employee</th><th className="px-4 py-2 font-medium">Location</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Check-In</th><th className="px-4 py-2 font-medium">Check-Out</th></tr></thead>
//               <tbody>
//                 {upcoming.map((t) => (
//                   <tr key={t.id} onClick={() => drawer.open(t.id)} className={cn("cursor-pointer border-t hover:bg-muted/40", MISSED.includes(t.status) && "opacity-80", t.important && IMPORTANT_ROW)}>
//                     <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtWindow(t)}</td>
//                     <td className="px-4 py-2.5">{db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId}</td>
//                     <td className="px-4 py-2.5">{db.locations.find((l) => l.id === t.locationId)?.name}</td>
//                     <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
//                     <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtTime(t.checkIn?.at)}</td>
// <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtTime(t.checkOut?.at)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </Panel>
//       <Panel title="Location Coverage · today" className="mt-4" bodyClass="p-0">
//   {coverage.length === 0 ? <EmptyState title="No locations scheduled today" /> : (
//     <ul className="divide-y">
//       {coverage.map((c) => (
//         <li key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
//           <span className="font-medium">{c.name}</span>
//           <span className="text-muted-foreground tabular">{c.done}/{c.total} inspectors completed</span>
//         </li>
//       ))}
//     </ul>
//   )}
// </Panel>
//     </div>
//   );
// }

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  CalendarCheck,
  CheckCircle2,
  Hourglass,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Search,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useDB } from "@/hooks/useDB";
import { Panel, StatusBadge, EmptyState } from "@/components/rt/common";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MISSED, taskStats } from "@/services/taskService";
import {
  addDaysISO,
  fmtDate,
  fmtLongDate,
  greeting,
  todayISO,
  fmtWindow,
  fmtTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { IMPORTANT_ROW } from "@/lib/status";
import type { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { reportingTimes, exportReportingExcel } from "@/services/reportService";
import { downloadReportingTimePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Inspector Tracking System" },
      { name: "description", content: "Operational overview of field visits." },
      { property: "og:title", content: "Dashboard — Inspector Tracking System" },
      { property: "og:description", content: "Operational overview of field visits." },
    ],
  }),
  component: Dashboard,
});

const tip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--popover-foreground)",
  },
};

/* ---------- period switch ---------- */
type Period = "daily" | "weekly" | "monthly";
const PERIODS: { key: Period; label: string; days: number; desc: string }[] = [
  { key: "daily", label: "Daily", days: 1, desc: "Today" },
  { key: "weekly", label: "Weekly", days: 7, desc: "Last 7 days" },
  { key: "monthly", label: "Monthly", days: 30, desc: "Last 30 days" },
];

/* ---------- status groups (same definitions as taskStats) ---------- */
const PENDING: TaskStatus[] = [
  "assigned",
  "pending",
  "in_progress",
  "location_reached",
  "checked_in",
];
const GROUPS: Record<string, TaskStatus[]> = {
  verified: ["verified"],
  pending: PENDING,
  missed: MISSED,
  failed: ["verification_failed"],
};

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  sub,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
  sub?: string;
  onClick?: () => void;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card p-4 text-left shadow-[var(--shadow-card)]",
        onClick && "cursor-pointer transition hover:border-primary/50 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
    </Comp>
  );
}

function Dashboard() {
  const db = useDB();
  const drawer = useTaskDrawer();
  const navigate = useNavigate();
  const today = todayISO();
  const [rtDate, setRtDate] = useState(today);
  const rtRows = useMemo(() => reportingTimes(db, rtDate || today), [db, rtDate, today]);
  const [period, setPeriod] = useState<Period>("daily"); // default = daily
  const [drill, setDrill] = useState<{ title: string; tasks: Task[] } | null>(null);
  const [empQ, setEmpQ] = useState("");
  const [empSort, setEmpSort] = useState<"total" | "name" | "missed">("total");
  const [hideIdle, setHideIdle] = useState(false);

  const meta = PERIODS.find((p) => p.key === period)!;
  const from = addDaysISO(today, -(meta.days - 1));

  /** Every card/chart/table below reads from this list. */
  const inRange = useMemo(
    () => db.tasks.filter((t) => t.date >= from && t.date <= today),
    [db.tasks, from, today],
  );
  const s = taskStats(inRange);

  const activeEmp = db.employees.filter((e) => e.status === "active" && e.role !== "admin");
  const onField = new Set(inRange.map((t) => t.employeeId)).size;

  const sortTasks = (a: Task, b: Task) =>
    (b.date + b.startTime).localeCompare(a.date + a.startTime);
  const openDrill = (title: string, tasks: Task[]) =>
    setDrill({ title, tasks: [...tasks].sort(sortTasks) });
  const openGroup = (label: string, group: string) =>
    openDrill(
      label,
      inRange.filter((t) => GROUPS[group].includes(t.status)),
    );

  /* ---- donut ---- */
  const donut = useMemo(() => {
    const a = taskStats(inRange);
    return [
      { name: "Verified", group: "verified", value: a.verified, color: "var(--chart-1)" },
      { name: "Pending", group: "pending", value: a.pending, color: "var(--chart-2)" },
      { name: "Not Visited", group: "missed", value: a.missed, color: "var(--chart-3)" },
      { name: "Failed", group: "failed", value: a.failed, color: "var(--chart-5)" },
    ];
  }, [inRange]);
  const donutTotal = donut.reduce((a, b) => a + b.value, 0);

  /* ---- trend (7 days for daily/weekly for context, 30 for monthly) ---- */
  const trendDays = period === "monthly" ? 30 : 7;
  const trend = useMemo(
    () =>
      Array.from({ length: trendDays }, (_, i) => {
        const d = addDaysISO(today, i - (trendDays - 1));
        const ts = db.tasks.filter((t) => t.date === d);
        return {
          date: d,
          day: fmtDate(d).slice(0, 6),
          Assigned: ts.length,
          Verified: ts.filter((t) => t.status === "verified").length,
        };
      }),
    [db.tasks, today, trendDays],
  );

  /* ---- per-inspector rows (handles 40+ inspectors) ---- */
  const perEmp = useMemo(() => {
    const q = empQ.trim().toLowerCase();
    let rows = activeEmp.map((e) => {
      const ts = inRange.filter((t) => t.employeeId === e.id);
      const st = taskStats(ts);
      return {
        id: e.id,
        name: e.name,
        tasks: ts,
        total: st.total,
        done: st.verified,
        open: st.pending,
        missed: st.missed + st.failed,
      };
    });
    if (q) rows = rows.filter((r) => (r.name + r.id).toLowerCase().includes(q));
    if (hideIdle) rows = rows.filter((r) => r.total > 0);
    rows.sort((a, b) =>
      empSort === "name"
        ? a.name.localeCompare(b.name)
        : empSort === "missed"
          ? b.missed - a.missed || b.total - a.total
          : b.total - a.total || a.name.localeCompare(b.name),
    );
    return rows;
  }, [activeEmp, inRange, empQ, empSort, hideIdle]);

  /* ---- schedule + coverage ---- */
  const schedule = [...inRange].sort((a, b) =>
    period === "daily" ? a.startTime.localeCompare(b.startTime) : sortTasks(a, b),
  );
  const coverage = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of inRange) m.set(t.locationId, [...(m.get(t.locationId) ?? []), t]);
    return [...m]
      .map(([id, ts]) => ({
        id,
        tasks: ts,
        name: db.locations.find((l) => l.id === id)?.name ?? id,
        total: ts.length,
        done: ts.filter((t) => t.status === "verified").length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [inRange, db.locations]);

  const visitsLabel = period === "daily" ? "Today's Visits" : `Visits · ${meta.desc}`;

  return (
    <div>
      {/* ---------- header + period switch (top right) ---------- */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Admin</h1>
          <p className="text-sm text-muted-foreground">
            {fmtLongDate()} · Field operations overview ·{" "}
            <span className="font-medium text-foreground">{meta.desc}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border bg-muted p-1"
            role="tablist"
            aria-label="Dashboard period"
          >
            {PERIODS.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium transition",
                  period === p.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link
            to="/admin/tasks"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Assign Visit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ---------- KPIs (all clickable) ---------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi
          label="Total Employees"
          value={db.employees.length}
          icon={Users}
          tone="bg-secondary text-secondary-foreground"
          sub={`${db.employees.length - activeEmp.length} inactive`}
          onClick={() => navigate({ to: "/admin/employees" })}
        />
        <Kpi
          label="Active Employees"
          value={activeEmp.length}
          icon={UserCheck}
          tone="bg-info/10 text-info"
          sub={`${onField} on field · ${meta.desc.toLowerCase()}`}
          onClick={() => navigate({ to: "/admin/employees" })}
        />
        <Kpi
          label={visitsLabel}
          value={s.total}
          icon={CalendarCheck}
          tone="bg-accent text-accent-foreground"
          onClick={() => openDrill(`All visits · ${meta.desc}`, inRange)}
        />
        <Kpi
          label="Completed Visits"
          value={s.verified}
          icon={CheckCircle2}
          tone="bg-success/12 text-success"
          sub={
            s.total
              ? `${Math.round((s.verified / s.total) * 100)}% of ${meta.desc.toLowerCase()}`
              : undefined
          }
          onClick={() => openGroup(`Completed · ${meta.desc}`, "verified")}
        />
        <Kpi
          label="Pending Visits"
          value={s.pending}
          icon={Hourglass}
          tone="bg-warning/15 text-warning-foreground dark:text-warning"
          onClick={() => openGroup(`Pending · ${meta.desc}`, "pending")}
        />
        <Kpi
          label="Not Visited"
          value={s.missed}
          icon={XCircle}
          tone="bg-danger/10 text-danger"
          onClick={() => openGroup(`Not visited / expired · ${meta.desc}`, "missed")}
        />
        <Kpi
          label="Verification Failed"
          value={s.failed}
          icon={ShieldAlert}
          tone="bg-danger/10 text-danger"
          onClick={() => openGroup(`Verification failed · ${meta.desc}`, "failed")}
        />
      </div>

      {/* ---------- donut + trend ---------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={`Visit Status · ${meta.desc}`}>
          {donutTotal === 0 ? (
            <EmptyState title="No visits in this period" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="none"
                      className="cursor-pointer"
                      onClick={(_, i) =>
                        openGroup(`${donut[i].name} · ${meta.desc}`, donut[i].group)
                      }
                    >
                      {donut.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold tabular">{donutTotal}</span>
                  <span className="text-xs text-muted-foreground">visits</span>
                </div>
              </div>
              <ul className="flex-1 space-y-1 text-sm">
                {donut.map((d) => (
                  <li key={d.name}>
                    <button
                      onClick={() => openGroup(`${d.name} · ${meta.desc}`, d.group)}
                      className="flex w-full items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/60"
                    >
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                      <span className="flex-1 text-left text-muted-foreground">{d.name}</span>
                      <span className="font-semibold tabular">{d.value}</span>
                      <span className="w-10 text-right text-xs text-muted-foreground tabular">
                        {Math.round((d.value / donutTotal) * 100)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
        <Panel title={`Daily Visit Trend · last ${trendDays} days`} className="xl:col-span-2">
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart
                data={trend}
                margin={{ left: -20, right: 8, top: 8 }}
                className="cursor-pointer"
                onClick={(st: any) => {
                  const d = st?.activePayload?.[0]?.payload?.date;
                  if (d)
                    openDrill(
                      `Visits on ${fmtDate(d)}`,
                      db.tasks.filter((t) => t.date === d),
                    );
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="Assigned"
                  stroke="var(--chart-4)"
                  fill="var(--chart-4)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Verified"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ---------- inspector activity: compact grid, 40+ at a glance ---------- */}
      <div className="mt-4">
        <Panel
          title={`Inspector Activity · ${meta.desc} (${perEmp.length})`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={empQ}
                  onChange={(e) => setEmpQ(e.target.value)}
                  placeholder="Search inspector…"
                  className="h-8 w-40 pl-7 text-xs"
                />
              </div>
              <select
                value={empSort}
                onChange={(e) => setEmpSort(e.target.value as any)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="total">Most visits</option>
                <option value="missed">Most missed</option>
                <option value="name">Name A–Z</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={hideIdle}
                  onChange={(e) => setHideIdle(e.target.checked)}
                />
                Hide idle
              </label>
            </div>
          }
        >
          <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            {[
              ["Completed", "bg-[var(--chart-1)]"],
              ["Open", "bg-[var(--chart-2)]"],
              ["Missed / failed", "bg-[var(--chart-3)]"],
            ].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-sm", c)} />
                {l}
              </span>
            ))}
          </div>
          {perEmp.length === 0 ? (
            <EmptyState title="No inspectors match" />
          ) : (
            <div className="grid max-h-[380px] grid-cols-1 gap-x-6 gap-y-0.5 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
              {perEmp.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openDrill(`${r.name} (${r.id}) · ${meta.desc}`, r.tasks)}
                  title={`${r.name}: ${r.done} completed, ${r.open} open, ${r.missed} missed`}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-muted/60"
                >
                  <span className="w-28 shrink-0 truncate text-xs font-medium">{r.name}</span>
                  <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    {r.total > 0 && (
                      <>
                        <span
                          className="bg-[var(--chart-1)]"
                          style={{ width: `${(r.done / r.total) * 100}%` }}
                        />
                        <span
                          className="bg-[var(--chart-2)]"
                          style={{ width: `${(r.open / r.total) * 100}%` }}
                        />
                        <span
                          className="bg-[var(--chart-3)]"
                          style={{ width: `${(r.missed / r.total) * 100}%` }}
                        />
                      </>
                    )}
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular">
                    {r.done}/{r.total}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ---------- schedule (fixed height, sticky header) ---------- */}
      <Panel
        title={`${period === "daily" ? "Today's Schedule" : "Visit Register"} · ${meta.desc}`}
        className="mt-4"
        bodyClass="p-0"
        action={
          <Link to="/admin/monitoring" className="text-xs font-medium text-primary hover:underline">
            Open monitoring
          </Link>
        }
      >
        {schedule.length === 0 ? (
          <EmptyState
            title="No visits in this period"
            action={
              <Link to="/admin/tasks" className="text-sm font-medium text-primary">
                Assign a visit
              </Link>
            }
          />
        ) : (
          <div className="dashboard-scroll max-h-[340px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Employee</th>
                  <th className="px-4 py-2 font-medium">Location</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Check-In</th>
                  <th className="px-4 py-2 font-medium">Check-Out</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => drawer.open(t.id)}
                    className={cn(
                      "cursor-pointer border-t hover:bg-muted/40",
                      MISSED.includes(t.status) && "opacity-80",
                      t.important && IMPORTANT_ROW,
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(t.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtWindow(t)}</td>
                    <td className="px-4 py-2.5">
                      {db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId}
                    </td>
                    <td className="px-4 py-2.5">
                      {db.locations.find((l) => l.id === t.locationId)?.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">
                      {fmtTime(t.checkIn?.at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">
                      {fmtTime(t.checkOut?.at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel
        title="Employee Reporting Time"
        className="mt-4"
        bodyClass="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={rtDate}
              onChange={(e) => setRtDate(e.target.value || today)}
              className="h-8 w-[150px]"
              aria-label="Reporting date"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={rtRows.length === 0}
              onClick={() => exportReportingExcel(rtRows, rtDate || today)}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Download Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={rtRows.length === 0}
              onClick={() => downloadReportingTimePdf(rtRows, rtDate || today)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        }
      >
        {rtRows.length === 0 ? (
          <EmptyState title="No employees found" />
        ) : (
          <div className="dashboard-scroll max-h-[340px] overflow-auto">
  <table className="w-full text-sm">
<thead className="sticky top-0 z-10 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="w-16 px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Employee ID</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Department</th>
                  <th className="px-4 py-2 font-medium">Visits</th>
                  <th className="px-4 py-2 font-medium">Reporting Time (First Check-In)</th>
                </tr>
              </thead>
              <tbody>
                {rtRows.map((r, index) => (
  <tr key={r.id} className="border-t hover:bg-muted/40">
    <td className="w-16 px-4 py-2.5 text-muted-foreground tabular">
      {index + 1}
    </td>

    <td className="px-4 py-2.5 font-mono text-xs">
      {r.id}
    </td>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-2.5 tabular">{r.visits}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">
                      {r.firstCheckIn ? (
                        fmtTime(r.firstCheckIn)
                      ) : (
                        <span className="text-muted-foreground">Not reported</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {/* ---------- location coverage: multi-column, clickable ---------- */}
      <Panel title={`Location Coverage · ${meta.desc}`} className="mt-4">
        {coverage.length === 0 ? (
          <EmptyState title="No locations scheduled" />
        ) : (
          <div className="dashboard-scroll grid max-h-[260px] gap-x-6 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
            {coverage.map((c) => (
              <button
                key={c.id}
                onClick={() => openDrill(`${c.name} · ${meta.desc}`, c.tasks)}
                className="flex items-center justify-between gap-2 rounded px-1.5 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  {c.done}/{c.total}
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* ---------- drill-down sheet ---------- */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
          {drill && (
            <>
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle className="text-base">{drill.title}</SheetTitle>
                <SheetDescription>
                  {drill.tasks.length} visit{drill.tasks.length === 1 ? "" : "s"} · click one for
                  full details
                </SheetDescription>
              </SheetHeader>
              {drill.tasks.length === 0 ? (
                <EmptyState title="No visits here" />
              ) : (
                <ul className="divide-y">
                  {drill.tasks.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => {
                          setDrill(null);
                          drawer.open(t.id);
                        }}
                        className="w-full px-5 py-3 text-left hover:bg-muted/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {db.locations.find((l) => l.id === t.locationId)?.name}
                          </span>
                          <StatusBadge status={t.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId} ·{" "}
                          {fmtDate(t.date)} · {fmtWindow(t)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
