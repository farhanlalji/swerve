import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { verifyParticipant } from "@/lib/server/auth";
import { parseResponse } from "@/lib/validate";

/** Save a batch of swipes. Retries are safe: (participant, client_id) is unique. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!verifyParticipant(body.id, body.token)) return NextResponse.json({ error: "Unknown participant" }, { status: 401 });
  if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 60) {
    return NextResponse.json({ error: "Send between 1 and 60 rows" }, { status: 400 });
  }
  const rows = [];
  for (const r of body.rows) {
    const row = r && typeof r === "object" ? parseResponse(r as Record<string, unknown>) : null;
    if (!row) return NextResponse.json({ error: "A row failed validation" }, { status: 400 });
    rows.push({ ...row, participant: body.id });
  }
  const { error } = await db().from("responses").upsert(rows, { onConflict: "participant,client_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ saved: rows.length });
}
