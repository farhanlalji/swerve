// Builds the trolley illustration as an SVG string. Inputs are trial fields drawn from fixed constants, never user text.
import { TYPES, type Kind, type Trial, type TypeKey } from "@/lib/scenarios";

function figure(kind: Kind, x: number, y: number, cls: string): string {
  if (kind === "dog") return `<g class="${cls}"><ellipse cx="${x}" cy="${y - 5}" rx="7" ry="4"/><circle cx="${x + 7}" cy="${y - 10}" r="3.4"/><rect x="${x - 6}" y="${y - 3}" width="2" height="5"/><rect x="${x + 3}" y="${y - 3}" width="2" height="5"/></g>`;
  const s = kind === "child" ? .72 : 1;
  const head = `<circle cx="${x}" cy="${y - 20 * s}" r="${4.2 * s}"/>`;
  const body = `<path d="M${x - 5 * s} ${y} L${x - 5 * s} ${y - 9 * s} Q${x - 5 * s} ${y - 14.5 * s} ${x} ${y - 14.5 * s} Q${x + 5 * s} ${y - 14.5 * s} ${x + 5 * s} ${y - 9 * s} L${x + 5 * s} ${y} Z"/>`;
  const cane = kind === "elder" ? `<line x1="${x + 8}" y1="${y - 10}" x2="${x + 9}" y2="${y}" stroke-width="1.6"/>` : "";
  return `<g class="${cls}">${head}${body}${cane}</g>`;
}

function group(type: TypeKey, n: number, cx: number, y: number, cls: string): string {
  if (!n) return `<text x="${cx}" y="${y - 6}" text-anchor="middle" class="lbl">empty</text>`;
  const kind = TYPES[type].kind, gap = kind === "dog" ? 19 : 14;
  let out = "";
  for (let i = 0; i < n; i++) out += figure(kind, cx + (i - (n - 1) / 2) * gap, y, cls);
  return out;
}

const STYLES = `<style>
.rail{stroke:var(--rail);stroke-width:2;fill:none}.tie{stroke:var(--rail);stroke-width:1.2;opacity:.55}
.ga,.gb{fill:var(--ink)}.ga line,.gb line{stroke:var(--ink)}
.lbl{font:500 10px var(--f-mono);fill:var(--muted);letter-spacing:.06em}
.tram{fill:var(--leave)}.lev{stroke:var(--act);stroke-width:3;stroke-linecap:round}.knob{fill:var(--act)}
.bridge{fill:var(--line)}.you{fill:var(--act)}</style>`;

const ties = (x1: number, x2: number, y: number) => { let s = ""; for (let x = x1; x <= x2; x += 12) s += `<line class="tie" x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}"/>`; return s; };
const TRAM = `<g><rect class="tram" x="14" y="50" width="52" height="24" rx="5"/><rect x="20" y="55" width="12" height="8" rx="1.5" fill="var(--surface)"/><rect x="36" y="55" width="12" height="8" rx="1.5" fill="var(--surface)"/><circle cx="26" cy="77" r="3.5" fill="var(--ink)"/><circle cx="54" cy="77" r="3.5" fill="var(--ink)"/><path d="M70 60 l10 2 M70 66 l12 0 M70 72 l10 -2" stroke="var(--muted)" stroke-width="1.4"/></g>`;

export function sceneSVG(t: Trial): string {
  if (t.mech === "push") {
    return `<svg class="scene" viewBox="0 0 320 170" role="img" aria-label="Footbridge dilemma">${STYLES}
      ${ties(6, 314, 82)}<line class="rail" x1="0" y1="80" x2="320" y2="80"/><line class="rail" x1="0" y1="85" x2="320" y2="85"/>
      ${TRAM}
      <rect class="bridge" x="118" y="34" width="70" height="6" rx="2"/><rect class="bridge" x="122" y="40" width="5" height="50"/><rect class="bridge" x="179" y="40" width="5" height="50"/>
      ${figure("adult", 140, 34, "you")}${figure(TYPES[t.bType].kind, 162, 34, "gb")}
      <text x="128" y="22" text-anchor="end" class="lbl">YOU</text>
      ${group(t.aType, t.aN, 262, 80, "ga")}
      <text x="153" y="122" text-anchor="middle" class="lbl">FOOTBRIDGE</text>
      <text x="262" y="110" text-anchor="middle" class="lbl">AHEAD</text></svg>`;
  }
  return `<svg class="scene" viewBox="0 0 320 170" role="img" aria-label="Lever dilemma">${STYLES}
    ${ties(6, 314, 72)}
    <line class="rail" x1="0" y1="70" x2="320" y2="70"/><line class="rail" x1="0" y1="75" x2="320" y2="75"/>
    <path class="rail" d="M108 70 C150 70 160 140 210 140 L320 140"/><path class="rail" d="M108 75 C146 75 156 145 210 145 L320 145"/>
    ${TRAM}
    <line class="lev" x1="112" y1="112" x2="98" y2="94"/><circle class="knob" cx="97" cy="92" r="4"/><rect x="104" y="110" width="16" height="6" rx="2" fill="var(--muted)"/>
    <text x="112" y="132" text-anchor="middle" class="lbl">LEVER</text>
    ${group(t.aType, t.aN, 262, 70, "ga")}
    ${group(t.bType, t.bN, 262, 140, "gb")}
    <text x="262" y="96" text-anchor="middle" class="lbl">MAIN TRACK</text>
    <text x="262" y="164" text-anchor="middle" class="lbl">SIDE TRACK</text></svg>`;
}
