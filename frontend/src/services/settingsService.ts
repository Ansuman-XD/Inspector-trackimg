import type { Settings } from "@/types";
import { storage } from "./storageService";

export const settingsService = {
  update(patch: Partial<Settings>) {
    storage.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  },
  resetEnvironment() {
    storage.reset();
  },
};
