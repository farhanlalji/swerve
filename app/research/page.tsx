"use client";

import { useState } from "react";
import { COUNTS, MECHS, TYPES, WHO } from "@/lib/scenarios";
import { pct } from "@/lib/metrics";

type Resp = { participant: string; mode: string; cell: number; is_catch: boolean; choice: string; side: string; rt_ms: number };
type Part = { id: string; act_side: string };

export default function Research() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<{ participants: Part[]; responses: Resp[] } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/export", { headers: { "x-research-key": key } });
      if (!res.ok) throw new Error(res.status === 401 ? "That research key isn't right." : "Couldn't load responses. Try again.");
      setData(await res.json());
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const csv = async () => {
    const res = await fetch("/api/export?format=csv", { headers: { "x-research-key": key } });
    if (!res.ok) { setErr("Couldn't build the CSV."); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = `swerve-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return (
    <main className="app">
      <div className="stack"><span className="eyebrow">Researcher view</span><h2>Swerve responses</h2></div>
      <form className="stack" onSubmit={e => { e.preventDefault(); load(); }}>
        <label className="f" htmlFor="key">Research key<input className="text" id="key" type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="current-password" /></label>
        <button className="primary" disabled={!key || busy}>{busy ? "Loading…" : "Open"}</button>
        {err && <p className="error">{err}</p>}
      </form>
    </main>
  );

  const core = data.responses.filter(r => r.mode === "core" && !r.is_catch);
  const checks = data.responses.filter(r => r.is_catch);
  const actRate = (xs: Resp[]) => pct(xs.filter(r => r.choice === "act").length, xs.length);
  const rts = core.map(r => r.rt_ms).sort((a, b) => a - b);
  const sideOf = new Map(data.participants.map(p => [p.id, p.act_side]));
  const cell = (c: number) => { const xs = core.filter(r => r.cell === c); return { p: actRate(xs), n: xs.length }; };

  return (
    <main className="app wide">
      <div className="topbar"><div className="stack" style={{ gap: 4 }}><span className="eyebrow">Researcher view</span><h2>Swerve responses</h2></div>
        <div className="row"><button onClick={load}>Refresh</button><button className="primary" onClick={csv}>Export CSV</button></div></div>
      <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <div className="metric"><span className="eyebrow">Participants</span><span className="v">{data.participants.length}</span></div>
        <div className="metric"><span className="eyebrow">Core answers</span><span className="v">{core.length}</span></div>
        <div className="metric"><span className="eyebrow">Deeper answers</span><span className="v">{data.responses.filter(r => r.mode === "deeper").length}</span></div>
        <div className="metric"><span className="eyebrow">Attention checks</span><span className="v">{pct(checks.filter(r => r.choice === "act").length, checks.length) ?? "–"}%</span><span className="d">passed, n={checks.length}</span></div>
        <div className="metric"><span className="eyebrow">Median time</span><span className="v">{rts.length ? `${(rts[Math.floor(rts.length / 2)] / 1000).toFixed(1)}s` : "–"}</span></div>
        <div className="metric"><span className="eyebrow">Swipe-side check</span><span className="v">{actRate(core.filter(r => sideOf.get(r.participant) === "right")) ?? "–"}/{actRate(core.filter(r => sideOf.get(r.participant) === "left")) ?? "–"}</span><span className="d">% acting when act is right / left</span></div>
      </div>
      <div className="panel"><h3>Core design: % who acted, by cell</h3>
        <p className="note">Main track holds strangers. Columns show how many die if you leave it; one person dies if you act.</p>
        <div className="tablewrap"><table className="t heat"><thead><tr><th>Mechanism · the one</th>{COUNTS.map(n => <th key={n} className="num">{n} vs 1</th>)}</tr></thead>
          <tbody>{MECHS.flatMap((m, mi) => WHO.map((w, wi) => (
            <tr key={`${m}-${w}`}><td>{m === "lever" ? "Switch" : "Footbridge"} · {TYPES[w].label}</td>
              {COUNTS.map((n, ri) => { const c = cell(mi * 9 + ri * 3 + wi); return <td key={n} className="num">{c.p ?? "–"}% <span className="muted" style={{ fontWeight: 400 }}>n={c.n}</span></td>; })}</tr>
          )))}</tbody></table></div>
        <p className="note">Benchmarks for the 5 vs 1 stranger cells: Switch 81%, Footbridge 51% (Awad et al. 2020).</p>
      </div>
      <p className="note">The CSV has one row per swipe with scenario variables, choice, swipe side, input method, response time, and the participant&apos;s optional profile answers, inferred country and region, time zone, language and device. Nicknames and IP addresses are never stored.</p>
    </main>
  );
}
