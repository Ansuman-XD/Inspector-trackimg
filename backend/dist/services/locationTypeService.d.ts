import { type LocationTypeRecord } from "../repositories/locationTypeRepository.js";
export interface LocationTypeInput {
    name: string;
    code: string;
    description?: string;
}
export declare function validateLocationType(t: LocationTypeInput): void;
export declare const locationTypeService: {
    list(): Promise<LocationTypeRecord[]>;
    getById(id: string): Promise<LocationTypeRecord>;
    create(input: LocationTypeInput): Promise<LocationTypeRecord>;
    update(id: string, input: LocationTypeInput): Promise<LocationTypeRecord>;
    remove(id: string): Promise<void>;
};
