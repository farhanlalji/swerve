"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BENCH, CELLS, DEEPER_LEN, DEEPER_MIN, TYPES, cap, cellText, coreSequence, deeperSequence, desc, type Trial, type TypeKey
} from "@/lib/scenarios";
import { BLURBS, coreMetrics, deeperMetrics, type Answer, type DeeperMetrics } from "@/lib/metrics";
import { agreement, cleanNick, decode, encode, type Shared } from "@/lib/share";
import { AGES, GENDERS, PREFER_NOT, countryList, regionName } from "@/lib/countries";
import { sceneSVG } from "./scene";
import AdSlot from "./AdSlot";

/* ---------- Local storage (per-device conveniences only; research data goes to the server) ---------- */
const K = { demo: "swerve-demo", dir: "swerve-dir", me: "swerve-me", friends: "swerve-friends", deeper: "swerve-deeper", part: "swerve-participant", queue: "swerve-queue" };
const load = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

interface Demo { nick: string; age: string; gender: string; nationality: string; residence: string }
interface Participant { id: string; token: string }
type Row = Trial & { id: string; sessionId: string; runId: string | null; pos: number; choice: "act" | "leave"; side: "left" | "right"; input: string; rtMs: number; ts: number };
type View = "loading" | "onboard" | "play" | "profile" | "compare";
type Friend = Shared;

const fmt = (v: number | null | undefined, s = "%") => v === null || v === undefined ? "–" : `${v}${s}`;

/* ---------- Server sync ---------- */
function useSync() {
  const part = useRef<Participant | null>(null);
  const queue = useRef<Row[]>([]);
  const busy = useRef(false);
  const [online, setOnline] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => { part.current = load<Participant>(K.part); queue.current = load<Row[]>(K.queue) || []; }, []);

  const flush = useCallback(async (keepalive = false) => {
    if (busy.current || !part.current || queue.current.length === 0) return;
    busy.current = true;
    const batch = queue.current.slice(0, 60);
    try {
      const res = await fetch("/api/responses", { method: "POST", headers: { "content-type": "application/json" }, keepalive,
        body: JSON.stringify({ id: part.current.id, token: part.current.token, rows: batch }) });
      if (res.ok) {
        const sent = new Set(batch.map(r => r.id));
        queue.current = queue.current.filter(r => !sent.has(r.id)); save(K.queue, queue.current); setOnline("ok");
      } else setOnline("error");
    } catch { setOnline("error"); }
    busy.current = false;
    if (queue.current.length && !keepalive) setTimeout(() => flush(), 4000);
  }, []);

  const register = useCallback(async (demo: Demo, actRight: boolean, referred: boolean) => {
    let timezone = ""; try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* ignore */ }
    const body = {
      ...(part.current ? { id: part.current.id, token: part.current.token } : {}),
      consent: true, actSide: actRight ? "right" : "left", referred,
      age: demo.age || null, gender: demo.gender || null, nationality: demo.nationality || null, residence: demo.residence || null,
      timezone, language: navigator.language || "", device: matchMedia("(pointer: coarse)").matches ? "touch" : "desktop"
    };
    try {
      const res = await fetch("/api/participants", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { part.current = await res.json(); save(K.part, part.current); setOnline("ok"); flush(); }
      else setOnline("error");
    } catch { setOnline("error"); }
  }, [flush]);

  const record = useCallback((r: Row) => { queue.current.push(r); save(K.queue, queue.current); flush(); }, [flush]);

  useEffect(() => {
    const onHide = () => flush(true);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  return { register, record, online };
}

/* ---------- Main component ---------- */
export default function Game({ challengeCode }: { challengeCode?: string }) {
  const challenger = useMemo(() => decode(challengeCode), [challengeCode]);
  const [view, setView] = useState<View>("loading");
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [demo, setDemo] = useState<Demo>({ nick: "", age: "", gender: "", nationality: "", residence: "" });
  const [actRight, setActRight] = useState(true);
  const [me, setMe] = useState<Shared | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [deeper, setDeeper] = useState<DeeperMetrics | null>(null);
  const [seq, setSeq] = useState<Trial[]>([]);
  const [pos, setPos] = useState(0);
  const [mode, setMode] = useState<"core" | "deeper">("core");
  const answers = useRef<Row[]>([]);
  const session = useRef(uid());
  const runId = useRef<string | null>(null);
  const sync = useSync();

  // Restore per-device state after mount (localStorage is unavailable during server rendering).
  useEffect(() => {
    let dir = load<boolean>(K.dir);
    if (typeof dir !== "boolean") { dir = Math.random() < .5; save(K.dir, dir); }
    setActRight(dir);
    const d = load<Demo>(K.demo); if (d) setDemo(d);
    const m = load<Shared>(K.me); setMe(m);
    let fr = load<Friend[]>(K.friends) || [];
    if (challenger && !(m && challenger.nick === m.nick && challenger.bits.join("") === m.bits.join(""))) {
      fr = fr.filter(f => f.nick !== challenger.nick).concat([challenger]); save(K.friends, fr);
    }
    setFriends(fr);
    setDeeper(load<DeeperMetrics>(K.deeper));
    setView(m ? (challenger ? "compare" : "profile") : "onboard");
  }, [challenger]);

  useEffect(() => { window.scrollTo(0, 0); }, [view, step]);

  const startCore = (final: Demo) => {
    setDemo(final); save(K.demo, final);
    sync.register(final, actRight, !!challenger);
    answers.current = []; setMode("core"); setSeq(coreSequence()); setPos(0); setView("play");
  };
  const startDeeper = () => { runId.current = uid(); setMode("deeper"); setSeq(deeperSequence()); setPos(0); setView("play"); };

  const finishCore = () => {
    const core = answers.current.filter(r => r.mode === "core" && !r.isCatch);
    const bits = CELLS.map(c => (core.find(x => x.cell === c.cell)?.choice === "act" ? 1 : 0));
    const rts = core.map(r => r.rtMs).sort((a, b) => a - b);
    const mine = { nick: cleanNick(load<Demo>(K.demo)?.nick || demo.nick) || "player", bits, rt: rts[Math.floor(rts.length / 2)] || 0 };
    save(K.me, mine); setMe(mine);
    setView(challenger ? "compare" : "profile");
  };
  const finishDeeper = () => {
    const rows = answers.current.filter(r => r.mode === "deeper" && r.runId === runId.current);
    const m = deeperMetrics(rows as Answer[]); save(K.deeper, m); setDeeper(m); setView("profile");
    setTimeout(() => document.getElementById("deeperPanel")?.scrollIntoView({ block: "start" }), 50);
  };

  const decide = (side: "left" | "right", input: string, rtMs: number) => {
    const t = seq[pos];
    const row: Row = { ...t, id: uid(), sessionId: session.current, runId: t.mode === "deeper" ? runId.current : null, pos,
      choice: (side === "right") === actRight ? "act" : "leave", side, input, rtMs, ts: Date.now() };
    answers.current.push(row); sync.record(row);
    const next = pos + 1;
    if (next >= seq.length) return mode === "core" ? finishCore() : finishDeeper();
    setPos(next);
  };

  if (view === "loading") return <main className="app" aria-busy="true" />;

  return (
    <main className={"app"}>
      {view === "onboard" && <Onboard {...{ step, setStep, consent, setConsent, demo, setDemo, actRight, challenger, onDone: startCore }} />}
      {view === "play" && seq[pos] && (
        <Play key={`${mode}-${pos}`} t={seq[pos]} pos={pos} total={seq.length} actRight={actRight} onDecide={decide}
          canFinish={mode === "deeper" && pos >= DEEPER_MIN} onFinish={finishDeeper} />
      )}
      {view === "profile" && me && <Profile me={me} deeper={deeper} friends={friends} onDeeper={startDeeper} onCircle={() => setView("compare")} />}
      {view === "compare" && me && <Compare me={me} friend={challenger || friends[friends.length - 1] || null} friends={friends}
        onProfile={() => setView("profile")} onDeeper={startDeeper} />}
      {view !== "play" && <Status state={sync.online} />}
      {view !== "play" && view !== "onboard" && <AdSlot />}
      <footer className="site-foot"><Link href="/privacy">Privacy</Link><span>Swerve</span></footer>
    </main>
  );
}

function Status({ state }: { state: "idle" | "ok" | "error" }) {
  if (state === "idle") return null;
  return <div className="status"><span className={`dot ${state === "ok" ? "on" : ""}`} />{state === "ok" ? "Your answers are saved for the study" : "Offline: answers will be sent when you reconnect"}</div>;
}

/* ---------- Onboarding ---------- */
const STEPS = 6;
function Onboard(p: {
  step: number; setStep: (n: number) => void; consent: boolean; setConsent: (b: boolean) => void;
  demo: Demo; setDemo: (d: Demo) => void; actRight: boolean; challenger: Shared | null; onDone: (final: Demo) => void;
}) {
  const { step, demo } = p;
  const countries = useMemo(() => countryList(), []);
  const set = (k: keyof Demo, v: string) => p.setDemo({ ...demo, [k]: v });
  // `final` carries a value chosen on this tap, so the last step never reads stale state.
  const next = (final: Demo = demo) => (step < STEPS - 1 ? p.setStep(step + 1) : p.onDone(final));
  const choose = (k: keyof Demo, v: string) => { const d = { ...demo, [k]: v }; p.setDemo(d); next(d); };
  const chips = (opts: string[], k: keyof Demo) => (
    <div className="chips">
      {[...opts, PREFER_NOT].map(o => (
        <button key={o} className={`chip ${o === PREFER_NOT ? "wide" : ""} ${demo[k] === o ? "sel" : ""}`} onClick={() => choose(k, o)}>{o}</button>
      ))}
    </div>
  );
  const countrySelect = (id: string, k: "nationality" | "residence", label: string) => (
    <label className="f" htmlFor={id}>{label}
      <select id={id} value={demo[k]} onChange={e => set(k, e.target.value)}>
        <option value="">Choose a country</option>
        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        <option value="PNTS">{PREFER_NOT}</option>
      </select>
    </label>
  );
  const L = p.actRight ? "Leave it" : "Pull", R = p.actRight ? "Pull" : "Leave it";
  return (
    <>
      <div className="topbar">
        <div className="dots" aria-label={`Step ${step + 1} of ${STEPS}`}>{Array.from({ length: STEPS }, (_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
        {step > 0 ? <button className="link" onClick={() => p.setStep(step - 1)}>Back</button> : <span className="brand">Swerve</span>}
      </div>
      {step === 0 && <>
        <div className="stack"><span className="eyebrow">A moral choice experiment</span><h1>Swerve</h1>
          <p>A runaway trolley is coming. Twenty quick cards, one decision each: step in, or let it run. Then see how you compare.</p></div>
        {p.challenger && <div className="challenge"><b>{p.challenger.nick} challenged you</b><span>Play the same 20 dilemmas and see where you agree.</span></div>}
        <div className="legend">
          <div className={p.actRight ? "l" : "r"}><div className="k">← {L}</div><div className="muted">Swipe left</div></div>
          <div className={p.actRight ? "r" : "l"}><div className="k">{R} →</div><div className="muted">Swipe right</div></div>
        </div>
        <p className="note">Swipe directions are randomised per player, so check the arrows.</p>
        <label className="consent" htmlFor="consent">
          <input type="checkbox" id="consent" checked={p.consent} onChange={e => p.setConsent(e.target.checked)} />
          <span>I&apos;m 18 or over and agree that my anonymous answers, response times, approximate location, device time zone and language, and any profile questions I choose to answer can be used for research, as described in the <Link href="/privacy">privacy notice</Link>. I can stop at any time.</span>
        </label>
        <button className="primary" disabled={!p.consent} onClick={() => next()}>Get started</button>
      </>}
      {step === 1 && <>
        <div className="q">What should friends call you?</div>
        <p className="muted">Shown only in the challenge links you share. Letters and numbers, up to 12.</p>
        <input className="text" id="nick" maxLength={12} autoComplete="nickname" placeholder="e.g. sam" autoFocus value={demo.nick}
          onChange={e => set("nick", cleanNick(e.target.value))} onKeyDown={e => { if (e.key === "Enter") next(); }} />
        <button className="primary" onClick={() => { if (!demo.nick) { const d = { ...demo, nick: `player${Math.floor(Math.random() * 900 + 100)}` }; p.setDemo(d); next(d); } else next(); }}>Next</button>
      </>}
      {step === 2 && <><div className="q">How old are you?</div>{chips(AGES, "age")}</>}
      {step === 3 && <><div className="q">How do you describe your gender?</div>{chips(GENDERS, "gender")}</>}
      {step === 4 && <>
        <div className="q">What&apos;s your nationality?</div>{countrySelect("nat", "nationality", "Nationality")}
        <button className="primary" disabled={!demo.nationality} onClick={() => next()}>Next</button>
      </>}
      {step === 5 && <>
        <div className="q">Where do you live now?</div>
        {demo.nationality && demo.nationality !== "PNTS" && (
          <button className={`chip ${demo.residence === demo.nationality ? "sel" : ""}`} onClick={() => choose("residence", demo.nationality)}>
            Same as nationality: {regionName(demo.nationality)}
          </button>
        )}
        {countrySelect("res", "residence", "Country of residence")}
        <button className="primary" disabled={!demo.residence} onClick={() => next()}>Start the 20 dilemmas</button>
      </>}
      <div className="spacer" />
    </>
  );
}

/* ---------- One dilemma card ---------- */
function Play({ t, pos, total, actRight, onDecide, canFinish, onFinish }: {
  t: Trial; pos: number; total: number; actRight: boolean; onDecide: (side: "left" | "right", input: string, rtMs: number) => void;
  canFinish: boolean; onFinish: () => void;
}) {
  const card = useRef<HTMLDivElement>(null), stL = useRef<HTMLDivElement>(null), stR = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0), done = useRef(false), drag = useRef<{ x0: number; dx: number; id: number } | null>(null);
  useEffect(() => { shownAt.current = performance.now(); }, []);

  const go = useCallback((side: "left" | "right", input: string) => {
    if (done.current) return; done.current = true;
    const rt = Math.round(performance.now() - shownAt.current);
    const el = card.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return onDecide(side, input, rt);
    (side === "right" ? stR : stL).current!.style.opacity = "1";
    el.classList.add("fly");
    el.style.transform = `translateX(${side === "right" ? 140 : -140}%) rotate(${side === "right" ? 18 : -18}deg)`;
    el.style.opacity = "0";
    setTimeout(() => onDecide(side, input, rt), 280);
  }, [onDecide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") go("left", "key"); if (e.key === "ArrowRight") go("right", "key"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const down = (e: React.PointerEvent) => { if (done.current) return; drag.current = { x0: e.clientX, dx: 0, id: e.pointerId }; card.current!.setPointerCapture(e.pointerId); card.current!.classList.add("dragging"); card.current!.classList.remove("snap"); };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.x0;
    card.current!.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 22}deg)`;
    stR.current!.style.opacity = String(Math.max(0, Math.min(1, d.dx / 90))); stL.current!.style.opacity = String(Math.max(0, Math.min(1, -d.dx / 90)));
  };
  const up = () => {
    const d = drag.current; if (!d) return; drag.current = null; card.current!.classList.remove("dragging");
    if (Math.abs(d.dx) > 90) go(d.dx > 0 ? "right" : "left", "swipe");
    else { card.current!.classList.add("snap"); card.current!.style.transform = ""; stL.current!.style.opacity = stR.current!.style.opacity = "0"; }
  };

  const core = t.mode === "core", verb = t.mech === "push" ? "Push" : "Pull";
  const L = actRight ? "Leave" : verb, R = actRight ? verb : "Leave";
  const who = <><b>{desc(t.aType, t.aN)}{t.blame ? ", who ignored warning signs to walk on the track" : ""}</b></>;
  const likely = t.risk < 100 ? ` It will probably kill them (${t.risk}% chance).` : "";
  const dieLeave = `${cap(desc(t.aType, t.aN))} ${t.risk < 100 ? (t.aN === 1 ? "probably dies" : "probably die") : t.aN === 1 ? "dies" : "die"}`;
  const dieAct = t.bN ? `${cap(desc(t.bType, t.bN))} ${t.bN === 1 ? "dies" : "die"}` : "No one dies";
  const leaveBox = <div className="outcome l" key="l"><b>Leave it</b>{dieLeave}</div>, actBox = <div className="outcome r" key="r"><b>{verb}</b>{dieAct}</div>;
  const scene = useMemo(() => ({ __html: sceneSVG(t) }), [t]);

  return (
    <>
      <div className="topbar">
        <span className="eyebrow">{core ? `Dilemma ${pos + 1} of ${total}` : `Deeper · ${pos + 1} of ${DEEPER_LEN}`}</span>
        {core ? <span className="eyebrow">{t.mech === "push" ? "Footbridge" : "Switch"}</span>
          : canFinish ? <button className="link" onClick={onFinish}>See my score</button> : <span className="eyebrow">Score unlocks at {DEEPER_MIN}</span>}
      </div>
      <div className="progress"><i style={{ width: `${(pos / total) * 100}%` }} />{!core && <b className="mark" style={{ left: `${(DEEPER_MIN / DEEPER_LEN) * 100}%` }} />}</div>
      <div className="deck">
        <div className="ghost" />
        <div className="card" ref={card} tabIndex={0} aria-describedby="prompt" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className={`stamp ${actRight ? "leave" : "act"}`} style={{ left: 22, right: "auto", transform: "rotate(-8deg)" }} ref={stL}>{L}</div>
          <div className={`stamp ${actRight ? "act" : "leave"}`} style={{ right: 22, left: "auto", transform: "rotate(8deg)" }} ref={stR}>{R}</div>
          <div dangerouslySetInnerHTML={scene} />
          <p className="prompt" id="prompt">
            {t.mech === "push"
              ? <>A runaway trolley is heading toward {who}.{likely} You&apos;re on a footbridge next to <b>{desc(t.bType, 1)}</b>. Pushing them onto the track would stop the trolley, but they would die.</>
              : <>A runaway trolley is heading toward {who}.{likely} If you pull the lever it switches to a side track, {t.bN ? <>where it will kill <b>{desc(t.bType, t.bN)}</b></> : <b>which is empty</b>}.</>}
          </p>
          <div className="outcomes">{actRight ? [leaveBox, actBox] : [actBox, leaveBox]}</div>
        </div>
      </div>
      <div className="controls">
        <button className={actRight ? "bl" : "br"} onClick={() => go("left", "button")}>← {L}</button>
        <button className={actRight ? "br" : "bl"} onClick={() => go("right", "button")}>{R} →</button>
      </div>
      <p className="hint">Swipe the card, tap a button, or use your ← → keys.</p>
    </>
  );
}

/* ---------- Results ---------- */
const Pill = ({ act }: { act: number | boolean }) => act ? <span className="pill act">Act</span> : <span className="pill leave">Leave</span>;

function ShareBox({ me }: { me: Shared }) {
  const [label, setLabel] = useState("Share");
  const link = typeof window !== "undefined" ? `${window.location.origin}/c/${encode(me)}` : "";
  const input = useRef<HTMLInputElement>(null);
  const share = async () => {
    const text = `I'm ${coreMetrics(me.bits).archetype} on Swerve. Would you pull the lever? See where we agree:`;
    if (navigator.share) { try { await navigator.share({ title: "Swerve", text, url: link }); return; } catch { /* cancelled, fall through to copy */ } }
    try { await navigator.clipboard.writeText(link); setLabel("Copied"); setTimeout(() => setLabel("Share"), 1800); } catch { input.current?.select(); }
  };
  return (
    <div className="share">
      <input ref={input} readOnly value={link} aria-label="Your challenge link" onFocus={e => e.target.select()} />
      <button className="primary" onClick={share}>{label}</button>
    </div>
  );
}

function TypeBars({ types }: { types: DeeperMetrics["types"] }) {
  const rows = (Object.entries(types) as [TypeKey, { seen: number; spared: number }][]).filter(([, v]) => v.seen >= 2)
    .map(([k, v]) => ({ k, rate: v.spared / v.seen })).sort((a, b) => b.rate - a.rate);
  if (!rows.length) return <p className="note">Not enough dilemmas for this yet.</p>;
  return <div className="bars">{rows.map(r => (
    <div className="bar" key={r.k}><span>{TYPES[r.k].label}</span><span className="t"><i style={{ width: `${Math.round(r.rate * 100)}%` }} /></span><span className="n">{Math.round(r.rate * 100)}%</span></div>
  ))}</div>;
}

function Profile({ me, deeper, friends, onDeeper, onCircle }: { me: Shared; deeper: DeeperMetrics | null; friends: Friend[]; onDeeper: () => void; onCircle: () => void }) {
  const m = coreMetrics(me.bits);
  const gap = (a: number | null, b: number | null) => (a === null || b === null ? "–" : `${a}% vs ${b}%`);
  const small = { fontSize: 22, whiteSpace: "nowrap" as const };
  return (
    <>
      <div className="stack"><span className="eyebrow">Your moral profile · {me.nick}</span><h1>{m.archetype}</h1><p>{BLURBS[m.archetype]}</p></div>
      <div className="metrics">
        <div className="metric"><span className="eyebrow">Saves the most</span><span className="v">{fmt(m.util)}</span><span className="d">Acted when it saved 3 or 5 lives for 1</span></div>
        <div className="metric"><span className="eyebrow">Lever vs push</span><span className="v">{m.lever}<span className="muted" style={{ fontSize: 20 }}> / {m.push}</span></span><span className="d">% acting to save more, by switch and by footbridge</span></div>
        <div className="metric"><span className="eyebrow">Shields family</span><span className="v">{m.stranger - m.family} pts</span><span className="d">Less willing to sacrifice family than a stranger</span></div>
        <div className="metric"><span className="eyebrow">Median decision</span><span className="v">{(me.rt / 1000).toFixed(1)}s</span><span className="d">From card to swipe</span></div>
      </div>
      <div className="panel"><h3>You vs the world</h3>
        <div className="bench">{BENCH.map(b => <div className="line" key={b.cell}><span>{b.label}</span><span className="mono muted">World {b.world}%</span><Pill act={me.bits[b.cell]} /></div>)}</div>
        <p className="note">World figures are country-level averages from 70,000 people in 42 countries (Awad et al., PNAS 2020).</p>
      </div>
      <div className="panel"><h3>Challenge your friends</h3>
        <p className="note">They play the same 20 dilemmas and see where you agree. Your link carries only your nickname and answers.</p>
        <ShareBox me={me} />
        {friends.length > 0 && <button onClick={onCircle}>See your circle ({friends.length})</button>}
      </div>
      {deeper && (
        <div className="panel" id="deeperPanel">
          <span className="eyebrow">Deeper dilemmas · {deeper.n} of {DEEPER_LEN}{deeper.complete ? "" : " (stopped early)"}</span>
          <h3>Your deeper score</h3>
          <div className="metrics">
            <div className="metric"><span className="eyebrow">Saves the most</span><span className="v">{fmt(deeper.util)}</span><span className="d">Acted when it saved more people ({deeper.utilN} cards)</span></div>
            <div className="metric"><span className="eyebrow">Certain vs 60%</span><span className="v" style={small}>{gap(deeper.sure, deeper.unsure)}</span><span className="d">Acting to save more when death was certain vs only likely</span></div>
            <div className="metric"><span className="eyebrow">Innocent vs warned</span><span className="v" style={small}>{gap(deeper.innocent, deeper.blamed)}</span><span className="d">Acting to save more when those at risk were blameless vs had ignored warnings</span></div>
            <div className="metric"><span className="eyebrow">Lever vs push</span><span className="v" style={small}>{gap(deeper.lever, deeper.push)}</span><span className="d">Attention checks passed: {deeper.checks}</span></div>
          </div>
          <h3>Who you spared</h3><p className="note">How often each group survived your choice.</p><TypeBars types={deeper.types} />
        </div>
      )}
      <div className="row"><button className="primary" onClick={onDeeper}>{deeper ? "Play deeper dilemmas again" : "Deeper dilemmas"}</button></div>
      <p className="note">{DEEPER_LEN} cards that add uncertainty, blame and ten kinds of people. Your deeper score unlocks after {DEEPER_MIN}.</p>
    </>
  );
}

function Compare({ me, friend, friends, onProfile, onDeeper }: { me: Shared; friend: Friend | null; friends: Friend[]; onProfile: () => void; onDeeper: () => void }) {
  const mm = coreMetrics(me.bits);
  const circle = [{ ...me, nick: `${me.nick} (you)`, you: true }, ...friends.map(f => ({ ...f, you: false }))];
  const fastest = circle.reduce((a, b) => (b.rt && b.rt < a.rt ? b : a), circle[0]);
  const rows = circle.map(x => ({ ...x, m: coreMetrics(x.bits), a: x.you ? null : agreement(x.bits, me.bits) }))
    .sort((p, q) => (q.a ?? 99) - (p.a ?? 99));
  return (
    <>
      {friend && (() => {
        const a = agreement(friend.bits, me.bits), fm = coreMetrics(friend.bits);
        const diffs = CELLS.filter(c => friend.bits[c.cell] !== me.bits[c.cell]);
        return <>
          <div className="stack"><span className="eyebrow">You vs {friend.nick}</span>
            <div className="agree"><span className="big">{Math.round(100 * a / 18)}%</span><span>moral match. You agreed on {a} of 18 dilemmas.</span></div></div>
          <div className="panel"><div className="tablewrap"><table className="t">
            <thead><tr><th /><th>You</th><th>{friend.nick}</th></tr></thead>
            <tbody>
              <tr><td>Archetype</td><td>{mm.archetype}</td><td>{fm.archetype}</td></tr>
              <tr><td>Saves the most</td><td className="num">{mm.util}%</td><td className="num">{fm.util}%</td></tr>
              <tr><td>Lever / push</td><td className="num">{mm.lever} / {mm.push}</td><td className="num">{fm.lever} / {fm.push}</td></tr>
              <tr><td>Median decision</td><td className="num">{(me.rt / 1000).toFixed(1)}s</td><td className="num">{(friend.rt / 1000).toFixed(1)}s</td></tr>
            </tbody></table></div></div>
          {diffs.length ? (
            <div className="panel"><h3>Where you split</h3><div className="tablewrap"><table className="t">
              <thead><tr><th>Dilemma</th><th>You</th><th>{friend.nick}</th></tr></thead>
              <tbody>{diffs.map(c => <tr key={c.cell}><td>{cap(cellText(c))}</td><td><Pill act={me.bits[c.cell]} /></td><td><Pill act={friend.bits[c.cell]} /></td></tr>)}</tbody>
            </table></div></div>
          ) : <p>You made identical choices on every dilemma.</p>}
        </>;
      })()}
      <div className="panel"><h3>Your circle</h3>
        <div className="tablewrap"><table className="t">
          <thead><tr><th>Player</th><th>Archetype</th><th className="num">Match</th><th className="num">Saves most</th><th className="num">Speed</th></tr></thead>
          <tbody>{rows.map(x => (
            <tr key={x.nick}><td>{x.nick} {x.nick === fastest.nick && <span className="pill crown">Fastest</span>}</td><td>{x.m.archetype}</td>
              <td className="num">{x.a === null ? "–" : `${Math.round(100 * x.a / 18)}%`}</td><td className="num">{x.m.util}%</td><td className="num">{(x.rt / 1000).toFixed(1)}s</td></tr>
          ))}</tbody>
        </table></div>
        <p className="note">Everyone whose link you open joins your circle on this device.</p>
      </div>
      <div className="row"><button className="primary" onClick={onProfile}>Your profile and link</button><button onClick={onDeeper}>Deeper dilemmas</button></div>
    </>
  );
}
