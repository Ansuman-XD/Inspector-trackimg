export interface VisitMonitoringRow {
    id: string;
    employeeId: string;
    employeeName: string;
    department: string;
    locationId: string;
    locationName: string;
    locationType: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    priority: "high" | "medium" | "low";
    source: "admin" | "self";
    status: string;
    notes: string;
    startedAt: Date | null;
    reachedAt: Date | null;
    verifiedAt: Date | null;
    checkIn: {
        at: Date | null;
        distanceM: number | null;
        accuracyM: number | null;
        verification: string | null;
        photoSha256: string | null;
        overrideReason: string | null;
    } | null;
    checkOut: {
        at: Date | null;
        distanceM: number | null;
        accuracyM: number | null;
        verification: string | null;
        photoSha256: string | null;
        overrideReason: string | null;
    } | null;
}
export declare const monitoringRepository: {
    getMonitoringData(filters?: {
        date?: string;
        employeeId?: string;
        locationId?: string;
        status?: string;
        from?: string;
        to?: string;
        department?: string;
    }): Promise<VisitMonitoringRow[]>;
};
