/**
 * Storage repository. The only module that touches localStorage.
 * Replace `read`/`write` with API calls to move to a real backend.
 */
import type { DB } from "@/types";
import { buildSeed, buildDepartments, buildLocationTypes } from "./seed";

const KEY = "railtrack.db.v3";
const LEGACY_KEY = "railtrack.db.v2";
const SCHEMA_VERSION = 3;

let cache: DB | null = null;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function load(): DB {
  if (!isBrowser()) return buildSeed();
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === SCHEMA_VERSION) return parsed;
      if (parsed.version === 2) {
        // v2 → v3: keep every existing record, add department & location-type catalogues.
        const migrated: DB = {
          ...parsed,
          version: SCHEMA_VERSION,
          departments: parsed.departments?.length ? parsed.departments : buildDepartments(),
          locationTypes: parsed.locationTypes?.length ? parsed.locationTypes : buildLocationTypes(),
        };
        cache = migrated;
        persist(migrated);
        localStorage.removeItem(LEGACY_KEY);
        return migrated;
      }
    }
  } catch {
    /* corrupted — reseed */
  }
  const seed = buildSeed();
  persist(seed);
  return seed;
}

function persist(db: DB) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    throw new Error(
      "Device storage is full. Remove older visit photos or reset the environment in Settings.",
      { cause: e },
    );
  }
}

export const storage = {
  get(): DB {
    if (!cache) cache = load();
    return cache;
  },
  /** Apply an immutable update and notify subscribers. */
  update(fn: (db: DB) => DB) {
    const next = fn(storage.get());
    persist(next);
    cache = next;
    listeners.forEach((l) => l());
  },
  reset() {
    const seed = buildSeed();
    persist(seed);
    cache = seed;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

if (isBrowser()) {
  // Cross-tab sync: admin and employee in two tabs update live.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/** Small key/value helpers for UI prefs outside the DB (theme, session). */
export const prefs = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    if (!isBrowser()) return;
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string) {
    if (!isBrowser()) return;
    localStorage.removeItem(key);
  },
};
