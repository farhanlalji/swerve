import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.PARTICIPANT_SECRET;
  if (!s || s.length < 32) throw new Error("PARTICIPANT_SECRET is missing or shorter than 32 characters");
  return s;
}

/** A participant proves who they are with an HMAC of their id, issued when they first register. */
export const signParticipant = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url");

export function verifyParticipant(id: unknown, token: unknown): id is string {
  if (typeof id !== "string" || typeof token !== "string") return false;
  const a = Buffer.from(signParticipant(id)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isResearcher(key: string | null): boolean {
  const k = process.env.RESEARCH_KEY;
  if (!k || !key) return false;
  const a = Buffer.from(k), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
