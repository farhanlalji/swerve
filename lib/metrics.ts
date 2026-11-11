import { CELLS, DEEPER_LEN, TYPES, type Trial, type TypeKey } from "./scenarios";

export const pct = (a: number, b: number): number | null => b ? Math.round(100 * a / b) : null;

export type Archetype = "The Bystander" | "The Loyalist" | "The Switchman" | "The Calculator" | "The Weigher";
export const BLURBS: Record<Archetype, string> = {
  "The Bystander": "You rarely intervene, even when it would save more lives.",
  "The Loyalist": "You'll trade strangers for strangers, but not your own people.",
  "The Switchman": "You'll pull a lever to save more, but you won't lay hands on anyone.",
  "The Calculator": "You act to save the most lives, whoever is on the track and however you'd have to do it.",
  "The Weigher": "You judge case by case: who is involved and how you'd act both matter."
};

export interface CoreMetrics {
  util: number; lever: number; push: number; even: number;
  stranger: number; child: number; family: number; archetype: Archetype;
}

/** Scores from the 18 core answers (1 = acted). */
export function coreMetrics(bits: number[]): CoreMetrics {
  const sel = (f: (c: Trial) => boolean) => CELLS.filter(f).map(c => bits[c.cell] ? 1 : 0);
  const rate = (a: number[]) => pct(a.reduce((s, b) => s + b, 0), a.length) ?? 0;
  const more = (c: Trial) => c.aN > 1;
  const m = {
    util: rate(sel(more)),
    lever: rate(sel(c => more(c) && c.mech === "lever")),
    push: rate(sel(c => more(c) && c.mech === "push")),
    even: rate(sel(c => c.aN === 1 && c.bType === "stranger")),
    stranger: rate(sel(c => more(c) && c.bType === "stranger")),
    child: rate(sel(c => more(c) && c.bType === "child")),
    family: rate(sel(c => more(c) && c.bType === "family"))
  };
  const archetype: Archetype = m.util <= 33 ? "The Bystander"
    : m.stranger - m.family >= 50 ? "The Loyalist"
    : m.lever - m.push >= 50 ? "The Switchman"
    : m.util >= 83 ? "The Calculator" : "The Weigher";
  return { ...m, archetype };
}

export interface Answer extends Trial { choice: "act" | "leave"; rtMs: number }

export interface DeeperMetrics {
  n: number; complete: boolean; util: number | null; utilN: number;
  sure: number | null; unsure: number | null; blamed: number | null; innocent: number | null;
  lever: number | null; push: number | null; checks: string;
  types: Partial<Record<TypeKey, { seen: number; spared: number }>>;
}

export function deeperMetrics(rows: Answer[]): DeeperMetrics {
  const real = rows.filter(r => !r.isCatch), checks = rows.filter(r => r.isCatch);
  const human = (r: Answer) => r.aType !== "dog" && r.bType !== "dog";
  const more = real.filter(r => human(r) && r.bN < r.aN);
  const actRate = (xs: Answer[]) => pct(xs.filter(r => r.choice === "act").length, xs.length);
  const types: DeeperMetrics["types"] = {};
  for (const r of real) {
    for (const [k, spared] of [[r.aType, r.choice === "act"], [r.bType, r.choice !== "act"]] as [TypeKey, boolean][]) {
      const t = (types[k] ||= { seen: 0, spared: 0 }); t.seen++; if (spared) t.spared++;
    }
  }
  return {
    n: rows.length, complete: rows.length >= DEEPER_LEN,
    util: actRate(more), utilN: more.length,
    sure: actRate(more.filter(r => r.risk === 100)), unsure: actRate(more.filter(r => r.risk < 100)),
    blamed: actRate(more.filter(r => r.blame)), innocent: actRate(more.filter(r => !r.blame)),
    lever: actRate(more.filter(r => r.mech === "lever")), push: actRate(more.filter(r => r.mech === "push")),
    checks: `${checks.filter(r => r.choice === "act").length}/${checks.length}`, types
  };
}

export const typeLabel = (k: TypeKey) => TYPES[k].label;
