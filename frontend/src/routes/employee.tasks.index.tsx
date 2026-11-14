import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/rt/common";
import { EmployeeTaskCard } from "@/components/rt/EmployeeTaskCard";
import { PlanVisitDialog } from "@/components/rt/PlanVisitDialog";
import { useEmployeeSession } from "@/components/rt/employeeContext";
import { useDB } from "@/hooks/useDB";
import { OPEN } from "@/services/taskService";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/employee/tasks/")({
  head: () => ({ meta: [{ title: "My Tasks — Inspector Tracking System" }, { name: "description", content: "Assigned field visits." }] }),
  component: Tasks,
});

const TABS = ["Today", "Upcoming", "Open"] as const;

function Tasks() {
  const db = useDB();
  const navigate = useNavigate();
  const { session } = useEmployeeSession();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");
  const [planOpen, setPlanOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const today = todayISO();
  const mine = db.tasks.filter((t) => t.employeeId === session.userId);
  const base = tab === "Today"
    ? mine.filter((t) => t.date === today)
    : tab === "Upcoming"
      ? mine.filter((t) => t.date > today)
      : mine.filter((t) => OPEN.includes(t.status));
  const list = base
    .filter((t) => tab === "Today" || !filterDate || t.date === filterDate)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Tasks</h1>
        <Button size="sm" onClick={() => setPlanOpen(true)}><Plus className="mr-1 h-4 w-4" />Plan a Visit</Button>
      </div>
      <div className="grid grid-cols-3 rounded-lg bg-muted p-1">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("rounded-md py-1.5 text-sm", tab === t ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>{t}</button>)}
      </div>
      {tab !== "Today" && (
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-[170px]" aria-label="Filter by date" />
          {filterDate && <Button size="sm" variant="ghost" onClick={() => setFilterDate("")}><X className="mr-1 h-3.5 w-3.5" />Clear</Button>}
        </div>
      )}
      {list.length === 0 ? <EmptyState title="Nothing here" text="No visits in this list." /> : <div className="space-y-2">{list.map((t) => <EmployeeTaskCard key={t.id} task={t} location={db.locations.find((l) => l.id === t.locationId)} />)}</div>}
      <PlanVisitDialog
  employeeId={session.userId}
  open={planOpen}
  onClose={() => setPlanOpen(false)}
  onSaved={() => navigate({ to: "/employee/dashboard" })}
/>
    </div>
  );
}
