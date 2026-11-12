import { type LocationRecord } from "../repositories/locationRepository.js";
export interface LocationInput {
    name: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    type?: string;
    locationTypeId?: string;
    status?: "active" | "inactive";
    verificationRadius?: number;
}
export declare function validateLocation(l: LocationInput): void;
export declare const locationService: {
    list(): Promise<LocationRecord[]>;
    getById(id: string): Promise<LocationRecord>;
    create(input: LocationInput): Promise<LocationRecord>;
    update(id: string, input: LocationInput): Promise<LocationRecord>;
    remove(id: string): Promise<void>;
};
