// DISPLAY — the column walk, as a page. Pure: returns HTML. eoe.ts serves it and answers
// its questions (/api/...) with table.ts.
//
// The reading lives in the URL, so a reload keeps your place, a link hands the reading
// to someone else, and the back button is undo.
//
// What the page decides for itself is only how things look: which column has focus, which
// cell's file lines are open. None of it changes a reading.

export function tablePage(title: string): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EdgeOnEdge walk</title>
<style>
:root {
  --bg: #f7f6f2; --panel: #ffffff; --ink: #1d1d1b; --muted: #75736c; --line: #e3e1da;
  --accent: #2f5fd0; --accent-soft: #e7eefc; --join: #fff3c4; --join-ink: #6b5200;
  --hole: #b9b6ad; --mark: #fde047;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111214; --panel: #191a1d; --ink: #e6e4de; --muted: #8d8b84; --line: #2a2b2f;
    --accent: #7ea2ff; --accent-soft: #1f2a44; --join: #3a3210; --join-ink: #f2d77a;
    --hole: #55534e; --mark: #a16207;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 var(--sans); }
header { display: flex; gap: 14px; align-items: baseline; flex-wrap: wrap; padding: 12px 18px;
  border-bottom: 1px solid var(--line); background: var(--panel); }
.brand { font-weight: 650; letter-spacing: .01em; }
.muted { color: var(--muted); }
header .spacer { flex: 1; }
header label { color: var(--muted); font-size: 13px; }
select, input, button { font: inherit; color: inherit; }
button, select { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 3px 9px; cursor: pointer; }
button:hover { border-color: var(--accent); }
main { display: grid; grid-template-columns: minmax(250px, 320px) 1fr; min-height: calc(100vh - 50px); }
aside { border-right: 1px solid var(--line); padding: 14px; background: var(--panel); overflow: auto; }
section.right { padding: 14px 18px; overflow: auto; min-width: 0; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 16px 0 6px; font-weight: 600; }
h2:first-child { margin-top: 0; }
.search.first { width: min(340px, 100%); margin: 0 0 8px; background: var(--panel); }
.search { width: 100%; margin-bottom: 6px; padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }
ul.list { list-style: none; margin: 0; padding: 0; }
ul.list li { display: flex; gap: 8px; align-items: baseline; padding: 5px 8px; border-radius: 6px; cursor: pointer; }
ul.list li:hover { background: var(--accent-soft); }
ul.list li .n { margin-left: auto; color: var(--muted); font-variant-numeric: tabular-nums; font-size: 12px; white-space: nowrap; }
ul.list li .k { color: var(--muted); font-size: 12px; }
.lbl { font-family: var(--mono); font-size: 13px; }
ul.list li.tag .lbl { color: var(--muted); }
ul.list li.sep { border-top: 1px solid var(--line); margin: 6px 0; padding: 0; cursor: default; }
ul.list li.sep:hover { background: none; }
.threshold { width: 3.5em; font: inherit; padding: 1px 4px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); color: var(--ink); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
.chip { font-family: var(--mono); font-size: 12px; border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px;
  cursor: pointer; color: var(--muted); background: var(--panel); user-select: none; }
.chip.on { color: var(--ink); border-color: var(--accent); background: var(--accent-soft); }
details summary { cursor: pointer; color: var(--muted); font-size: 12px; margin: 12px 0 4px; }
.value { font-family: var(--mono); font-size: 13px; overflow-wrap: anywhere; }
.chain { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; align-items: center; }
.pill { font-family: var(--mono); font-size: 12px; border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; cursor: pointer; background: var(--panel); }
.pill.focus { border-color: var(--accent); background: var(--accent-soft); }
.pill .x { margin-left: 6px; color: var(--muted); }
.pill .x:hover { color: var(--ink); }
.tablewrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
table { border-collapse: collapse; width: max-content; min-width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 6px 12px; border-bottom: 1px solid var(--line); max-width: 340px; }
th { position: sticky; top: 0; background: var(--panel); font-family: var(--mono); font-size: 12px; font-weight: 600;
  cursor: pointer; border-bottom: 2px solid var(--line); white-space: nowrap; }
th.focus { color: var(--accent); border-bottom-color: var(--accent); }
th .from { color: var(--muted); font-weight: 400; margin-left: 6px; }
td { cursor: pointer; transition: background .25s; }
td .t { font-family: var(--mono); font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
td .kinds { font-size: 11px; color: var(--muted); }
td.hole .t { color: var(--hole); }
mark { background: var(--mark); color: inherit; border-radius: 2px; padding: 0 1px; }
td.repeat .t, td.repeat .kinds { opacity: .35; }
td.pivot { background: var(--join); }
td.pivot .t { color: var(--join-ink); }
td.selected { outline: 2px solid var(--accent); outline-offset: -2px; }
.note { color: var(--muted); font-size: 13px; margin: 8px 0; }
.empty { color: var(--muted); padding: 40px 0; text-align: center; }
tr.pathrow td { max-width: none; cursor: default; background: var(--accent-soft); padding: 10px 14px 12px; }
.path { position: sticky; left: 14px; max-width: min(960px, calc(100vw - 400px)); }
.path .line { display: grid; grid-template-columns: 12em 1fr; gap: 12px; font-size: 12px; padding: 2px 0; }
.path .lead { color: var(--muted); }
.path .line b { color: var(--ink); font-weight: 600; }
.path .also { color: var(--muted); }
@media (max-width: 760px) {
  main { grid-template-columns: 1fr; }
  aside { border-right: 0; border-bottom: 1px solid var(--line); }
}
</style>
</head>
<body>
<header>
  <span class="brand">EdgeOnEdge</span>
  <span class="muted">Data Studies · column walk</span>
  <span class="muted">${esc(title)}</span>
  <span class="spacer"></span>
  <button id="reset" type="button">start over</button>
</header>
<main>
  <aside>
    <div id="left"></div>
  </aside>
  <section class="right">
    <div id="chain" class="chain"></div>
    <div id="note" class="note"></div>
    <input id="q" class="search first" type="search" placeholder="the first column holds…" spellcheck="false" autocomplete="off">
    <div id="table"></div>
  </section>
</main>
<script>
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === "class") el.className = v; else if (k.startsWith("on")) el[k] = v; else if (v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

let session = fromUrl();
let view = null, kinds = [], kindsFor = null, selected = null;
let tagInfo = null, aliasMap = {};

// Which tags are on: all of them, until the reading switches some off.
const tagsOn = () => new Set(session.tags ?? tagInfo.map((t) => t.tag));

// A name, or a label made of names, as the tuning files call it. "entry(by)" is a word and
// its role; each half is said that way. (This script sits in a template literal, so every
// backslash in a regex here is written twice.)
const aliases = () => aliasMap;
const word = (text) => String(text).split(" ").map((w) => {
  const role = /^(.+)\\((.+)\\)$/.exec(w);
  return role ? (aliases()[role[1]] ?? role[1]) + "(" + (aliases()[role[2]] ?? role[2]) + ")" : aliases()[w] ?? w;
}).join(" ");

function fromUrl() {
  try { return JSON.parse(new URLSearchParams(location.search).get("s")) || { steps: [], focus: 0 }; }
  catch { return { steps: [], focus: 0 }; }
}
const urlFor = (s) => location.pathname + (s.start || s.tags || s.threshold ? "?s=" + encodeURIComponent(JSON.stringify(s)) : "");
function go(next) {
  session = next;
  selected = null;
  history.pushState(null, "", urlFor(session));
  load();
}
window.onpopstate = () => { session = fromUrl(); selected = null; load(); };

async function load() {
  if (!tagInfo) {
    [tagInfo, aliasMap] = await Promise.all([fetch("/api/tags").then((r) => r.json()), fetch("/api/aliases").then((r) => r.json())]);
  }
  const kindsKey = [...tagsOn()].join(",") + "|" + threshold() + "|" + finding();
  if (kindsFor !== kindsKey) {
    kinds = await fetch("/api/kinds?tags=" + encodeURIComponent([...tagsOn()].join(",")) + "&threshold=" + threshold() +
      "&find=" + encodeURIComponent(finding())).then((r) => r.json());
    kindsFor = kindsKey;
  }
  view = await post("/api/view", { ...session, find: finding() || undefined });
  render();
}

// --- starting ------------------------------------------------------------------

function startKind(kind) { go({ ...session, start: { kind }, steps: [], focus: 0 }); }
function startValue(value) { go({ ...session, start: { value }, steps: [], focus: 0 }); }

// The search box sits over the first column and holds that column only: before a reading
// it keeps the kinds with a matching string, during one it keeps the rows whose first cell
// matches. It is a lens, not part of the reading: it stays out of the URL.
const finding = () => $("q").value.trim();
let findTimer = null;
$("q").oninput = () => { clearTimeout(findTimer); findTimer = setTimeout(load, 150); };
$("reset").onclick = () => { $("q").value = ""; go({ steps: [], focus: 0 }); };

// A tag switched on shows every kind carrying it; off hides them, unless another tag of
// theirs is on. The reading stays; back undoes it.
function toggleTag(tag) {
  const on = tagsOn();
  on.has(tag) ? on.delete(tag) : on.add(tag);
  go({ ...session, tags: tagInfo.map((t) => t.tag).filter((t) => on.has(t)) });
}
const renderChips = () => h("div", { class: "chips" }, tagInfo.map((t) =>
  h("span", { class: "chip" + (tagsOn().has(t.tag) ? " on" : ""), title: t.count + " strings · click to switch", onclick: () => toggleTag(t.tag) }, "#" + word(t.tag))));

// The lattice, as the kinds list shows it. A noun nests under the nouns it sits inside —
// seen in today's pile, said by a tuning file, or both — and appears under each of them.
// Each row's bar is how many strings it reaches, on a log scale: its height. The threshold
// is how many strings a noun needs before the pile's own evidence may nest it.
const threshold = () => session.threshold || 2;
// How a nesting is known: seen in the pile, said by a tuning file, or both.
const how = (parent) => [parent.seen ? "seen" : "", parent.said.length ? "said" : ""].filter(Boolean).join(" + ");
function kindsList(ks, nested) {
  const words = ks.filter((k) => !k.tag);
  const widest = Math.log(1 + Math.max(1, ...words.map((k) => k.count)));
  const item = (k, depth, via) => h("li", {
    class: k.tag ? "tag" : "", onclick: () => startKind(k.kind),
    title: k.kind + (via ? " — under " + via.kind + ": " + how(via) + (via.said.length ? " (by " + via.said.join(", ") + ")" : "") : ""),
    style: "padding-left:" + (8 + depth * 18) + "px;background:linear-gradient(90deg,var(--accent-soft) " +
      (k.tag ? 0 : 100 * Math.log(1 + k.count) / widest) + "%,transparent 0)",
  }, h("span", { class: "lbl" }, word(k.kind)),
    via ? h("span", { class: "k" }, how(via)) : null,
    k.equals && k.equals.length ? h("span", { class: "k" }, "= " + k.equals.map(word).join(", ")) : null,
    h("span", { class: "n" }, counted(k)));
  if (!nested) return words.map((k) => item(k, 0));
  const byKind = new Map(words.map((k) => [k.kind, k]));
  const children = new Map();
  for (const k of words) for (const parent of k.parents) if (byKind.has(parent.kind)) children.set(parent.kind, [...(children.get(parent.kind) || []), [k, parent]]);
  const under = (k, depth, via, path) => [item(k, depth, via),
    ...(children.get(k.kind) || []).filter(([kid]) => !path.has(kid.kind)).flatMap(([kid, parent]) => under(kid, depth + 1, parent, new Set([...path, kid.kind])))];
  return words.filter((k) => !k.parents.some((parent) => byKind.has(parent.kind))).flatMap((k) => under(k, 0, null, new Set([k.kind])));
}

// How many of a kind's strings match the search, of how many — or just how many.
// Text with every occurrence of the search marked, ignoring case.
function marked(text) {
  const find = finding().toLowerCase();
  if (!find) return text;
  const lower = text.toLowerCase(), out = [];
  let from = 0;
  for (let at = lower.indexOf(find); at >= 0; at = lower.indexOf(find, at + find.length)) {
    out.push(text.slice(from, at), h("mark", {}, text.slice(at, at + find.length)));
    from = at + find.length;
  }
  out.push(text.slice(from));
  return out;
}

const counted = (k) => (finding() ? k.count + "/" + k.of : String(k.count));

async function renderStart(box) {
  const ks = kinds;
  const item = (k) => h("li", { class: k.tag ? "tag" : "", title: k.kind, onclick: () => startKind(k.kind) },
    h("span", { class: "lbl" }, word(k.kind)), h("span", { class: "n" }, counted(k)));
  const box2 = h("input", { type: "number", min: "1", value: String(threshold()), class: "threshold", title: "how many strings a noun needs before the pile's own evidence may nest it" });
  box2.onchange = () => go({ ...session, threshold: Math.max(1, Number(box2.value) || 2) });
  box.append(h("h2", {}, "kinds · every string called that"),
    h("div", { class: "note" }, "nest by the pile's evidence from ", box2, " strings up"),
    h("ul", { class: "list" }, kindsList(ks, true)),
    h("h2", {}, "tags · every string carrying one"), h("ul", { class: "list" }, ks.filter((k) => k.tag).map(item)));
  if (!ks.length) box.append(h("p", { class: "note" }, "no string holds that."));
}

// --- the left pane: what the focused column can reach -----------------------------

async function renderLeft() {
  const box = $("left");
  const fresh = h("div", {}, renderChips());
  if (!session.start) await renderStart(fresh);
  else {
    const col = view.columns[view.focus];
    // Shortcuts across a whole ("host in line") are many; they fold away under the whole they cross.
    const across = (o) => / in /.test(o.step.label);
    const offers = view.offers.filter(unchosen);
    const direct = offers.filter((o) => !across(o));
    if (direct.length) fresh.append(h("h2", {}, "from " + short(word(col.label), 40)), offerList(direct));
    const byWhole = new Map();
    for (const o of offers.filter(across)) {
      const w = o.step.label.slice(o.step.label.lastIndexOf(" in ") + 4);
      byWhole.set(w, [...(byWhole.get(w) || []), o]);
    }
    if (byWhole.size) fresh.append(h("h2", {}, "shortcuts · up to a whole and back down, two columns"));
    for (const [w, offers] of byWhole)
      fresh.append(h("details", {}, h("summary", {}, "in " + word(w) + " · " + offers.length), offerList(offers)));
    if (!offers.length) fresh.append(h("p", { class: "note" }, view.offers.length
      ? "everything this column reaches is a column already." : "nothing more is said about this column."));
  }
  box.replaceChildren(fresh);
}

// The word a step lands on: "ip" for ip, "ip in hosts-entry", "route(hop)".
const landsOn = (label) => label.split(" in ")[0].replace(/\\(.*\\)$/, "");

// A word already chosen in this reading — where it started, or any step since — is not
// offered again. A tag can be taken again.
function unchosen(o) {
  if (o.tag) return true;
  const chosen = new Set([session.start?.kind, ...session.steps.map((s) => s.label)].filter(Boolean).map(landsOn));
  return !chosen.has(landsOn(o.step.label));
}

// Offers as plain words, then the tag steps: "#IT" takes anything tagged IT.
// Each step's bar is how much of the column can take it: its height from here. Steps
// that are nouns nest the way the kinds list does — under the nouns they sit inside, seen
// or said — and come first; verbs, roles and switches follow, flat. A word that is both a
// noun and a verb is one step, so it nests with the nouns.
function offerList(offers) {
  const lattice = new Map(kinds.filter((k) => !k.tag).map((k) => [k.kind, k]));
  const item = (o, depth, via) => h("li", {
    class: o.tag ? "tag" : "", onclick: () => add(o.step),
    title: o.step.label + " — " + o.count + " of " + o.of + " cells" + (via ? "; under " + via.kind + ": " + how(via) : ""),
    style: "padding-left:" + (8 + depth * 18) + "px;background:linear-gradient(90deg,var(--accent-soft) " + (100 * o.count / Math.max(1, o.of)) + "%,transparent 0)",
  },
    h("span", { class: "lbl" }, word(o.step.label)),
    via ? h("span", { class: "k" }, how(via)) : o.kinds.length && !o.tag ? h("span", { class: "k" }, o.kinds.map(word).join(", ")) : null,
    h("span", { class: "n" }, o.count + "/" + o.of));
  const nouns = offers.filter((o) => !o.tag && lattice.has(o.step.label));
  const rest = offers.filter((o) => !nouns.includes(o));
  const here = new Map(nouns.map((o) => [o.step.label, o]));
  const children = new Map();
  for (const o of nouns) for (const parent of lattice.get(o.step.label).parents)
    if (here.has(parent.kind)) children.set(parent.kind, [...(children.get(parent.kind) || []), [o, parent]]);
  const under = (o, depth, via, path) => [item(o, depth, via),
    ...(children.get(o.step.label) || []).filter(([kid]) => !path.has(kid.step.label))
      .flatMap(([kid, parent]) => under(kid, depth + 1, parent, new Set([...path, kid.step.label])))];
  const roots = nouns.filter((o) => !lattice.get(o.step.label).parents.some((parent) => here.has(parent.kind)));
  return h("ul", { class: "list" },
    roots.flatMap((o) => under(o, 0, null, new Set([o.step.label]))),
    nouns.length && rest.length ? h("li", { class: "sep" }) : null,
    rest.filter((o) => !o.tag).map((o) => item(o, 0)), rest.filter((o) => o.tag).map((o) => item(o, 0)));
}

// A step is one link. A shortcut across a whole ("host in zone-record") is two: up to the
// whole, then down from it — both become columns, so the step in between stays visible.
function add(step) {
  const cut = step.label.lastIndexOf(" in ");
  const taken = cut < 0 ? [step] : [
    { parent: step.parent, label: step.label.slice(cut + 4) },
    { parent: session.steps.length + 1, label: step.label.slice(0, cut) },
  ];
  const steps = [...session.steps, ...taken];
  go({ ...session, steps, focus: steps.length });
}

// Removing a column removes everything that stepped from it.
function remove(col) {
  const gone = new Set([col]);
  session.steps.forEach((s, i) => { if (gone.has(s.parent)) gone.add(i + 1); });
  const keep = session.steps.map((s, i) => [s, i + 1]).filter(([, c]) => !gone.has(c));
  const renumber = new Map([[0, 0], ...keep.map(([, c], i) => [c, i + 1])]);
  const steps = keep.map(([s]) => ({ ...s, parent: renumber.get(s.parent) }));
  go({ ...session, steps, focus: Math.min(renumber.get(session.focus) ?? steps.length, steps.length) });
}

function focus(col) {
  session = { ...session, focus: col };
  history.replaceState(null, "", urlFor(session));
  load();
}

// --- the table ------------------------------------------------------------------

function renderChain() {
  const chain = $("chain");
  chain.replaceChildren(...view.columns.map((c, i) => h("span", {
    class: "pill" + (i === view.focus ? " focus" : ""),
    title: i ? "column " + (i + 1) + ", stepping from column " + (c.parent + 1) : "where the reading starts",
    onclick: () => focus(i),
  }, (i ? "" : "◆ ") + short(word(c.label), 40), i ? h("span", { class: "x", title: "remove", onclick: (e) => { e.stopPropagation(); remove(i); } }, "×") : null)));
}

function renderTable() {
  const wrap = $("table");
  if (!view.columns.length) { wrap.replaceChildren(h("div", { class: "empty" }, "Start from a kind on the left. Type in the box above to keep only the kinds that hold a string.")); $("note").textContent = ""; return; }
  const holes = view.rows.filter((r) => r.some((c) => c === null)).length;
  $("note").textContent = view.rows.length + " rows" + (holes ? " · " + holes + " with a hole" : "") + (view.truncated ? " · cut at 2000" : "");
  const head = h("tr", {}, view.columns.map((c, i) => h("th", {
    class: i === view.focus ? "focus" : "", onclick: () => focus(i),
  }, h("span", { class: "lab", title: c.label }, short(word(c.label), 40)), i && c.parent !== i - 1 ? h("span", { class: "from" }, "from " + (c.parent + 1)) : null)));
  const body = view.rows.map((row, r) => h("tr", {}, row.map((cell, col) => {
    const prev = r > 0 && view.rows[r - 1].slice(0, col + 1).every((p, j) => same(p, row[j]));
    const td = h("td", {
      class: (cell ? "" : "hole") + (prev ? " repeat" : "") + (selected && selected.row === r && selected.col === col ? " selected" : ""),
      "data-r": r, "data-c": col,
      title: cell ? cell.text : "a hole: nothing found from the cell it steps from",
      onclick: () => {
        if (!cell) return;
        selected = selected && selected.row === r && selected.col === col ? null : { row: r, col };
        renderTableMarks();
        showPath();
      },
      ondblclick: () => cell && !cell.text.includes(" → ") && startValue(cell.v),
      onmouseenter: () => markPivot(r, col, true), onmouseleave: () => markPivot(r, col, false),
    }, h("div", { class: "t" }, cell ? (col === 0 ? marked(cell.text) : cell.text) : "?"),
      cell && cell.kinds.length ? h("div", { class: "kinds" }, cell.kinds.map(word).join(", ")) : null);
    return td;
  })));
  const table = h("table", {}, h("thead", {}, head), h("tbody", {}, body));
  wrap.replaceChildren(h("div", { class: "tablewrap" }, table));
}

function renderTableMarks() {
  document.querySelectorAll("td.selected").forEach((td) => td.classList.remove("selected"));
  if (selected) document.querySelector('td[data-r="' + selected.row + '"][data-c="' + selected.col + '"]')?.classList.add("selected");
}

// --- where a cell was read from -------------------------------------------------------
// Under the clicked row: the file lines this reading went through to reach the cell, and
// every place the value appears — the ones this reading used first, the rest after.
async function showPath() {
  document.querySelectorAll("tr.pathrow").forEach((tr) => tr.remove());
  if (!selected) return;
  const { row: r, col } = selected;
  const row = view.rows[r];
  const chain = [];
  for (let c = col; c > 0; c = view.columns[c].parent) chain.unshift(c);
  const td = h("td", { colspan: view.columns.length }, h("div", { class: "note" }, "looking…"));
  document.querySelector('td[data-r="' + r + '"]')?.parentElement.after(h("tr", { class: "pathrow" }, td));
  const steps = chain.map((c) => {
    const from = row[view.columns[c].parent];
    return { from: from.v, rels: row[c].rels };
  });
  const found = await post("/api/path", { steps, value: row[col].v });
  const read = [...new Set(found.steps.flatMap((st) => st.ways.flat().map((hop) => hop.at)).filter(Boolean))];
  const used = found.appears.filter((at) => read.includes(at));
  const also = found.appears.filter((at) => !read.includes(at));
  td.replaceChildren(h("div", { class: "path" },
    h("div", { class: "line" }, h("span", { class: "lead" }, "this row read"),
      h("span", {}, read.length ? read.join(", ") : chain.length ? "nothing from a file" : "nothing — it is where the reading starts")),
    found.appears.length ? h("div", { class: "line" }, h("span", { class: "lead" }, short(row[col].text, 40) + " appears in"),
      h("span", {}, used.length ? h("b", {}, used.join(", ")) : null,
        also.length ? h("span", { class: "also" }, (used.length ? " · also " : "") + also.join(", ")) : null)) : null));
}

const same = (a, b) => (a === null && b === null) || (a && b && a.v === b.v && a.rels.join() === b.rels.join());

// The join pivots on the cell it stepped from: hovering a cell lights it up.
function markPivot(r, col, on) {
  const parent = view.columns[col]?.parent;
  if (parent === undefined || parent < 0) return;
  document.querySelector('td[data-r="' + r + '"][data-c="' + parent + '"]')?.classList.toggle("pivot", on);
}

function short(s, n) { s = String(s).replace(/\\n/g, "\\\\n"); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
// Text with each " → " drawn as a marked arrow, so it stands out in a long line.
const arrows = (text) => text.split(" → ").flatMap((part, i) => (i ? [" ", h("span", { class: "arrow" }, "→"), " ", part] : [part]));

function render() { renderChain(); renderTable(); renderLeft(); }
load();
</script>
</body></html>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
