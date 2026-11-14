import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDB } from "@/hooks/useDB";
import { taskService, validatePlan, type PlanInput } from "@/services/taskService";
import { todayISO } from "@/lib/format";
import { pastCutoff, plannedBeforeCutoff } from "@/lib/visitRules";
import type { Task } from "@/types";

/** Employee creates or edits a self-planned visit. */
export function PlanVisitDialog({ employeeId, task, open, onClose, onSaved }: { employeeId: string; task?: Task; open: boolean; onClose: () => void; onSaved?: (id: string) => void }) {
  const db = useDB();
  const [d, setD] = useState<PlanInput>(() => ({ date: task?.date ?? todayISO(), locationId: task?.locationId ?? "", instructions: task?.instructions ?? "" }));
  const [touched, setTouched] = useState(false);
  const err = validatePlan(db, employeeId, d, task?.id);
  const willArchive = !!task && d.locationId !== task.locationId && pastCutoff(task.date) && plannedBeforeCutoff(task);

 async function save() {
  setTouched(true);
  if (err) return;
  try {
    if (task) {
      await taskService.updatePlan(employeeId, task.id, d);
      toast.success(
        willArchive
          ? "Visit updated. The original plan is kept in history."
          : "Visit updated."
      );
      onSaved?.(task.id);
    } else {
      const t = await taskService.plan(employeeId, d);
      toast.success("Visit planned.");
      onSaved?.(t.id);
    }
    onClose();
  } catch (e) {
    toast.error((e as Error).message);
  }
}

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{task ? "Edit planned visit" : "Plan a visit"}</DialogTitle><DialogDescription>Choose the date and location you will visit.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1.5"><span className="text-sm font-medium">Visit date</span><Input type="date" min={todayISO()} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} className="h-11" /></label>
          <div className="space-y-1.5"><span className="text-sm font-medium">Location</span>
            <Select value={d.locationId} onValueChange={(v) => setD({ ...d, locationId: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>{db.locations.filter((l) => l.status === "active").map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="block space-y-1.5"><span className="text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span></span><Textarea rows={3} value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value.slice(0, 400) })} placeholder="Purpose of the visit" /></label>
          {(touched || (d.locationId && err?.startsWith("This location"))) && err && <p role="alert" className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">{err}</p>}
          {willArchive && <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">It is past 9:00 AM. Changing the location keeps your original plan in history.</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{task ? "Save changes" : "Plan visit"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
