import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  onSelect: (p: PlaceResult) => void;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
}

export function PlaceSearch({ onSelect }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 3) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const mySeq = ++seq.current;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as NominatimItem[];
        if (mySeq !== seq.current) return;
        setResults(
          data.map((d) => {
            const parts = d.display_name.split(", ");
            return {
              name: d.name || parts[0],
              address: d.display_name,
              lat: +(+d.lat).toFixed(6),
              lng: +(+d.lon).toFixed(6),
            };
          })
        );
        setOpen(true);
      } catch {
        if (mySeq === seq.current) {
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function pick(p: PlaceResult) {
    onSelect(p);
    setQ("");
    setResults(null);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search place, railway station, or landmark…"
        className="pl-9 pr-9"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {open && results && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matching places found.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/60"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.address}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
