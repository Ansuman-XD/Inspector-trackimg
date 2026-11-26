import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Image as ImageIcon, RotateCcw, Download, Star  } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, PriorityTag, StatusBadge, ToneBadge } from "@/components/rt/common";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { useDB } from "@/hooks/useDB";
import { ALL_STATUSES, STATUS_META, IMPORTANT_ROW  } from "@/lib/status";
import { exportVisitsCsv } from "@/services/reportService";
import { fmtDate, fmtDistance, fmtTime, todayISO, fmtWindow } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/monitoring")({
  head: () => ({ meta: [{ title: "Visit Monitoring — Inspector Tracking System" }, { name: "description", content: "Live monitoring of field visits and GPS verification." }] }),
  component: Monitoring,
});

const ALL = "__all";

function Monitoring() {
  const db = useDB();
  const drawer = useTaskDrawer();
  const [q, setQ] = useState("");
  const [date, setDate] = useState(todayISO());
  const [emp, setEmp] = useState(ALL);
  const [loc, setLoc] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.tasks
      .filter((t) => !date || t.date === date)
      .filter((t) => emp === ALL || t.employeeId === emp)
      .filter((t) => loc === ALL || t.locationId === loc)
      .filter((t) => status === ALL || t.status === status)
      .filter((t) => {
        if (!s) return true;
        const e = db.employees.find((x) => x.id === t.employeeId)?.name ?? "";
        const l = db.locations.find((x) => x.id === t.locationId)?.name ?? "";
        return [t.id, e, l].some((v) => v.toLowerCase().includes(s));
      })
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [db, q, date, emp, loc, status]);

  const reset = () => { setQ(""); setDate(todayISO()); setEmp(ALL); setLoc(ALL); setStatus(ALL); };

  return (
    <div>
      <PageHeader title="Visit Monitoring" subtitle={`${rows.length} visit${rows.length === 1 ? "" : "s"} · ${date ? fmtDate(date) : "all dates"}`} actions={
        <Button variant="outline" size="sm" onClick={() => exportVisitsCsv(db, rows, `inspector-tracking-visits-${date || "all"}.csv`)} disabled={rows.length === 0}><Download className="mr-1.5 h-4 w-4" />Download CSV</Button>
      } />
      <Panel bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[200px] flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search visit ID, employee, location" className="pl-8" /></div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px]" />
          <Select value={emp} onValueChange={setEmp}><SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All employees</SelectItem>{db.employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
          <Select value={loc} onValueChange={setLoc}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All locations</SelectItem>{db.locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All statuses</SelectItem>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent></Select>
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button>
        </div>
        {rows.length === 0 ? <EmptyState title="No visits match these filters" text="Change the date or clear filters to see more visits." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>{["Visit ID", "Employee", "Location", "Date", "Window", "Priority", "Status", "Check-In", "Check-Out", "GPS", "Distance", "Photo"].map((h) => <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => drawer.open(t.id)} className={cn("cursor-pointer border-t hover:bg-muted/40", t.important && IMPORTANT_ROW)}>
  <td className="px-4 py-2.5 font-mono text-xs">
    {t.important && <Star className="mr-1 inline h-3.5 w-3.5 fill-warning text-warning" />}{t.id}
  </td>
                    <td className="px-4 py-2.5">{db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId}</td>
                    <td className="px-4 py-2.5">{db.locations.find((l) => l.id === t.locationId)?.name}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(t.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtWindow(t)}</td>
                    <td className="px-4 py-2.5"><PriorityTag p={t.priority} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtTime(t.checkIn?.at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular">{fmtTime(t.checkOut?.at)}</td>
                    <td className="px-4 py-2.5">{t.verificationStatus === "verified" ? <ToneBadge tone="success">Verified</ToneBadge> : t.verificationStatus === "failed" ? <ToneBadge tone="danger">Failed</ToneBadge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 tabular">{fmtDistance(t.distanceFromLocation)}</td>
                    <td className="px-4 py-2.5">{t.photo ? <button onClick={(e) => { e.stopPropagation(); drawer.photo(t.id); }} className="inline-flex items-center gap-1 text-primary hover:underline"><ImageIcon className="h-3.5 w-3.5" />View</button> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
