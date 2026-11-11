import { CELLS } from "./scenarios";

export interface Shared { nick: string; bits: number[]; rt: number }

/** A challenge code: `<nick>-<4 base36 chars for 18 answers><2 base36 chars for median time in 100 ms>`. */
export function encode(me: Shared): string {
  const n = me.bits.reduce((s, b, i) => s + (b ? 2 ** i : 0), 0);
  const rt = Math.max(0, Math.min(1295, Math.round((me.rt || 0) / 100)));
  return `${cleanNick(me.nick) || "player"}-${n.toString(36).padStart(4, "0")}${rt.toString(36).padStart(2, "0")}`;
}

export function decode(code: string | null | undefined): Shared | null {
  const m = /^([a-z0-9]{1,12})-([0-9a-z]{4})([0-9a-z]{2})$/.exec((code || "").toLowerCase());
  if (!m) return null;
  const n = parseInt(m[2], 36);
  if (!(n >= 0 && n < 2 ** CELLS.length)) return null;
  return { nick: m[1], bits: CELLS.map((_, i) => Math.floor(n / 2 ** i) % 2), rt: parseInt(m[3], 36) * 100 };
}

export const cleanNick = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);

export const agreement = (a: number[], b: number[]) => a.filter((x, i) => x === b[i]).length;
