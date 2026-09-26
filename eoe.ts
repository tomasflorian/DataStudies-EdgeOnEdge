// EdgeOnEdge — cut, check, and walk.
//   node eoe.ts [--port N] [FILE.eoe...]
//
// Offers every raw file to every table in cutters/, writes the pile to demo/pile.eoe,
// has every tunings/*.tuning tag the words found, unions in any other .eoe files named,
// checks, and serves the column walk with the tunings' aliases. The pile is rebuilt on every start, so it is
// always the one the raw files and the tables make.
//
// The only impure file besides cut.ts: it reads, writes the pile, prints, and serves.
// Everything between is one chain:  cut → union → check → index → readPile → render.

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { cutByCascade, parseCutter } from "./cascade.ts";
import { check, index, parse, union, type Line } from "./core/lines.ts";
import { readPile, type Pile } from "./middle/pile.ts";
import { tabler } from "./display/table.ts";
import { mergeAliases, parseAliases } from "./display/tuning.ts";
import { tuneLines } from "./tune.ts";
import { wordsIn } from "./produce.ts";
import { tablePage } from "./display/tablepage.ts";

const PILE = "demo/pile.eoe";

// Every raw file, offered to every table: each cuts the files it recognizes, so a file can
// be read several ways, and every file is at least text. The pile's lines come out sorted,
// so the file reads the same however often it is rebuilt.
function cutAll(): Line[] {
  const cutters = readdirSync("cutters").filter((f) => f.endsWith(".tsv")).sort()
    .map((f) => parseCutter(readFileSync(`cutters/${f}`, "utf8"), f));
  const files = (readdirSync("demo/raw", { recursive: true }) as string[]).sort()
    .map((f) => `demo/raw/${f}`).filter((path) => statSync(path).isFile());
  return union(...files.flatMap((path) => {
    const text = readFileSync(path, "utf8");
    return cutters.map((cutter) => cutByCascade({ path, text }, cutter));
  }));
}

// The walk page, and the questions it asks. Every answer is computed from the lines, with
// the aliases of every tuning file.
function serveWalk(pile: Pile, aliases: Record<string, string>, title: string, port: number) {
  const html = tablePage(title);
  const walk = tabler(pile);
  const json = (res: import("node:http").ServerResponse, body: unknown) =>
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const tagsParam = url.searchParams.get("tags");
      const tags = tagsParam === null ? undefined : tagsParam.split(",").filter(Boolean);
      if (url.pathname === "/api/aliases") return json(res, aliases);
      if (url.pathname === "/api/tags") return json(res, walk.tags());
      if (url.pathname === "/api/kinds") return json(res, walk.kinds(tags, Number(url.searchParams.get("threshold")) || 2, url.searchParams.get("find") || undefined));
      if (url.pathname === "/api/find") return json(res, walk.find(url.searchParams.get("q") ?? ""));
      if (url.pathname === "/api/view") return json(res, walk.view(JSON.parse(body)));
      if (url.pathname === "/api/path") { const q = JSON.parse(body); return json(res, walk.path(q.steps, q.value)); }
      if (url.pathname === "/") return res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
      res.writeHead(404).end();
    } catch (e) {
      res.writeHead(400, { "content-type": "text/plain" }).end(String(e));
    }
  }).listen(port, () => console.log(`walking http://localhost:${port}  (Ctrl-C to stop)`));
}

// The pile: every raw file cut, the tunings' tags on the words found, and the lines of any
// other .eoe files named — checked. `pileLines` is what demo/pile.eoe holds.
export function buildPile(extra: string[] = []) {
  // The tunings tag words the files were cut into — and those in any .eoe file named.
  const dir = "tunings";
  const tuningFiles = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".tuning")).sort()
      .map((f) => ({ name: f.replace(/\.tuning$/, ""), text: readFileSync(`${dir}/${f}`, "utf8") }))
    : [];
  const cut = cutAll();
  const parsed = extra.map((f) => parse(readFileSync(f, "utf8"), f));
  const found = union(cut, ...parsed.map((p) => p.lines));
  const tuned = union(...tuningFiles.map(({ name, text }) => tuneLines(name, text, wordsIn(found))));
  const lines = union(found, tuned);
  const { kept, setAside } = check(lines);
  const problems = [...parsed.flatMap((p) => p.problems), ...setAside.map((s) => `set aside ${JSON.stringify(s.line)}: ${s.why}`)];
  const aliases = mergeAliases(tuningFiles.map(({ text }) => parseAliases(text)));
  return { cut, lines, kept, setAside, problems, aliases, pileLines: union(cut, tuned) };
}

function main(argv: string[]) {
  const port = Number(argv[argv.indexOf("--port") + 1]) || 8788;
  const extra = argv.filter((a, i) => a !== "--port" && argv[i - 1] !== "--port");
  const built = buildPile(extra);
  writeFileSync(PILE, built.pileLines.map((l) => JSON.stringify(l)).sort().join("\n") + "\n");
  for (const problem of built.problems) console.error(problem);
  console.log(`${PILE}: ${built.cut.length} lines cut${extra.length ? `, ${built.lines.length} with ${extra.join(" ")}` : ""}, ${built.setAside.length} set aside`);
  serveWalk(readPile(index(built.kept)), built.aliases, [PILE, ...extra].join(" "), port);
}

if (import.meta.main) main(process.argv.slice(2));
