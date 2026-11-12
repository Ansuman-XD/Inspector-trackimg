import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, LayerGroup } from "leaflet";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string; // css color / var
  label: string;
  kind?: "location" | "employee";
  radius?: number; // meters circle
}
export interface MapLine { from: [number, number]; to: [number, number]; label?: string }

interface Props {
  markers: MapMarker[];
  lines?: MapLine[];
  onMarkerClick?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  fitKey?: string;
  zoom?: number;
}

function resolveColor(c: string) {
  if (!c.startsWith("var(")) return c;
  const name = c.slice(4, -1);
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

export function MapView({ markers, lines = [], onMarkerClick, onMapClick, className, fitKey, zoom = 13 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const cbs = useRef({ onMarkerClick, onMapClick });
  cbs.current = { onMarkerClick, onMapClick };

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = (mod as unknown as { default: typeof import("leaflet") }).default ?? mod;
      L.current = Lf;
      const first = markers[0];
      map.current = Lf.map(el.current, { zoomControl: true, attributionControl: true }).setView(first ? [first.lat, first.lng] : [20.2961, 85.8245], zoom);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
      layer.current = Lf.layerGroup().addTo(map.current);
      map.current.on("click", (e) => cbs.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
      draw(true);
    });
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    if (el.current) ro.observe(el.current);
    return () => { cancelled = true; ro.disconnect(); map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(fit: boolean) {
    const Lf = L.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    for (const ln of lines) {
      Lf.polyline([ln.from, ln.to], { color: resolveColor("var(--foreground)"), weight: 2, dashArray: "5 6", opacity: 0.7 })
        .bindTooltip(ln.label ?? "", { permanent: !!ln.label, direction: "center", className: "text-xs" }).addTo(g);
    }
    for (const mk of markers) {
      const color = resolveColor(mk.color);
      if (mk.radius) Lf.circle([mk.lat, mk.lng], { radius: mk.radius, color, weight: 1, fillOpacity: 0.08 }).addTo(g);
      const c = Lf.circleMarker([mk.lat, mk.lng], {
        radius: mk.kind === "employee" ? 6 : 9, color: mk.kind === "employee" ? color : "#fff", weight: mk.kind === "employee" ? 3 : 2,
        fillColor: mk.kind === "employee" ? "#fff" : color, fillOpacity: 1,
      }).bindTooltip(mk.label).addTo(g);
      c.on("click", () => cbs.current.onMarkerClick?.(mk.id));
    }
    if (fit) {
      const pts = [...markers.map((x) => [x.lat, x.lng] as [number, number]), ...lines.flatMap((l) => [l.from, l.to])];
      if (pts.length > 1) m.fitBounds(Lf.latLngBounds(pts), { padding: [40, 40], maxZoom: 17 });
      else if (pts.length === 1) m.setView(pts[0], Math.max(m.getZoom(), zoom));
    }
  }

  const sig = JSON.stringify([markers, lines]);
  const lastFit = useRef(fitKey);
  useEffect(() => {
    const fit = lastFit.current !== fitKey;
    lastFit.current = fitKey;
    draw(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, fitKey]);

  return <div ref={el} className={className ?? "h-80 w-full rounded-md border"} />;
}
