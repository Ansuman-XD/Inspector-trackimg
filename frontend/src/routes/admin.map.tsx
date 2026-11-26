import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapView, type MapLine, type MapMarker } from "@/components/rt/MapView";
import { PageHeader, Panel, StatusBadge } from "@/components/rt/common";
import { useTaskDrawer } from "@/components/rt/drawerContext";
import { useDB } from "@/hooks/useDB";
import { markerColor, aggregateColor } from "@/lib/status";
import { fmtDate, fmtDistance, fmtTime, todayISO, fmtWindow } from "@/lib/format";

export const Route = createFileRoute("/admin/map")({
  head: () => ({ meta: [{ title: "Visit Map — Inspector Tracking System" }, { name: "description", content: "Map of visit locations and verified employee positions." }] }),
  component: VisitMap,
});

function VisitMap() {
  const db = useDB();
  const drawer = useTaskDrawer();
  const [date, setDate] = useState(todayISO());
  const [selLoc, setSelLoc] = useState<string | null>(null);
  const tasks = db.tasks.filter((t) => t.date === date);

  // const { markers, lines } = useMemo(() => {
  //   const markers: MapMarker[] = [];
  //   const lines: MapLine[] = [];
  //   for (const t of tasks) {
  //     const l = db.locations.find((x) => x.id === t.locationId);
  //     if (!l) continue;
  //     const e = db.employees.find((x) => x.id === t.employeeId);
  //     markers.push({ id: t.id, lat: l.lat, lng: l.lng, color: markerColor(t.status), label: `${l.name} · ${e?.name ?? ""}`, kind: "location", radius: l.verificationRadius ?? 100 });
  //     if (t.employeeLatitude != null && t.employeeLongitude != null) {
  //       markers.push({ id: t.id, lat: t.employeeLatitude, lng: t.employeeLongitude, color: "var(--primary)", label: `${e?.name} · ${fmtDistance(t.distanceFromLocation)} away`, kind: "employee" });
  //       lines.push({ from: [l.lat, l.lng], to: [t.employeeLatitude, t.employeeLongitude], label: fmtDistance(t.distanceFromLocation) });
  //     }
  //   }
  //   return { markers, lines };
  // }, [tasks, db]);

const { markers, lines } = useMemo(() => {
  const markers: MapMarker[] = [];
  const lines: MapLine[] = [];
  const byLoc = new Map<string, typeof tasks>();
  for (const t of tasks) byLoc.set(t.locationId, [...(byLoc.get(t.locationId) ?? []), t]);

  for (const [locId, ts] of byLoc) {
    const l = db.locations.find((x) => x.id === locId);
    if (!l) continue;
    const names = ts.map((t) => db.employees.find((e) => e.id === t.employeeId)?.name.split(" ")[0]).join(", ");
    markers.push({
      id: `loc:${l.id}`, lat: l.lat, lng: l.lng,
      color: aggregateColor(ts.map((t) => t.status)),
      label: `${l.name} · ${ts.length} visit${ts.length > 1 ? "s" : ""} (${names})`,
      kind: "location", radius: l.verificationRadius ?? 100,
    });
    for (const t of ts) {
      if (t.employeeLatitude != null && t.employeeLongitude != null) {
        const e = db.employees.find((x) => x.id === t.employeeId);
        markers.push({ id: t.id, lat: t.employeeLatitude, lng: t.employeeLongitude, color: "var(--primary)", label: `${e?.name} · ${fmtDistance(t.distanceFromLocation)} away`, kind: "employee" });
        lines.push({ from: [l.lat, l.lng], to: [t.employeeLatitude, t.employeeLongitude], label: fmtDistance(t.distanceFromLocation) });
      }
    }
  }
  return { markers, lines };
}, [tasks, db]);

const visible = selLoc ? tasks.filter((t) => t.locationId === selLoc) : tasks;

  return (
    <div>
      <PageHeader title="Visit Map" subtitle={`${tasks.length} visits on ${fmtDate(date)}`} actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px]" />} />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel bodyClass="p-0">
          <MapView markers={markers} lines={lines} onMarkerClick={(id) => id.startsWith("loc:") ? setSelLoc(id.slice(4)) : drawer.open(id)} className="h-[640px] w-full rounded-b-lg" />
          <div className="flex flex-wrap gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
            {[["Verified", "var(--success)"], ["Pending / In progress", "var(--warning)"], ["Missed / Failed", "var(--danger)"], ["Assigned", "var(--info)"], ["Employee GPS position", "var(--primary)"]].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Panel>
        <Panel title={selLoc ? `Visits at ${db.locations.find(l => l.id === selLoc)?.name}` : "Visits"}
       action={selLoc && <button className="text-xs text-primary" onClick={() => setSelLoc(null)}>Show all</button>} bodyClass="p-0">
          <ul className="max-h-[680px] overflow-y-auto">
            {tasks.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No visits on this date.</li>}
            {visible.map((t) => (
              <li key={t.id}><button onClick={() => drawer.open(t.id)} className="w-full border-b px-4 py-3 text-left hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{db.locations.find((l) => l.id === t.locationId)?.name}</span><StatusBadge status={t.status} /></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{db.employees.find((e) => e.id === t.employeeId)?.name} · {fmtWindow(t)}{t.distanceFromLocation != null && ` · ${fmtDistance(t.distanceFromLocation)}`}</p>
              </button></li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
