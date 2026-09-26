// Runs one cutter over one raw file and prints its lines:   node cut.ts CUTTER.tsv FILE
// For writing a table and seeing what it says. eoe.ts cuts the whole demo when it starts.

import { readFileSync } from "node:fs";
import { cutByCascade, parseCutter } from "./cascade.ts";

const [cutterPath, path] = process.argv.slice(2);
if (!cutterPath || !path) {
  console.error("usage: node cut.ts CUTTER.tsv FILE");
  process.exit(2);
}
const cutter = parseCutter(readFileSync(cutterPath, "utf8"), cutterPath);
for (const l of cutByCascade({ path, text: readFileSync(path, "utf8") }, cutter)) console.log(JSON.stringify(l));
