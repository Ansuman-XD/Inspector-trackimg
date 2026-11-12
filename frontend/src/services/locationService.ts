import type { VisitLocation } from "@/types";
import { storage, uid } from "./storageService";
import { makeActivity } from "./notificationService";
import { apiClient } from "./apiClient";

export type LocationInput = Omit<VisitLocation, "id" | "createdAt">;

function validate(l: LocationInput) {
  if (l.name.trim().length < 3) throw new Error("Enter a location name.");
  if (!l.address.trim()) throw new Error("Enter the address.");
  if (!Number.isFinite(l.lat) || l.lat < -90 || l.lat > 90) throw new Error("Latitude must be between -90 and 90.");
  if (!Number.isFinite(l.verificationRadius) || l.verificationRadius < 10 || l.verificationRadius > 2000) throw new Error("Verification radius must be between 10 and 2000 metres.");
  if (!Number.isFinite(l.lng) || l.lng < -180 || l.lng > 180) throw new Error("Longitude must be between -180 and 180.");
}

export const locationService = {
  async create(input: LocationInput) {
    validate(input);

    // Call backend API
    const res = await apiClient<any>("/locations", {
      method: "POST",
      body: JSON.stringify({
        name: input.name.trim(),
        description: input.description?.trim() || "",
        address: input.address.trim(),
        lat: input.lat,
        lng: input.lng,
        type: input.type,
        locationTypeId: input.locationTypeId,
        status: input.status,
        verificationRadius: input.verificationRadius,
      }),
    });

    const newLoc: VisitLocation = {
      ...input,
      id: res.id,
      lat: Number(res.lat),
      lng: Number(res.lng),
      verificationRadius: res.verificationRadius ?? input.verificationRadius ?? 100,
      createdAt: res.createdAt || new Date().toISOString(),
    };

    storage.update((d) => ({
      ...d,
      locations: [...d.locations.filter((l) => l.id !== newLoc.id), newLoc],
      activities: makeActivity(d, { kind: "info", actor: "ADMIN001", message: `Location ${input.name} was added.` }),
    }));

    return newLoc;
  },

  async update(id: string, input: LocationInput) {
    validate(input);

    // Call backend API
    const res = await apiClient<any>(`/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: input.name.trim(),
        description: input.description?.trim() || "",
        address: input.address.trim(),
        lat: input.lat,
        lng: input.lng,
        type: input.type,
        locationTypeId: input.locationTypeId,
        status: input.status,
        verificationRadius: input.verificationRadius,
      }),
    });

    storage.update((d) => ({
      ...d,
      locations: d.locations.map((l) =>
        l.id === id
          ? {
              ...l,
              ...input,
              lat: Number(res.lat),
              lng: Number(res.lng),
              verificationRadius: res.verificationRadius ?? input.verificationRadius ?? 100,
            }
          : l
      ),
    }));
  },

  async remove(id: string) {
    // Call backend API
    await apiClient(`/locations/${id}`, {
      method: "DELETE",
    });

    storage.update((d) => ({ ...d, locations: d.locations.filter((l) => l.id !== id) }));
  },
};

