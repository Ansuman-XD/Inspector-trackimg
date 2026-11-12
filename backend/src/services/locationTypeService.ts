import { locationTypeRepository, type LocationTypeRecord } from "../repositories/locationTypeRepository.js";
import { ServiceError } from "../lib/errors.js";

export interface LocationTypeInput {
  name: string;
  code: string;
  description?: string;
}

export function validateLocationType(t: LocationTypeInput) {
  if (!t.name || t.name.trim().length < 2) {
    throw new ServiceError("Enter a location type name.", 400);
  }
  if (!t.code || !/^[A-Za-z&/ ]{1,6}$/.test(t.code.trim())) {
    throw new ServiceError("Code must be 1–6 letters (e.g. JST, BRG).", 400);
  }
}

export const locationTypeService = {
  async list(): Promise<LocationTypeRecord[]> {
    return locationTypeRepository.findAll();
  },

  async getById(id: string): Promise<LocationTypeRecord> {
    const type = await locationTypeRepository.findById(id);
    if (!type) throw new ServiceError("Location type not found", 404);
    return type;
  },

  async create(input: LocationTypeInput): Promise<LocationTypeRecord> {
    validateLocationType(input);
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    const existingName = await locationTypeRepository.findByName(name);
    if (existingName) {
      throw new ServiceError("A location type with this name already exists.", 409);
    }

    const existingCode = await locationTypeRepository.findByCode(code);
    if (existingCode) {
      throw new ServiceError("A location type with this code already exists.", 409);
    }

    const id = `LTP-${code.replace(/\W/g, "") || Date.now().toString(36).toUpperCase()}`;

    return locationTypeRepository.create({
      id,
      name,
      code,
      description: input.description?.trim() || null,
    });
  },

  async update(id: string, input: LocationTypeInput): Promise<LocationTypeRecord> {
    validateLocationType(input);
    const existing = await locationTypeRepository.findById(id);
    if (!existing) throw new ServiceError("Location type not found", 404);

    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    const existingName = await locationTypeRepository.findByName(name);
    if (existingName && existingName.id !== id) {
      throw new ServiceError("A location type with this name already exists.", 409);
    }

    const existingCode = await locationTypeRepository.findByCode(code);
    if (existingCode && existingCode.id !== id) {
      throw new ServiceError("A location type with this code already exists.", 409);
    }

    const updated = await locationTypeRepository.update(id, {
      name,
      code,
      description: input.description?.trim() || null,
    });

    if (!updated) throw new ServiceError("Failed to update location type", 500);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const existing = await locationTypeRepository.findById(id);
    if (!existing) throw new ServiceError("Location type not found", 404);

    // Referential delete guard
    const locationCount = await locationTypeRepository.countLocations(id);
    if (locationCount > 0) {
      throw new ServiceError("Locations still use this type. Move them to another type first.", 409);
    }

    await locationTypeRepository.remove(id);
  },
};
