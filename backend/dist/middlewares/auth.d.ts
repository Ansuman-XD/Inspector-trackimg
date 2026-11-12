import type { MiddlewareHandler } from "hono";
import { type AccessTokenPayload } from "../lib/jwt.js";
declare module "hono" {
    interface ContextVariableMap {
        user: AccessTokenPayload;
    }
}
export declare const requireAuth: MiddlewareHandler;
export declare const requireRole: (allowedRole: "admin" | "employee") => MiddlewareHandler;
export declare const requireAdmin: MiddlewareHandler;
