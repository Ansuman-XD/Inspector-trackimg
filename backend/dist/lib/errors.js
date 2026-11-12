export class ServiceError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
        this.name = "ServiceError";
    }
}
