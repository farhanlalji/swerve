// Scenario model shared by the game, the metrics and the server-side validation.

export type TypeKey =
  | "stranger" | "child" | "elderly" | "doctor" | "criminal"
  | "pregnant" | "homeless" | "family" | "friend" | "dog";
export type Kind = "adult" | "child" | "elder" | "dog";
export type Mech = "lever" | "push";
export type Mode = "core" | "deeper";

export interface TypeDef { one: string; many?: string; label: string; w: number; kind: Kind; only1?: boolean }

export const TYPES: Record<TypeKey, TypeDef> = {
  stranger: { one: "a stranger", many: "strangers", label: "Stranger", w: 4, kind: "adult" },
  child:    { one: "a child", many: "children", label: "Child", w: 1.2, kind: "child" },
  elderly:  { one: "an elderly person", many: "elderly people", label: "Elderly person", w: 1, kind: "elder" },
  doctor:   { one: "a doctor", many: "doctors", label: "Doctor", w: 1, kind: "adult" },
  criminal: { one: "a convicted criminal", many: "convicted criminals", label: "Convicted criminal", w: 1, kind: "adult" },
  pregnant: { one: "a pregnant woman", many: "pregnant women", label: "Pregnant woman", w: .8, kind: "adult" },
  homeless: { one: "a homeless person", many: "homeless people", label: "Homeless person", w: .8, kind: "adult" },
  family:   { one: "a member of your family", label: "Your family", w: .6, kind: "adult", only1: true },
  friend:   { one: "your best friend", label: "Your best friend", w: .6, kind: "adult", only1: true },
  dog:      { one: "a dog", many: "dogs", label: "Dog", w: .8, kind: "dog" }
};
export const TYPE_KEYS = Object.keys(TYPES) as TypeKey[];

export interface Trial {
  mode: Mode;
  cell: number;       // 0..17 in the core design, -1 otherwise
  mech: Mech;
  aType: TypeKey; aN: number;   // main track: dies if you leave it
  bType: TypeKey; bN: number;   // side track / footbridge: dies if you act
  isCatch: boolean;
  risk: number;       // % chance the main-track group dies if left (100 = certain)
  blame: boolean;     // main-track group ignored warnings
}

// Core design: 2 mechanisms x 3 counts x 3 identities = 18 cells. cell = m*9 + r*3 + w
export const MECHS: Mech[] = ["lever", "push"];
export const COUNTS = [1, 3, 5];
export const WHO: TypeKey[] = ["stranger", "child", "family"];
export const CELLS: Trial[] = [];
MECHS.forEach((mech, mi) => COUNTS.forEach((aN, ri) => WHO.forEach((bType, wi) => CELLS.push({
  mode: "core", cell: mi * 9 + ri * 3 + wi, mech, aType: "stranger", aN, bType, bN: 1, isCatch: false, risk: 100, blame: false
}))));

// Awad et al. 2020, PNAS: country-level averages, 70,000 participants in 42 countries.
export const BENCH = [
  { cell: 6, label: "Switch: pull to save 5 strangers, killing 1", world: 81 },
  { cell: 15, label: "Footbridge: push 1 stranger to save 5", world: 51 }
];

export const DEEPER_LEN = 30;
export const DEEPER_MIN = 12;

type Rand = () => number;
export function shuffle<T>(a: T[], rand: Rand = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const CATCH: Omit<Trial, "mode"> = { cell: -1, mech: "lever", aType: "stranger", aN: 3, bType: "stranger", bN: 0, isCatch: true, risk: 100, blame: false };

/** 18 core cells in random order, with 2 attention checks placed between positions 4 and 15. */
export function coreSequence(rand: Rand = Math.random): Trial[] {
  const seq = shuffle(CELLS.map(c => ({ ...c })), rand);
  const slots = shuffle([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], rand).slice(0, 2).sort((a, b) => a - b);
  slots.forEach(p => seq.splice(p, 0, { mode: "core", ...CATCH }));
  return seq;
}

function pickType(rand: Rand, exclude: TypeKey[] = []): TypeKey {
  const ks = TYPE_KEYS.filter(k => !exclude.includes(k));
  const tot = ks.reduce((s, k) => s + TYPES[k].w, 0);
  let r = rand() * tot;
  for (const k of ks) { r -= TYPES[k].w; if (r <= 0) return k; }
  return ks[0];
}
const pickN = (t: TypeKey, rand: Rand) => TYPES[t].only1 ? 1 : 1 + Math.floor(rand() * 5);

/** A fixed 30-card run: 28 regular cards with exact quotas (8 push, 10 uncertain, 10 blamed),
 *  each shuffled independently, plus 2 attention checks between positions 8 and 27. */
export function deeperSequence(rand: Rand = Math.random): Trial[] {
  const flags = (k: number) => shuffle(Array.from({ length: 28 }, (_, i) => i < k), rand);
  const push = flags(8), risk = flags(10), blame = flags(10);
  const seq: Trial[] = push.map((p, i) => {
    const mech: Mech = p ? "push" : "lever";
    const aType = pickType(rand), bType = mech === "push" ? pickType(rand, ["dog"]) : pickType(rand);
    return { mode: "deeper", cell: -1, mech, aType, aN: pickN(aType, rand), bType, bN: mech === "push" ? 1 : pickN(bType, rand),
      isCatch: false, risk: risk[i] ? 60 : 100, blame: blame[i] };
  });
  const slots = shuffle(Array.from({ length: 20 }, (_, i) => i + 8), rand).slice(0, 2).sort((a, b) => a - b);
  slots.forEach(p => seq.splice(p, 0, { mode: "deeper", ...CATCH }));
  return seq;
}

export const desc = (t: TypeKey, n: number) => n === 0 ? "no one" : n === 1 ? TYPES[t].one : `${n} ${TYPES[t].many}`;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const cellText = (c: Trial) => c.mech === "push"
  ? `Push ${TYPES[c.bType].one} to save ${desc("stranger", c.aN)}`
  : `Divert onto ${TYPES[c.bType].one} to save ${desc("stranger", c.aN)}`;
