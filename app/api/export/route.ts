import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { isResearcher } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const COLS = ["participant", "age_band", "gender", "nationality", "residence", "ip_country", "ip_region", "timezone", "language", "device",
  "act_side", "referred", "consent_version", "session_id", "run_id", "client_id", "mode", "position", "cell", "mech", "a_type", "a_n",
  "b_type", "b_n", "risk", "blame", "is_catch", "choice", "side", "input", "rt_ms", "answered_at"] as const;

async function fetchAll(table: string, columns: string) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    out.push(...(data as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) return out;
  }
}

/** Researcher export. `?format=csv` returns one row per swipe joined to the participant; default JSON returns both tables. */
export async function GET(req: Request) {
  if (!isResearcher(req.headers.get("x-research-key"))) return NextResponse.json({ error: "Wrong research key" }, { status: 401 });
  const format = new URL(req.url).searchParams.get("format");
  try {
    const [participants, responses] = await Promise.all([
      fetchAll("participants", "id,created_at,age_band,gender,nationality,residence,ip_country,ip_region,timezone,language,device,act_side,referred,consent_version"),
      fetchAll("responses", "participant,session_id,run_id,client_id,mode,position,cell,mech,a_type,a_n,b_type,b_n,risk,blame,is_catch,choice,side,input,rt_ms,answered_at")
    ]);
    if (format !== "csv") return NextResponse.json({ participants, responses });
    const byId = new Map(participants.map(p => [p.id as string, p]));
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [COLS.join(",")];
    for (const r of responses) {
      const p = byId.get(r.participant as string) || {};
      const row: Record<string, unknown> = { ...p, ...r };
      lines.push(COLS.map(c => esc(row[c])).join(","));
    }
    return new NextResponse(lines.join("\n"), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="swerve-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" }
    });
  } catch {
    return NextResponse.json({ error: "Could not load data" }, { status: 500 });
  }
}
