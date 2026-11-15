"use client";
import { useEffect, useState } from "react";

// Deletes this device's participant record (and, by cascade, every answer) using the signed token
// issued at registration, then clears Swerve's local storage so the device starts fresh.
const PART_KEY = "swerve-participant";

type State = "loading" | "none" | "ready" | "confirm" | "busy" | "done" | "error";

export default function DeleteMyData() {
  const [state, setState] = useState<State>("loading");
  const [part, setPart] = useState<{ id: string; token: string } | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(PART_KEY);
      const p = v ? JSON.parse(v) : null;
      if (p && typeof p.id === "string" && typeof p.token === "string") { setPart(p); setState("ready"); }
      else setState("none");
    } catch { setState("none"); }
  }, []);

  const clearDevice = () => {
    try { Object.keys(localStorage).filter(k => k.startsWith("swerve-")).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
  };

  const remove = async () => {
    if (!part) return;
    setState("busy");
    try {
      const res = await fetch("/api/participants", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(part) });
      if (!res.ok) throw new Error();
      clearDevice(); setPart(null); setState("done");
    } catch { setState("error"); }
  };

  if (state === "loading") return null;
  if (state === "none") return <p className="muted">There are no Swerve answers linked to this device. If you played on another device or browser, open this page there, or email us.</p>;
  if (state === "done") return <p role="status"><b>Done.</b> Your answers have been deleted from our database and Swerve has been reset on this device.</p>;
  return (
    <div className="stack">
      {state === "confirm" || state === "busy" ? <>
        <p>This permanently deletes every answer from this device, and resets your results and challenge history here. It can&apos;t be undone.</p>
        <div className="row">
          <button className="primary" onClick={remove} disabled={state === "busy"}>{state === "busy" ? "Deleting…" : "Yes, delete everything"}</button>
          <button onClick={() => setState("ready")} disabled={state === "busy"}>Cancel</button>
        </div>
      </> : <>
        <p className="muted">Answers from this device are stored with us. You can delete them all now.</p>
        <div><button onClick={() => setState("confirm")}>Delete my data</button></div>
        {state === "error" && <p className="error" role="alert">That didn&apos;t work. Please try again, or email us.</p>}
      </>}
    </div>
  );
}
