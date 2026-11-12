import { locationRepository, type LocationRecord } from "../repositories/locationRepository.js";
import { locationTypeRepository } from "../repositories/locationTypeRepository.js";
import { ServiceError } from "../lib/errors.js";

export interface LocationInput {
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  type?: string; // location type name or ID
  locationTypeId?: string;
  status?: "active" | "inactive";
  verificationRadius?: number;
}

export function validateLocation(l: LocationInput) {
  if (!l.name || l.name.trim().length < 3) throw new ServiceError("Enter a location name.", 400);
  if (!l.address || !l.address.trim()) throw new ServiceError("Enter the address.", 400);
  if (!Number.isFinite(l.lat) || l.lat < -90 || l.lat > 90) throw new ServiceError("Latitude must be between -90 and 90.", 400);
  if (!Number.isFinite(l.verificationRadius ?? 100) || (l.verificationRadius ?? 100) < 10 || (l.verificationRadius ?? 100) > 2000) {
    throw new ServiceError("Verification radius must be between 10 and 2000 metres.", 400);
  }
  if (!Number.isFinite(l.lng) || l.lng < -180 || l.lng > 180) throw new ServiceError("Longitude must be between -180 and 180.", 400);
}

export const locationService = {
  async list(): Promise<LocationRecord[]> {
    return locationRepository.findAll();
  },

  async getById(id: string): Promise<LocationRecord> {
    const loc = await locationRepository.findById(id);
    if (!loc) throw new ServiceError("Location not found", 404);
    return loc;
  },

  async create(input: LocationInput): Promise<LocationRecord> {
    validateLocation(input);
    const name = input.name.trim();

    const existingName = await locationRepository.findByName(name);
    if (existingName) {
      throw new ServiceError("A location with this name already exists.", 409);
    }

    // Resolve location type
    let locType = null;
    if (input.locationTypeId) {
      locType = await locationTypeRepository.findById(input.locationTypeId);
    } else if (input.type) {
      locType = (await locationTypeRepository.findByName(input.type)) || (await locationTypeRepository.findById(input.type));
    }

    if (!locType) {
      // Fallback or create default
      const allTypes = await locationTypeRepository.findAll();
      locType = allTypes[0];
      if (!locType) {
        throw new ServiceError("No location types available. Create one first.", 400);
      }
    }

    const id = `LOC-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    return locationRepository.create({
      id,
      name,
      description: input.description?.trim() || "",
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      locationTypeId: locType.id,
      type: locType.name,
      status: input.status || "active",
      verificationRadius: input.verificationRadius ?? 100,
    });
  },

  async update(id: string, input: LocationInput): Promise<LocationRecord> {
    validateLocation(input);
    const existing = await locationRepository.findById(id);
    if (!existing) throw new ServiceError("Location not found", 404);

    const name = input.name.trim();
    const existingName = await locationRepository.findByName(name);
    if (existingName && existingName.id !== id) {
      throw new ServiceError("A location with this name already exists.", 409);
    }

    let typeId = existing.locationTypeId;
    let typeName = existing.type;
    if (input.locationTypeId || input.type) {
      const target = input.locationTypeId || input.type!;
      const locType = (await locationTypeRepository.findById(target)) || (await locationTypeRepository.findByName(target));
      if (locType) {
        typeId = locType.id;
        typeName = locType.name;
      }
    }

    const updated = await locationRepository.update(id, {
      name,
      description: input.description?.trim() ?? existing.description,
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      locationTypeId: typeId,
      type: typeName,
      status: input.status ?? existing.status,
      verificationRadius: input.verificationRadius ?? existing.verificationRadius,
    });

    if (!updated) throw new ServiceError("Failed to update location", 500);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const existing = await locationRepository.findById(id);
    if (!existing) throw new ServiceError("Location not found", 404);

    // Referential delete guard
    const taskCount = await locationRepository.countTasks(id);
    if (taskCount > 0) {
      throw new ServiceError("This location has visit records. Mark it inactive instead of deleting.", 409);
    }

    await locationRepository.remove(id);
  },
};
