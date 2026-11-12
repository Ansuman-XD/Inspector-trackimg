import type { LocationTypeItem } from "@/types";
import { storage, uid } from "./storageService";
import { makeActivity } from "./notificationService";
import { apiClient } from "./apiClient";

export type LocationTypeInput = { name: string; code: string; description?: string };

function validate(t: LocationTypeInput) {
  if (t.name.trim().length < 2) throw new Error("Enter a location type name.");
  if (!/^[A-Za-z&/ ]{1,6}$/.test(t.code.trim())) throw new Error("Code must be 1–6 letters (e.g. JST, BRG).");
}

export const locationTypeService = {
  async create(input: LocationTypeInput) {
    validate(input);
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    // Call backend API
    const res = await apiClient<any>("/location-types", {
      method: "POST",
      body: JSON.stringify({ name, code, description: input.description?.trim() || undefined }),
    });

    const newItem: LocationTypeItem = {
      id: res.id,
      name: res.name,
      code: res.code,
      description: res.description || undefined,
      createdAt: res.createdAt || new Date().toISOString(),
    };

    storage.update((d) => ({
      ...d,
      locationTypes: [...d.locationTypes.filter((x) => x.id !== newItem.id), newItem],
      activities: makeActivity(d, { kind: "info", actor: "ADMIN001", message: `Location type ${name} was added.` }),
    }));

    return newItem;
  },

  async update(id: string, input: LocationTypeInput) {
    validate(input);
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    // Call backend API
    const res = await apiClient<any>(`/location-types/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, code, description: input.description?.trim() || undefined }),
    });

    storage.update((d) => ({
      ...d,
      locationTypes: d.locationTypes.map((x) =>
        x.id === id ? { ...x, name: res.name, code: res.code, description: res.description || undefined } : x
      ),
    }));
  },

  async remove(id: string) {
    // Call backend API
    await apiClient(`/location-types/${id}`, {
      method: "DELETE",
    });

    storage.update((d) => ({ ...d, locationTypes: d.locationTypes.filter((x) => x.id !== id) }));
  },
};

