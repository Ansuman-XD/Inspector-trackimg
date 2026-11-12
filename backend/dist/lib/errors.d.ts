export declare class ServiceError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
