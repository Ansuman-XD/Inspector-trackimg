import { useSyncExternalStore } from "react";
import { storage } from "@/services/storageService";
import type { DB } from "@/types";

/** Reactive read of the application state. Re-renders on any change. */
export function useDB(): DB {
  return useSyncExternalStore(storage.subscribe, storage.get, storage.get);
}
