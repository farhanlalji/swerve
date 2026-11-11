// Input validation for the API routes. Kept dependency-free and unit-tested.
import { AGES, GENDERS, ISO_SET, PREFER_NOT } from "./countries";
import { TYPE_KEYS, type TypeKey } from "./scenarios";

export const CONSENT_VERSION = "2026-11-v1";

const str = (v: unknown, max = 64) => typeof v === "string" && v.length <= max ? v : null;
const oneOf = <T extends string>(v: unknown, opts: readonly T[]) => (typeof v === "string" && (opts as readonly string[]).includes(v) ? v as T : null);
const int = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? v as number : null;

export interface ParticipantInput {
  age_band: string | null; gender: string | null; nationality: string | null; residence: string | null;
  timezone: string | null; language: string | null; device: string | null;
  act_side: "left" | "right"; referred: boolean; consent_version: string;
}

export function parseParticipant(b: Record<string, unknown>): ParticipantInput | null {
  const act_side = oneOf(b.actSide, ["left", "right"] as const);
  if (!act_side || b.consent !== true) return null;
  const country = (v: unknown) => { const s = str(v, 8); return s && ISO_SET.has(s) ? s : null; };
  return {
    age_band: oneOf(b.age, [...AGES, PREFER_NOT]),
    gender: oneOf(b.gender, [...GENDERS, PREFER_NOT]),
    nationality: country(b.nationality),
    residence: country(b.residence),
    timezone: str(b.timezone, 64),
    language: str(b.language, 35),
    device: oneOf(b.device, ["touch", "desktop"] as const),
    act_side,
    referred: b.referred === true,
    consent_version: CONSENT_VERSION
  };
}

export interface ResponseRow {
  client_id: string; session_id: string; run_id: string | null; mode: "core" | "deeper"; position: number; cell: number;
  mech: "lever" | "push"; a_type: TypeKey; a_n: number; b_type: TypeKey; b_n: number; risk: number; blame: boolean;
  is_catch: boolean; choice: "act" | "leave"; side: "left" | "right"; input: string; rt_ms: number; answered_at: string;
}

export function parseResponse(r: Record<string, unknown>): ResponseRow | null {
  const id = (v: unknown) => { const s = str(v, 40); return s && /^[a-z0-9]+$/i.test(s) ? s : null; };
  const ts = typeof r.ts === "number" && Number.isFinite(r.ts) ? new Date(r.ts) : null;
  const row = {
    client_id: id(r.id), session_id: id(r.sessionId), run_id: r.runId == null ? null : id(r.runId),
    mode: oneOf(r.mode, ["core", "deeper"] as const), position: int(r.pos, 0, 29), cell: int(r.cell, -1, 17),
    mech: oneOf(r.mech, ["lever", "push"] as const),
    a_type: oneOf(r.aType, TYPE_KEYS), a_n: int(r.aN, 1, 5), b_type: oneOf(r.bType, TYPE_KEYS), b_n: int(r.bN, 0, 5),
    risk: int(r.risk ?? 100, 1, 100), blame: r.blame === true, is_catch: r.isCatch === true,
    choice: oneOf(r.choice, ["act", "leave"] as const), side: oneOf(r.side, ["left", "right"] as const),
    input: oneOf(r.input, ["swipe", "button", "key"] as const), rt_ms: int(r.rtMs, 0, 600000),
    answered_at: ts && Math.abs(ts.getTime() - Date.now()) < 7 * 864e5 ? ts.toISOString() : null
  };
  if (r.runId != null && !row.run_id) return null;
  for (const [k, v] of Object.entries(row)) if (v === null && k !== "run_id") return null;
  return row as ResponseRow;
}
