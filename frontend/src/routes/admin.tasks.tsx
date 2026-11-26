import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Search, User, MapPin, CalendarClock, FileText, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, KV, PageHeader, PriorityTag, StatusBadge } from "@/components/rt/common";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { useDB } from "@/hooks/useDB";
import { taskService, validateAssignment, type AssignInput } from "@/services/taskService";
import { fmtDate, fmtTime, todayISO, fmtWindow } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@/types";
import {coVisitors} from "@/lib/visitRules";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "Assign Visit — Inspector Tracking System" }, { name: "description", content: "Assign scheduled field visits to employees." }, { property: "og:title", content: "Assign Visit — Inspector Tracking System" }, { property: "og:description", content: "Assign scheduled field visits to employees." }] }),
  component: AssignVisit,
});

const STEPS = [
  { label: "Employee", icon: User },
  { label: "Location", icon: MapPin },
  { label: "Schedule", icon: CalendarClock },
  { label: "Instructions", icon: FileText },
  { label: "Review", icon: ClipboardCheck },
];

const init = (): AssignInput => ({ employeeId: "", locationId: "", date: todayISO(), startTime: "", endTime: "", priority: "medium", instructions: "", allowDuplicate: false });

function AssignVisit() {
  const db = useDB();
  const drawer = useTaskDrawer();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<AssignInput>(init);
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof AssignInput>(k: K, v: AssignInput[K]) => setD((p) => ({ ...p, [k]: v }));

  const errs = validateAssignment(db, d);
  const stepErrs = (s: number) => errs.filter((e) => (s === 0 ? e.field === "employee" : s === 1 ? e.field === "location" : s === 2 ? ["date", "startTime", "endTime", "duplicate", "conflict"].includes(e.field) : false));
  const [touched, setTouched] = useState<number[]>([]);
  const emp = db.employees.find((e) => e.id === d.employeeId);
  const loc = db.locations.find((l) => l.id === d.locationId);

  const emps = useMemo(() => db.employees.filter((e) => e.status === "active" && e.role !== "admin" && (!q || (e.name + e.id + e.department).toLowerCase().includes(q.toLowerCase()))), [db.employees, q]);
  const locs = useMemo(() => db.locations.filter((l) => l.status === "active" && (!q || (l.name + l.address + l.type).toLowerCase().includes(q.toLowerCase()))), [db.locations, q]);
  const recent = [...db.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  function next() {
    setTouched((t) => [...t, step]);
    if (stepErrs(step).length) return;
    setQ(""); setStep((s) => Math.min(4, s + 1));
  }
  async function submit() {
    setSaving(true);
    try {
      const t = await taskService.assign(d);
      setDone(t);
      toast.success("Visit assigned successfully.");
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setSaving(false);
    }
  }


  if (done) {
    const l = db.locations.find((x) => x.id === done.locationId);
    const e = db.employees.find((x) => x.id === done.employeeId);
    const empName = e?.name || done.employeeId || "Employee";
    const locName = l?.name || done.locationId || "Location";

    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/12 text-success"><CheckCircle2 className="h-9 w-9" /></div>
        <h1 className="mt-4 text-2xl font-semibold">Visit Assigned</h1>
        <p className="mt-1 text-sm text-muted-foreground">{empName} has been notified and will see this visit in their task list.</p>
        <div className="mt-6 rounded-lg border bg-card p-4 text-left divide-y">
          <KV k="Visit ID" v={done.id} mono />
          <KV k="Employee" v={empName} />
          <KV k="Location" v={locName} />
          <KV k="Date" v={fmtDate(done.date)} />
          <KV k="Window" v={`${fmtWindow(done)}`} />
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" asChild><Link to="/admin/monitoring">View in Monitoring</Link></Button>
          <Button onClick={() => { setDone(null); setD(init()); setStep(0); setTouched([]); }}>Assign Another</Button>
        </div>
      </div>
    );
  }


  const showErr = touched.includes(step) ? stepErrs(step) : [];

  return (
    <div>
      <PageHeader title="Assign Visit" subtitle="Schedule a verified field visit for an employee." />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
          <ol className="flex overflow-x-auto border-b">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex-1">
                <button disabled={i > step} onClick={() => setStep(i)} className={cn("flex w-full min-w-[120px] items-center gap-2 px-4 py-3 text-sm", i === step ? "text-foreground shadow-[inset_0_-2px_0_var(--primary)]" : i < step ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                  <span className="font-medium">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="min-h-[380px] p-5">
            {(step === 0 || step === 1) && (
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={step === 0 ? "Search employee by name, ID or department…" : "Search location by name, address or type…"} className="pl-9" autoFocus /></div>
            )}
            {step === 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {emps.map((e) => {
                  const open = db.tasks.filter((t) => t.employeeId === e.id && t.date === d.date).length;
                  return (
                    <button key={e.id} onClick={() => set("employeeId", e.id)} className={cn("flex items-center gap-3 rounded-lg border p-3 text-left transition", d.employeeId === e.id ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:bg-muted/40")}>
                      <Avatar name={e.name} photo={e.photo} />
                      <span className="min-w-0 flex-1"><span className="block font-medium">{e.name}</span><span className="block text-xs text-muted-foreground">{e.id} · {e.department}</span></span>
                      <span className="text-right text-[11px] text-muted-foreground">{open} visit{open === 1 ? "" : "s"}<br />on date</span>
                    </button>
                  );
                })}
                {emps.length === 0 && <p className="text-sm text-muted-foreground">No active employees match your search.</p>}
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {/* {locs.map((l) => (
                  <button key={l.id} onClick={() => set("locationId", l.id)} className={cn("rounded-lg border p-3 text-left transition", d.locationId === l.id ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:bg-muted/40")}>
                    <span className="block font-medium">{l.name}</span>
                    <span className="block text-xs text-muted-foreground">{l.type}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{l.address}</span>
                  </button>
                ))} */}

                {locs.map((l) => {
  const others = coVisitors(db, l.id, d.date);
  return (
    <button key={l.id} onClick={() => set("locationId", l.id)} className={cn("rounded-lg border p-3 text-left transition", d.locationId === l.id ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:bg-muted/40")}>
      <span className="block font-medium">{l.name}</span>
      <span className="block text-xs text-muted-foreground">{l.type}</span>
      <span className="mt-1 block truncate text-xs text-muted-foreground">{l.address}</span>
      {others.length > 0 && (
        <span className="mt-1.5 inline-block rounded bg-info/10 px-1.5 py-0.5 text-[11px] font-medium text-info">
          {others.length} inspector{others.length > 1 ? "s" : ""} already on {fmtDate(d.date)}:
          {" "}{others.map((o) => o.employee?.name.split(" ")[0]).join(", ")}
        </span>
      )}
    </button>
  );
})}
              </div>
            )}
            {step === 2 && (
              <div className="grid max-w-xl gap-4 sm:grid-cols-3">
                <label className="space-y-1.5 sm:col-span-3"><span className="text-sm font-medium">Visit date <span className="text-danger">*</span></span><Input type="date" min={todayISO()} value={d.date} onChange={(e) => set("date", e.target.value)} /></label>
                <label className="space-y-1.5"><span className="text-sm font-medium">Start time <span className="font-normal text-muted-foreground">(optional)</span></span><Input type="time" value={d.startTime} onChange={(e) => set("startTime", e.target.value)} /></label>
                <label className="space-y-1.5"><span className="text-sm font-medium">End time <span className="font-normal text-muted-foreground">(optional)</span></span><Input type="time" value={d.endTime} onChange={(e) => set("endTime", e.target.value)} /></label>
                <div className="space-y-1.5"><span className="text-sm font-medium">Priority</span>
                  <div className="grid grid-cols-3 gap-1 rounded-md border p-1">{(["high", "medium", "low"] as Priority[]).map((p) => <button key={p} onClick={() => set("priority", p)} className={cn("h-8 rounded text-xs font-medium capitalize", d.priority === p ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{p}</button>)}</div>
                </div>
                {/* <label className="flex items-center gap-2 text-sm sm:col-span-3"><Checkbox checked={!!d.allowDuplicate} onCheckedChange={(v) => set("allowDuplicate", !!v)} />Allow a repeat visit to the same location on this date</label> */}
               <p className="text-xs text-muted-foreground sm:col-span-3">All times are Indian Standard Time (IST). Leave times blank to allow the visit any time that day. Several employees can visit the same location on one date, and the same employee can be assigned more than once; give each visit its own time window so they are easy to tell apart.</p>
              </div>
            )}
            {step === 3 && (
              <div className="max-w-xl space-y-2">
                <span className="text-sm font-medium">Visit instructions</span>
                <Textarea rows={6} value={d.instructions} onChange={(e) => set("instructions", e.target.value.slice(0, 600))} placeholder="What should the employee inspect or verify on site?" />
                <div className="flex flex-wrap gap-1.5">{["Inspect platform surface and report damage.", "Verify signal aspect and relay room log.", "Check fire safety equipment.", "Photograph the work site."].map((s) => <button key={s} onClick={() => set("instructions", (d.instructions ? d.instructions + " " : "") + s)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">+ {s}</button>)}</div>
                <p className="text-right text-xs text-muted-foreground">{d.instructions.length}/600</p>
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee</h3><div className="flex items-center gap-3"><Avatar name={emp?.name ?? "?"} photo={emp?.photo} /><div><p className="font-medium">{emp?.name}</p><p className="text-xs text-muted-foreground">{emp?.id} · {emp?.designation}</p></div></div></div>
                <div className="rounded-lg border p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</h3><p className="font-medium">{loc?.name}</p><p className="text-xs text-muted-foreground">{loc?.address}</p></div>
                <div className="rounded-lg border p-4 divide-y"><KV k="Date" v={fmtDate(d.date)} /><KV k="Window" v={`${fmtWindow(d)}`} /><KV k="Priority" v={<PriorityTag p={d.priority} />} /><KV k="GPS radius" v={`${loc?.verificationRadius ?? 100} m`} /></div>
                <div className="rounded-lg border p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instructions</h3><p className="text-sm">{d.instructions || <span className="text-muted-foreground">No specific instructions.</span>}</p></div>
                {errs.length > 0 && <div className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger md:col-span-2">{errs.map((e) => <p key={e.field}>{e.message}</p>)}</div>}
              </div>
            )}
            {showErr.length > 0 && <div role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">{showErr.map((e) => <p key={e.field}>{e.message}</p>)}</div>}
          </div>
          <div className="flex items-center justify-between border-t px-5 py-3">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
            {step < 4 ? <Button onClick={next}>Continue<ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button onClick={submit} disabled={saving || errs.length > 0}>{saving ? "Assigning…" : "Assign Visit"}</Button>}
          </div>
        </div>
        <aside className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
          <header className="border-b px-4 py-3 text-sm font-semibold">Recently assigned</header>
          <ul className="divide-y">{recent.map((t) => (
            <li key={t.id}><button onClick={() => drawer.open(t.id)} className="w-full px-4 py-2.5 text-left hover:bg-muted/40">
              <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{db.locations.find((l) => l.id === t.locationId)?.name}</span><StatusBadge status={t.status} /></div>
              <p className="text-xs text-muted-foreground">{db.employees.find((e) => e.id === t.employeeId)?.name ?? t.employeeId} · {fmtDate(t.date)}</p>
            </button></li>
          ))}</ul>
        </aside>
      </div>
    </div>
  );
}
