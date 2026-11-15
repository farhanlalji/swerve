import { NextResponse } from "next/server";
import { db, geoFrom } from "@/lib/server/db";
import { signParticipant, verifyParticipant } from "@/lib/server/auth";
import { parseParticipant } from "@/lib/validate";

/** Register a participant (or update their profile answers) and return a signed token for later writes. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const p = parseParticipant(body);
  if (!p) return NextResponse.json({ error: "Consent and a swipe side are required" }, { status: 400 });

  const geo = geoFrom(req.headers);
  if (body.id !== undefined) {
    if (!verifyParticipant(body.id, body.token)) return NextResponse.json({ error: "Unknown participant" }, { status: 401 });
    // Keep the consent version the participant first agreed to: answers given under an earlier notice stay under its terms.
    const { consent_version: _keep, ...profile } = p;
    const { error } = await db().from("participants").update({ ...profile, updated_at: new Date().toISOString() }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
    return NextResponse.json({ id: body.id, token: body.token });
  }
  const { data, error } = await db().from("participants").insert({ ...p, ...geo }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ id: data.id, token: signParticipant(data.id) });
}

/** Delete a participant and, by cascade, all their responses. Proven with the token issued at registration. */
export async function DELETE(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!verifyParticipant(body.id, body.token)) return NextResponse.json({ error: "Unknown participant" }, { status: 401 });
  const { error } = await db().from("participants").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
