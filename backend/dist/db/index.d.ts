import * as schema from "./schema.js";
export declare const db: import("drizzle-orm/neon-http").NeonHttpDatabase<typeof schema> & {
    $client: import("@neondatabase/serverless").NeonQueryFunction<false, false>;
};
/**
 * Verifies active database connectivity by executing a lightweight query.
 */
export declare function checkDatabaseConnection(): Promise<{
    ok: boolean;
    message: string;
    version?: string;
}>;
export { schema };
