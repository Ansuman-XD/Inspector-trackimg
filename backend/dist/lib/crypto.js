import { hash, verify } from "@node-rs/argon2";
import crypto from "crypto";
export async function hashPassword(password) {
    return hash(password);
}
export async function verifyPassword(hash, plain) {
    try {
        return await verify(hash, plain);
    }
    catch {
        return false;
    }
}
export function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
