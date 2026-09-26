// What every producer shares: the shapes of line a producer writes. cascade.ts is the one
// producer; a cutter is a table it reads.
// Producers import core/ only — never middle/ or display/.
//
// All pure. An id is computed from content, so a producer never has to remember what it
// wrote: it can point at a line again by recomputing its id. Two producers writing the same
// line write the same line, and union collapses them; each says it said it with a tag.

import { id } from "./core/identity.ts";
import type { Line } from "./core/lines.ts";

// The only primitive: connect two things. From a plain string it is a link (right found
// inside left); from an id it is a tag on that line.
export const line = (left: string, right: string): Line => [left, id(left, right), right];

// --- words --------------------------------------------------------------------------
// A word is text found in a vocabulary: a link from the vocabulary's name to the text, so
// its id is that link's. Every word is tagged <WORD>, and its roles (<NOUN>, <VERB> …) are
// more tags on it. The markers are words too, found in the vocabulary "eoe"; <WORD> is the
// one that is not tagged, since it is where tagging a word starts.
//
// The same text in the same vocabulary is one word, whichever producer writes it.

export const WORD = "<WORD>";
export const MARKERS = "eoe";
const wordMark = line(MARKERS, WORD);
const marker = (name: string): Line[] => {
  const found = line(MARKERS, name);
  return [found, line(found[1], wordMark[1])];
};

// A marker, as a word: its id, and the lines that make it one.
export function markerWord(name: string): { id: string; lines: Line[] } {
  const lines = [wordMark, ...marker(name)];
  return { id: lines[1][1], lines };
}

export function word(vocabularyName: string, text: string, roles: string[] = []): { id: string; lines: Line[] } {
  const found = line(vocabularyName, text);
  return {
    id: found[1],
    lines: [
      wordMark, found, line(found[1], wordMark[1]),
      ...roles.flatMap((role) => { const [roleWord, ...its] = marker(role); return [roleWord, ...its, line(found[1], roleWord[1])]; }),
    ],
  };
}

// Who said a line: a tag on it with the producer's name, a word in the vocabulary "sources"
// playing the role <SAID-BY>.
export const SOURCES = "sources";
export const SAID_BY = "<SAID-BY>";
export function saidBy(lineId: string, source: string): Line[] {
  const one = word(SOURCES, source, [SAID_BY]);
  return [...one.lines, line(lineId, one.id)];
}

// Every word some lines found: its id, vocabulary and text — the links tagged <WORD>.
export function wordsIn(lines: Line[]): { id: string; vocabulary: string; text: string }[] {
  const tagged = new Set(lines.filter(([, , right]) => right === wordMark[1]).map(([left]) => left));
  return lines.filter(([, middle]) => tagged.has(middle)).map(([vocabularyName, middle, text]) => ({ id: middle, vocabulary: vocabularyName, text }));
}

// A raw file as the runner read it.
export type Source = { path: string; text: string };
