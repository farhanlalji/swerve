import { describe, expect, it } from "vitest";
import { CELLS, DEEPER_LEN, coreSequence, deeperSequence } from "@/lib/scenarios";
import { coreMetrics, deeperMetrics, type Answer } from "@/lib/metrics";
import { decode, encode } from "@/lib/share";
import { parseParticipant, parseResponse } from "@/lib/validate";

// Small deterministic RNG so sequence tests are repeatable.
const seeded = (s: number) => () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);

describe("core design", () => {
  it("is a full 2 x 3 x 3 factorial with unique cells", () => {
    expect(CELLS).toHaveLength(18);
    expect(new Set(CELLS.map(c => `${c.mech}-${c.aN}-${c.bType}`)).size).toBe(18);
    CELLS.forEach((c, i) => expect(c.cell).toBe(i));
  });
  it("puts every cell once plus two catch trials in the middle", () => {
    for (let s = 1; s < 50; s++) {
      const seq = coreSequence(seeded(s));
      expect(seq).toHaveLength(20);
      expect(seq.filter(t => !t.isCatch).map(t => t.cell).sort((a, b) => a - b)).toEqual(CELLS.map(c => c.cell));
      seq.forEach((t, i) => { if (t.isCatch) { expect(i).toBeGreaterThanOrEqual(4); expect(i).toBeLessThanOrEqual(16); } });
      expect(seq.filter(t => t.isCatch)).toHaveLength(2);
    }
  });
});

describe("deeper run", () => {
  it("has 30 cards with exact quotas", () => {
    for (let s = 1; s < 50; s++) {
      const seq = deeperSequence(seeded(s)), real = seq.filter(t => !t.isCatch);
      expect(seq).toHaveLength(DEEPER_LEN);
      expect(real.filter(t => t.mech === "push")).toHaveLength(8);
      expect(real.filter(t => t.risk < 100)).toHaveLength(10);
      expect(real.filter(t => t.blame)).toHaveLength(10);
      real.filter(t => t.mech === "push").forEach(t => { expect(t.bN).toBe(1); expect(t.bType).not.toBe("dog"); });
      seq.forEach(t => { expect(t.aN).toBeGreaterThanOrEqual(1); expect(t.aN).toBeLessThanOrEqual(5); });
    }
  });
  it("scores a run", () => {
    const rows = deeperSequence(seeded(7)).map(t => ({ ...t, choice: "act", rtMs: 900 })) as Answer[];
    const m = deeperMetrics(rows);
    expect(m.complete).toBe(true);
    expect(m.checks).toBe("2/2");
    expect(m.util).toBe(100);
  });
});

describe("metrics and archetypes", () => {
  it("always acting is The Calculator", () => expect(coreMetrics(CELLS.map(() => 1)).archetype).toBe("The Calculator"));
  it("never acting is The Bystander", () => expect(coreMetrics(CELLS.map(() => 0)).archetype).toBe("The Bystander"));
  it("lever-only is The Switchman", () => expect(coreMetrics(CELLS.map(c => (c.mech === "lever" ? 1 : 0))).archetype).toBe("The Switchman"));
  it("protecting family is The Loyalist", () => expect(coreMetrics(CELLS.map(c => (c.bType === "family" ? 0 : 1))).archetype).toBe("The Loyalist"));
});

describe("challenge codes", () => {
  it("round-trips answers, nickname and speed", () => {
    const me = { nick: "farhan", bits: CELLS.map((_, i) => (i * 7) % 3 === 0 ? 1 : 0), rt: 2300 };
    const back = decode(encode(me))!;
    expect(back.nick).toBe("farhan"); expect(back.bits).toEqual(me.bits); expect(back.rt).toBe(2300);
  });
  it("rejects malformed codes", () => {
    ["", "x", "Farhan!-0000aa", "sam-zzzzzz", "sam-00000", "a".repeat(13) + "-0000aa"].forEach(c => expect(decode(c)).toBeNull());
  });
});

describe("validation", () => {
  const good = { id: "abc123", sessionId: "s1", runId: null, mode: "core", pos: 3, cell: 4, mech: "lever", aType: "stranger", aN: 3,
    bType: "child", bN: 1, risk: 100, blame: false, isCatch: false, choice: "act", side: "right", input: "swipe", rtMs: 1800, ts: Date.now() };
  it("accepts a well-formed response", () => expect(parseResponse(good)).not.toBeNull());
  it("rejects bad values", () => {
    expect(parseResponse({ ...good, choice: "maybe" })).toBeNull();
    expect(parseResponse({ ...good, aType: "robot" })).toBeNull();
    expect(parseResponse({ ...good, rtMs: -5 })).toBeNull();
    expect(parseResponse({ ...good, id: "x; drop table" })).toBeNull();
    expect(parseResponse({ ...good, ts: Date.now() + 30 * 864e5 })).toBeNull();
  });
  it("requires consent and keeps profile answers optional", () => {
    expect(parseParticipant({ actSide: "left" })).toBeNull();
    const p = parseParticipant({ consent: true, actSide: "left", nationality: "GB", residence: "PNTS", gender: "Not an option" })!;
    expect(p.nationality).toBe("GB"); expect(p.residence).toBe("PNTS"); expect(p.gender).toBeNull();
  });
});
