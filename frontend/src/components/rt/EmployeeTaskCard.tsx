import { Link } from "@tanstack/react-router";
import { MapPin, Clock, ChevronRight } from "lucide-react";
import { PriorityTag, StatusBadge } from "@/components/rt/common";
import { fmtDate, fmtTime, fmtWindow } from "@/lib/format";
import type { Task, VisitLocation } from "@/types";

export function EmployeeTaskCard({ task, location }: { task: Task; location?: VisitLocation }) {
  return (
    <Link to="/employee/tasks/$id" params={{ id: task.id }} className="block rounded-lg border bg-card p-4 active:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{location?.name ?? task.locationId}</p>
          <p className="text-xs text-muted-foreground">{location?.type}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtDate(task.date)} · {fmtWindow(task)}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{task.id}</span>
      </div>
      <div className="mt-3 flex items-center justify-between"><PriorityTag p={task.priority} /><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
    </Link>
  );
}
