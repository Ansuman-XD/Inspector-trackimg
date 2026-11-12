/**
 * Server-side Haversine distance in metres (Earth radius R = 6,371,000 m).
 */
export declare function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Current date in Asia/Kolkata (IST) as YYYY-MM-DD.
 */
export declare function todayIST(d?: Date): string;
/**
 * Minutes since midnight in Asia/Kolkata (IST).
 */
export declare function istMinutes(d?: Date): number;
export declare const CUTOFF_MINUTES: number;
/**
 * True when the given date is today in IST and 9:00 AM has passed.
 */
export declare function isPastCutoff(date: string, now?: Date): boolean;
/**
 * Was the task created before 9:00 AM IST on its visit date (or on an earlier day)?
 */
export declare function isPlannedBeforeCutoff(taskCreatedAt: Date, visitDate: string): boolean;
/**
 * Construct task datetime in IST as a Date.
 */
export declare function taskDateTimeIST(date: string, hhmm: string): Date;
