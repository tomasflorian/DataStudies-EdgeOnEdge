// DISPLAY — a reading as a table, assembled column by column. Pure: eoe.ts serves it.
//
// A reading starts from a noun (every string found as one) or from one string, and each
// column after the first is one step from a column to its left — the join is on the cell
// it steps from, so the evidence for a row is always in the row.
//
// The pile is links and tags (middle/pile.ts). A link says one string was found inside
// another, and its tags point at words. A word is itself a link — its text found in a
// vocabulary, "IT" or "gardening" — tagged with its roles. The roles are the only words
// this view looks for:
//
//   <WORD>   a link that is a word, not a finding: never walked
//   <NOUN>   what a thing is: "host", "entry"
//   <VERB>   how it sits in the whole it was found in: "address", "user"
//
// A word's vocabulary is its language, and every language is a switch.
//
// The view's opinions, not the pile's:
//   - a step is named by words only — no arrows. One offer takes every direction that
//     reaches its word; the lines a cell was reached through are told by path().
//   - a step down a link reads as the nouns of where it lands, and as its verbs: from a zone
//     record, "ip" and "address" both reach its ip. A step up reads as the nouns of the
//     whole, and a verb read from below would say it backwards, so it becomes a role:
//     "zone-record(address)", the records this is the address of. With no noun, a step
//     reads "part" going down and "whole" going up.
//   - every step is one link, up or down, so every string a reading passes through is a
//     column. "host in zone-record" is offered as a shortcut for two steps — up to a zone
//     record, down to its host — and taking it adds both columns.
//   - a row that finds nothing keeps its place with a hole, rather than disappearing.
//   - the tower: a word can be narrower than another ("ip" under "address", said by a
//     tuning file and tagged <BROADER>). Starting from or stepping by "address" reaches
//     anything found as an ip or a host; a cell still shows only its narrowest words.
//   - every word has switches: its vocabulary, and each <SWITCH> word tagging it ("machine",
//     written into the pile by tune.ts). A word shows while its vocabulary is on, or while
//     one of its switches is on and that switch's own word shows — so switching the party
//     plan off also silences "people", a party-plan word. All start on. "#machine" steps
//     to anything carrying machine, on or off, so a closed language can still be stepped
//     into whole. Aliases are the page's.

import type { Line } from "../core/lines.ts";
import type { Pile } from "../middle/pile.ts";

export type Step = { parent: number; label: string };
export type Session = { start?: { kind?: string; value?: string }; steps: Step[]; focus: number; tags?: string[]; find?: string };
export type Cell = { v: string; text: string; kinds: string[]; rels: string[] } | null;
export type Offer = { step: Step; count: number; of: number; kinds: string[]; tag: boolean };

// Whether a string holds the text being searched for — any string, when nothing is.
const matches = (someString: string, find?: string) => !find || someString.toLowerCase().includes(find.toLowerCase());
export type Hop = { toward: "up" | "down"; word: string; to: string; toText: string; at: string | null };
export type PathStep = { from: string; rels: string[] };
export type View = {
  columns: { label: string; parent: number }[];
  rows: Cell[][];
  truncated: boolean;
  offers: Offer[];
  focus: number;
};

const NOUN = "<NOUN>";
const VERB = "<VERB>";
const WORD = "<WORD>";
const SWITCH = "<SWITCH>";
const BROADER = "<BROADER>";
const SAID_BY = "<SAID-BY>";
const MAX_ROWS = 2000;
const ACROSS = " in ";
const TAG_MARK = "#";

// A word as a step or a cell says it, and the switches it needs on to show: for each word
// it is made of, the ways that word can show — each a set of switches that must all be on.
// A "#tag" step needs none.
type Said = { text: string; needs: string[][][] };
const unique = (said: Said[]) => [...new Map(said.map((one) => [one.text + "\0" + JSON.stringify(one.needs), one])).values()];

export function tabler(pile: Pile) {
  // The pile does not change under a tabler, so these are worked out once per string.
  const memo = <T>(f: (x: string) => T) => {
    const known = new Map<string, T>();
    return (x: string): T => { if (!known.has(x)) known.set(x, f(x)); return known.get(x)!; };
  };

  // --- words, links and their tags ----------------------------------------------------
  // A word's text, and the vocabulary it was found in: its two ends.
  const textOf = (wordId: string) => pile.endsOf(wordId)?.[1] ?? wordId;
  const vocabularyOf = (wordId: string) => pile.endsOf(wordId)?.[0] ?? "";
  const hasRole = (wordId: string, role: string) => pile.tagsOn(wordId).some((tagged) => textOf(tagged) === role);
  const isWord = memo((middleId: string) => hasRole(middleId, WORD));
  // The words a link carries, and those of them playing a role.
  const wordsOn = memo((linkId: string) => pile.tagsOn(linkId).filter(isWord));
  const marked = (linkId: string, role: string) => wordsOn(linkId).filter((wordId) => hasRole(wordId, role));
  // Findings only: a word is a link too, but not one to walk.
  const linksFrom = (someString: string) => pile.linksFrom(someString).filter(({ line }) => !isWord(line[1]));
  const links = () => pile.allLines().filter(([, middleId]) => pile.isLink(middleId) && !isWord(middleId));
  const parts = memo((whole: string) => linksFrom(whole).filter(({ side }) => side === "left").map(({ line }) => line));
  const wholes = memo((part: string) => linksFrom(part).filter(({ side }) => side === "right").map(({ line }) => line[0]));

  // --- switches --------------------------------------------------------------------
  // The ways a word can show: its vocabulary on — or one of its switches on, while that
  // switch's own word can show.
  const switchesOn = (wordId: string) => pile.tagsOn(wordId).filter((tagged) => hasRole(tagged, SWITCH));
  function waysToShow(wordId: string, seen = new Set<string>()): string[][] {
    const inner = new Set([...seen, wordId]);
    return [[vocabularyOf(wordId)], ...switchesOn(wordId).filter((one) => !seen.has(one))
      .flatMap((one) => waysToShow(one, inner).map((way) => [textOf(one), ...way]))];
  }
  const showWays = memo((wordId: string) => waysToShow(wordId));
  // The languages a link speaks: the vocabularies of its nouns and verbs.
  const languagesOf = memo((linkId: string) => [...new Set([...marked(linkId, NOUN), ...marked(linkId, VERB)].map(vocabularyOf))]);
  const said = (wordId: string): Said => ({ text: textOf(wordId), needs: [showWays(wordId)] });
  const nounsOf = memo((linkId: string): Said[] => marked(linkId, NOUN).map(said));
  // The tower: the words a word is narrower than, following only taggings that are
  // themselves tagged <BROADER> — never a switch or a role — as far up as they go.
  const broaderOf = (wordId: string) => pile.tagLines(wordId)
    .filter(([, taggingId, above]) => isWord(above) && pile.tagsOn(taggingId).some((meaning) => textOf(meaning) === BROADER))
    .map(([, , above]) => above);
  function above(wordId: string, seen = new Set<string>([wordId])): string[] {
    return broaderOf(wordId).filter((up) => !seen.has(up)).flatMap((up) => { seen.add(up); return [up, ...above(up, seen)]; });
  }
  // A link's nouns and every broader word above them: "ip" also reads "address". Each
  // broader word shows only while the noun under it does, and it does itself.
  const nounsAndAbove = memo((linkId: string): Said[] => unique(marked(linkId, NOUN).flatMap((noun) =>
    [said(noun), ...above(noun).map((up) => ({ text: textOf(up), needs: [showWays(noun), showWays(up)] }))])));
  const verbsOf = memo((linkId: string): Said[] => marked(linkId, VERB).map(said));
  // Each word, and a "#tag" step for each switch any of them carries.
  const withTags = (words: Said[]): Said[] =>
    unique([...words, ...[...new Set(words.flatMap((one) => one.needs.flat(2)))].map((tag) => ({ text: TAG_MARK + tag, needs: [] }))]);
  // Everything a string was found as, by any link reaching it — and, for stepping and
  // starting, everything broader.
  const kindsOf = memo((someString: string): Said[] =>
    unique(linksFrom(someString).filter(({ side }) => side === "right").flatMap(({ line }) => nounsOf(line[1]))));
  const kindsAndAbove = memo((someString: string): Said[] =>
    unique(linksFrom(someString).filter(({ side }) => side === "right").flatMap(({ line }) => nounsAndAbove(line[1]))));
  // Every switch there is: each vocabulary the findings use, and each <SWITCH> word.
  const allTags = (() => {
    const languages = new Set(links().flatMap(([, linkId]) => languagesOf(linkId)));
    const switches = pile.allLines().filter(([, middleId]) => isWord(middleId) && hasRole(middleId, SWITCH)).map(([, , text]) => text);
    return [...new Set([...[...languages].sort(), ...switches])];
  })();
  // Every switch starts on; a reading that turns some off says which stay on.
  const switchedOn = (tags?: string[]) => new Set(tags ?? allTags);
  const shows = (said: Said, on: Set<string>) => said.needs.every((ways) => ways.some((way) => way.every((tag) => on.has(tag))));
  const shown = (said: Said[], on: Set<string>) => [...new Set(said.filter((one) => shows(one, on)).map((one) => one.text))];

  // How a link reads: its verbs, or its nouns, or that it is a part.
  function label(linkId: string): string {
    const words = marked(linkId, VERB).length ? marked(linkId, VERB) : marked(linkId, NOUN);
    return words.length ? words.map(textOf).join(" / ") : "part";
  }

  // --- stepping ----------------------------------------------------------------------
  // The ways out of x, each with the labels it can be taken by.
  type Way = { line: Line; other: string; labels: Said[] };
  const ways = memo((x: string): Way[] => linksFrom(x).map(({ line, side }): Way => {
    const other = side === "left" ? line[2] : line[0];
    const otherKinds = kindsOf(other);
    const verbs = side === "left" ? withTags(verbsOf(line[1]))
      : verbsOf(line[1]).flatMap((verb) => (otherKinds.length ? otherKinds : [{ text: "whole", needs: [] }])
        .map((kind) => ({ text: `${kind.text}(${verb.text})`, needs: [...kind.needs, ...verb.needs] })));
    const plain = otherKinds.length ? withTags(kindsAndAbove(other)) : [{ text: side === "left" ? "part" : "whole", needs: [] }];
    return { line, other, labels: unique([...plain, ...verbs]) };
  }));

  // Shortcuts across a whole: "host in zone-record" is two steps offered as one — up to a
  // zone record x sits in, then down to a host inside it. Taking it adds both columns, so
  // the whole in between is shown like any other step. A part is not its own sibling —
  // unless it holds several roles in the whole (a password that is also the username).
  const shortcuts = memo((x: string): { other: string; labels: Said[] }[] => wholes(x).flatMap((whole) => {
    const inside: Said[] = kindsOf(whole).length ? kindsOf(whole) : [{ text: "whole", needs: [] }];
    return parts(whole).flatMap((line) => {
      const itself = line[2] === x;
      if (itself && verbsOf(line[1]).length < 2) return [];
      const named = withTags(itself ? verbsOf(line[1]) : [...kindsAndAbove(line[2]), ...verbsOf(line[1])]);
      const what: Said[] = named.length ? named : [{ text: "part", needs: [] }];
      return [{ other: line[2], labels: unique(what.flatMap((kind) =>
        inside.map((outer) => ({ text: `${kind.text}${ACROSS}${outer.text}`, needs: [...kind.needs, ...outer.needs] })))) }];
    });
  }));

  // How a string is shown: itself, or — for a link — what it connects.
  function text(someString: string, depth = 0): string {
    const ends = pile.endsOf(someString);
    if (!ends || depth > 2) return someString;
    return `${text(ends[0], depth + 1)} → ${label(someString)} → ${text(ends[1], depth + 1)}`;
  }
  const cell = (v: string, rels: string[], on: Set<string>): Cell => ({ v, text: text(v), kinds: shown(kindsOf(v), on), rels });

  // Where one step leads from one cell: each far end once, with every link that got there.
  function follow(from: NonNullable<Cell>, step: Step, on: Set<string>): Cell[] {
    const found = new Map<string, string[]>();
    for (const { line, other, labels } of ways(from.v))
      if (labels.some((one) => one.text === step.label && shows(one, on))) found.set(other, [...new Set([...(found.get(other) ?? []), line[1]])]);
    return [...found].map(([v, rels]) => cell(v, rels, on)).sort((a, b) => a!.text.localeCompare(b!.text));
  }

  // Every noun on every link, and every word above it, with the string it was found as.
  const nounings = () => links().flatMap(([, linkId, found]) => nounsAndAbove(linkId).map((said) => ({ said, found })));

  // Every string found as `kind` where that finding shows — or, for "#tag", every string
  // with a noun carrying that switch, on or off.
  function members(kind: string, on: Set<string>): string[] {
    const tag = kind.startsWith(TAG_MARK) ? kind.slice(TAG_MARK.length) : undefined;
    const out = new Set<string>();
    for (const { said, found } of nounings())
      if (tag ? said.needs[0].flat().includes(tag) : said.text === kind && shows(said, on)) out.add(found);
    return [...out].sort();
  }

  function offers(rows: Cell[][], col: number, tagsOn: Set<string>): Offer[] {
    const cells = new Map<string, NonNullable<Cell>>();
    for (const row of rows) if (row[col]) cells.set(row[col]!.v + "\0" + row[col]!.rels.join(), row[col]!);
    const tally = new Map<string, { step: Step; reached: Set<string>; kinds: Set<string> }>();
    for (const [key, cellHere] of cells)
      for (const { line, other, labels } of [...ways(cellHere.v), ...shortcuts(cellHere.v).map((one) => ({ line: undefined, ...one }))]) {
        // stepping back across the link that brought you here is not a new step
        if (line && cellHere.rels.includes(line[1])) continue;
        for (const offered of labels) {
          if (!shows(offered, tagsOn)) continue;
          const count = tally.get(offered.text) ?? { step: { parent: col, label: offered.text }, reached: new Set(), kinds: new Set() };
          count.reached.add(key);
          shown(kindsOf(other), tagsOn).forEach((kind) => count.kinds.add(kind));
          tally.set(offered.text, count);
        }
      }
    return [...tally.values()]
      .map((count) => ({ step: count.step, count: count.reached.size, of: cells.size, kinds: [...count.kinds].slice(0, 3), tag: count.step.label.includes(TAG_MARK) }))
      .sort((a, b) => b.count - a.count || a.step.label.localeCompare(b.step.label));
  }

  function view(session: Session): View {
    if (!session.start) return { columns: [], rows: [], truncated: false, offers: [], focus: 0 };
    const on = switchedOn(session.tags);
    // A search holds the first column only: the reading starts from the members that match.
    const first = session.start.kind !== undefined
      ? members(session.start.kind, on).filter((v) => matches(v, session.find)).map((v) => cell(v, [], on))
      : [cell(session.start.value!, [], on)];
    let rows: Cell[][] = first.map((c) => [c]);
    let truncated = false;
    for (const step of session.steps) {
      const next: Cell[][] = [];
      for (const row of rows) {
        const pivot = row[step.parent];
        const found = pivot ? follow(pivot, step, on) : [];
        if (!found.length) next.push([...row, null]);
        for (const c of found) next.push([...row, c]);
      }
      truncated ||= next.length > MAX_ROWS;
      rows = next.slice(0, MAX_ROWS);
    }
    const focus = Math.min(Math.max(0, session.focus), session.steps.length);
    return {
      columns: [
        { label: session.start.kind !== undefined ? session.start.kind : session.start.value!, parent: -1 },
        ...session.steps.map((step) => ({ label: step.label, parent: step.parent })),
      ],
      rows,
      truncated,
      offers: offers(rows, focus, on),
      focus,
    };
  }

  // Every noun whose findings show, with how many strings each reaches; then every switch,
  // with how many strings carry it, on or off.
  //
  // Each noun also says where it sits among the others — the lattice, the middle path:
  //   seen    every string found as it is also found as the other, which has more; worked
  //           out from today's pile, for nouns with at least `threshold` strings
  //   said    a <BROADER> claim puts it under the other, whatever the pile shows; with who
  //           said it. Where the pile points the other way, the claim wins.
  // and only its immediate parents: under "place" and "place" under "word", a city is not
  // also listed under "word". Nouns with exactly the same strings are equals — unless a
  // claim orders them.
  type Parent = { kind: string; seen: boolean; said: string[] };
  // A search keeps only the nouns and switches with a matching string among their members,
  // and counts those; `of` is how many they have in all.
  function kinds(tags?: string[], threshold = 2, find?: string): { kind: string; count: number; of: number; tag: boolean; parents?: Parent[]; equals?: string[] }[] {
    const on = switchedOn(tags);
    const byKind = new Map<string, Set<string>>(), byTag = new Map<string, Set<string>>(), direct = new Map<string, Set<string>>();
    const add = (map: Map<string, Set<string>>, key: string, member: string) => map.set(key, (map.get(key) ?? new Set()).add(member));
    for (const { said: one, found } of nounings()) {
      if (shows(one, on)) add(byKind, one.text, found);
      for (const tag of new Set(one.needs[0].flat())) add(byTag, tag, found);
    }
    for (const [, linkId, found] of links()) for (const noun of nounsOf(linkId)) if (shows(noun, on)) add(direct, noun.text, found);

    // The claims: every <BROADER> step above the nouns, as text → text, with who said it.
    const claims = new Map<string, Map<string, Set<string>>>();
    const climbing = [...new Set(links().flatMap(([, linkId]) => marked(linkId, NOUN)))], climbed = new Set<string>();
    while (climbing.length) {
      const wordId = climbing.pop()!;
      if (climbed.has(wordId)) continue;
      climbed.add(wordId);
      for (const [, taggingId, up] of pile.tagLines(wordId)) {
        if (!isWord(up) || !pile.tagsOn(taggingId).some((meaning) => textOf(meaning) === BROADER)) continue;
        const sources = pile.tagsOn(taggingId).filter((source) => hasRole(source, SAID_BY)).map(textOf);
        const upward = claims.get(textOf(wordId)) ?? new Map<string, Set<string>>();
        upward.set(textOf(up), new Set([...(upward.get(textOf(up)) ?? []), ...sources]));
        claims.set(textOf(wordId), upward);
        climbing.push(up);
      }
    }

    // Everything a noun is claimed to sit under, however many steps up.
    const claimedAbove = (kind: string, seen = new Set<string>()): Set<string> => {
      for (const up of claims.get(kind)?.keys() ?? []) if (!seen.has(up)) { seen.add(up); claimedAbove(up, seen); }
      return seen;
    };
    const shownKinds = [...byKind.keys()];
    const parents = new Map<string, Map<string, Parent>>();
    const parentOf = (child: string, parent: string) => {
      const mine = parents.get(child) ?? new Map<string, Parent>();
      parents.set(child, mine);
      return mine.get(parent) ?? mine.set(parent, { kind: parent, seen: false, said: [] }).get(parent)!;
    };
    const equals = new Map<string, string[]>();
    const inside = (small: Set<string>, big: Set<string>) => [...small].every((member) => big.has(member));
    for (const child of shownKinds) {
      const mine = direct.get(child);
      if (!mine || mine.size < threshold) continue;
      for (const other of shownKinds) {
        const theirs = direct.get(other);
        // a claim the other way outranks what the pile happens to show
        if (other === child || !theirs || !inside(mine, theirs) || claimedAbove(other).has(child)) continue;
        if (mine.size < theirs.size) parentOf(child, other).seen = true;
        else if (!claims.get(child)?.has(other) && !claims.get(other)?.has(child)) equals.set(child, [...(equals.get(child) ?? []), other]);
        else if (claims.get(child)?.has(other)) parentOf(child, other).seen = true;
      }
    }
    for (const [child, upward] of claims)
      for (const [parent, sources] of upward)
        if (byKind.has(child) && byKind.has(parent)) parentOf(child, parent).said = [...sources].sort();
    // Only immediate parents: drop a parent another parent already sits under.
    const ancestors = (kind: string, seen = new Set<string>()): Set<string> => {
      for (const parent of parents.get(kind)?.keys() ?? []) if (!seen.has(parent)) { seen.add(parent); ancestors(parent, seen); }
      return seen;
    };
    const immediate = (kind: string) => {
      const all = [...(parents.get(kind)?.values() ?? [])];
      return all.filter((parent) => !all.some((other) => other !== parent && ancestors(other.kind).has(parent.kind)));
    };

    const listed = (map: Map<string, Set<string>>, tag: boolean) => [...map]
      .map(([kind, members]) => ({ kind: tag ? TAG_MARK + kind : kind, count: [...members].filter((member) => matches(member, find)).length, of: members.size, tag,
        ...(tag ? {} : { parents: immediate(kind), equals: equals.get(kind) ?? [] }) }))
      .filter((one) => one.count > 0)
      .sort((a, b) => b.count - a.count || b.of - a.of || a.kind.localeCompare(b.kind));
    return [...listed(byKind, false), ...listed(byTag, true)];
  }

  // Every switch, and how many strings carry it.
  const tagList = () => {
    const counts = new Map(kinds(allTags).filter((k) => k.tag).map((k) => [k.kind.slice(TAG_MARK.length), k.count]));
    return allTags.map((tag) => ({ tag, count: counts.get(tag) ?? 0 }));
  };

  // Strings found in the files that contain q, the closest first.
  function find(q: string, limit = 40): string[] {
    const needle = q.toLowerCase();
    if (!needle) return [];
    const all = new Set<string>();
    for (const [left, , right] of links()) for (const end of [left, right]) if (end.toLowerCase().includes(needle)) all.add(end);
    const rank = (x: string) => (x.toLowerCase() === needle ? 0 : x.toLowerCase().startsWith(needle) ? 1 : 2);
    return [...all].sort((a, b) => rank(a) - rank(b) || a.length - b.length || a.localeCompare(b)).slice(0, limit);
  }

  // --- where a cell was read from ----------------------------------------------------
  // Where a part sits in its file, found inside this whole: the file's name and line. It
  // climbs one way up to the file's path, adding up where each piece starts inside the
  // next. A file's own text, found in its path, has no line.
  function lineOf(part: string, whole: string): string | null {
    const inside = whole.indexOf(part);
    if (inside < 0) return null;
    const seen = new Set([part, whole]);
    let at = whole, offset = inside;
    for (;;) {
      const up = wholes(at).find((one) => !seen.has(one));
      if (up === undefined) return null;
      if (!wholes(up).length) return `${up.split("/").at(-1)}:${at.slice(0, offset).split("\n").length}`;
      const next = up.indexOf(at);
      if (next < 0) return null;
      offset += next;
      seen.add(up);
      at = up;
    }
  }

  // One link, walked: up from a part to its whole, or down from a whole to a part.
  function hop(linkId: string, toward: "up" | "down"): Hop {
    const [whole, part] = pile.endsOf(linkId)!;
    const landing = toward === "up" ? whole : part;
    const verbs = marked(linkId, VERB).map(textOf);
    const word = verbs.length ? verbs.join(" / ") : kindsOf(landing)[0]?.text ?? (toward === "up" ? "whole" : "part");
    return { toward, word, to: landing, toText: text(landing), at: lineOf(part, whole) };
  }

  // The link one step walked, from the string it left to the cell it reached.
  function hopsFor(from: string, linkId: string): Hop[] | null {
    const ends = pile.endsOf(linkId);
    if (!ends) return null;
    if (from === ends[0]) return [hop(linkId, "down")];
    if (from === ends[1]) return [hop(linkId, "up")];
    return null;
  }

  // How a row reached one of its cells: for each step on the way, every way it was taken
  // (one per link that reached the cell), as the links walked. And where the value appears
  // in the files, however it was reached.
  function path(steps: PathStep[], value: string) {
    return {
      steps: steps.map((step) => ({
        ways: step.rels.flatMap((linkId) => { const hops = hopsFor(step.from, linkId); return hops ? [hops] : []; }),
      })),
      appears: [...new Set(wholes(value).map((whole) => lineOf(value, whole)).filter((at): at is string => !!at))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  }

  return { view, kinds, tags: tagList, find, path };
}
