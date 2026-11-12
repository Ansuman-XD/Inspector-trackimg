import { hash, verify } from "@node-rs/argon2";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await verify(hash, plain);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
