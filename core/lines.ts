// CORE — see README.md, "The line". Every function here is pure; reading files is the caller's job.
//
//   text ─parse→ Line[] ─union→ Line[] ─check→ { kept, setAside } ─index→ LineIndex
//
// Imports nothing from middle/ or display/.

export type Line = [string, string, string];

export type LineIndex = {
  lineByMiddle: Map<string, Line>;    // a middle → the one line it is the middle of
  linesByLeft: Map<string, Line[]>;   // a string → the lines with it as their left
  linesByRight: Map<string, Line[]>;  // a string → the lines with it as their right
};

export type SetAside = { line: Line; why: string };

// One text, as lines. Anything that isn't three strings is a problem, located by `source`.
export function parse(text: string, source: string): { lines: Line[]; problems: string[] } {
  const lines: Line[] = [];
  const problems: string[] = [];
  text.split("\n").forEach((raw, i) => {
    if (!raw.trim()) return;
    const where = `${source}:${i + 1}`;
    let l: unknown;
    try { l = JSON.parse(raw); } catch { problems.push(`${where}: not JSON`); return; }
    if (Array.isArray(l) && l.length === 3 && l.every((s) => typeof s === "string")) lines.push(l as Line);
    else problems.push(`${where}: a line is three strings`);
  });
  return { lines, problems };
}

// The merge. Like `sort -u`: the same answer whatever order the inputs arrive in.
export function union(...inputs: Line[][]): Line[] {
  const all = new Map(inputs.flat().map((l) => [JSON.stringify(l), l] as const));
  return [...all.keys()].sort().map((k) => all.get(k)!);
}

// Well-formedness. Malformed lines are set aside, not repaired: nothing here picks a
// winner, so the result never depends on which input came first.
//   - a middle defined by more than one line: every definition is set aside
//   - a middle that rests on itself, through its ends: every middle on the cycle is
//     set aside. Malformed for now — cycles are expected to get their own treatment later.
export function check(lines: Line[]): { kept: Line[]; setAside: SetAside[] } {
  const defs = new Map<string, Line[]>();
  for (const l of lines) defs.set(l[1], [...(defs.get(l[1]) ?? []), l]);

  const conflicted = new Set([...defs].filter(([, ls]) => ls.length > 1).map(([r]) => r));
  const single = lines.filter((l) => !conflicted.has(l[1]));
  const cyclic = onCycles(single);

  const setAside: SetAside[] = [];
  const kept: Line[] = [];
  for (const l of lines) {
    if (conflicted.has(l[1])) setAside.push({ line: l, why: `${l[1]} is defined by ${defs.get(l[1])!.length} lines` });
    else if (cyclic.has(l[1])) setAside.push({ line: l, why: `${l[1]} rests on itself` });
    else kept.push(l);
  }
  return { kept, setAside };
}

// Relations that can reach themselves by following ends (Tarjan's strongly connected components).
function onCycles(lines: Line[]): Set<string> {
  const def = new Map(lines.map((l) => [l[1], l] as const));
  const below = (r: string) => [def.get(r)![0], def.get(r)![2]].filter((x) => def.has(x));
  const order = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const cyclic = new Set<string>();

  function visit(r: string) {
    order.set(r, order.size);
    low.set(r, order.get(r)!);
    stack.push(r);
    for (const b of below(r)) {
      if (!order.has(b)) visit(b);
      if (stack.includes(b)) low.set(r, Math.min(low.get(r)!, low.get(b)!));
    }
    if (low.get(r) !== order.get(r)) return;
    const component = stack.splice(stack.indexOf(r));
    if (component.length > 1 || below(r).includes(r)) component.forEach((c) => cyclic.add(c));
  }
  for (const r of def.keys()) if (!order.has(r)) visit(r);
  return cyclic;
}

// Assumes checked lines: one definition per middle, no cycles.
export function index(lines: Line[]): LineIndex {
  const lineIndex: LineIndex = { lineByMiddle: new Map(), linesByLeft: new Map(), linesByRight: new Map() };
  for (const line of lines) {
    const [left, middle, right] = line;
    lineIndex.lineByMiddle.set(middle, line);
    lineIndex.linesByLeft.set(left, [...(lineIndex.linesByLeft.get(left) ?? []), line]);
    lineIndex.linesByRight.set(right, [...(lineIndex.linesByRight.get(right) ?? []), line]);
  }
  return lineIndex;
}
