// A producer: the tuning files, as lines. Pure: a tuning's text and the pile's words in,
// lines out. Two kinds of line, both tagging words with a word of the tuning's own
// vocabulary:
//
//   tag machine = host@IT ip           "machine" plays <SWITCH>: switching it shows its
//                                      members (see display/table.ts)
//   broader address = ip host@IT       "address" is broader than its members: the tagging
//                                      itself is tagged <BROADER>, so a reader climbing the
//                                      tower follows only these steps, and knows it
//
// A member is a text ("ip": that word in any vocabulary), a vocabulary ("@IT": every word
// in it), or both ("host@IT"). Each tagging says it was said by the tuning file. Aliases
// are not lines: they only rename, and the page reads them itself.
//
// Imports core/ and produce.ts only.

import type { Line } from "./core/lines.ts";
import { line, markerWord, saidBy, word, type wordsIn } from "./produce.ts";

export const SWITCH = "<SWITCH>";
export const BROADER = "<BROADER>";

export function tuneLines(name: string, text: string, words: ReturnType<typeof wordsIn>): Line[] {
  const out: Line[] = [];
  for (const raw of text.split("\n")) {
    const [keyword, ...rest] = raw.trim().split(/\s+/);
    if (keyword !== "tag" && keyword !== "broader") continue;
    const [tagName, members] = rest.join(" ").split("=").map((part) => part.trim());
    if (!tagName || !members) continue;
    const tag = word(name, tagName, keyword === "tag" ? [SWITCH] : []);
    const meaning = keyword === "broader" ? markerWord(BROADER) : undefined;
    out.push(...tag.lines, ...(meaning?.lines ?? []));
    for (const member of members.split(/\s+/)) {
      const [memberText, memberVocabulary] = member.split("@");
      for (const one of words)
        if ((!memberText || one.text === memberText) && (!memberVocabulary || one.vocabulary === memberVocabulary)) {
          const tagging = line(one.id, tag.id);
          out.push(tagging, ...saidBy(tagging[1], `${name}.tuning`), ...(meaning ? [line(tagging[1], meaning.id)] : []));
        }
    }
  }
  return out;
}
