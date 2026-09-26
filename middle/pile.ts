// MIDDLE — see README.md. Readings of a checked pile, by position only: the left, middle
// and right of a line. Imports core/ only, and knows no words.
//
// A line leaving a plain string is a link: its right was found inside its left. A line
// leaving a middle is a tag on that middle — and a tag is a line, so it can be tagged in
// turn, as far as anyone likes.

import type { Line, LineIndex } from "../core/lines.ts";

export type Pile = ReturnType<typeof readPile>;

export function readPile(lineIndex: LineIndex) {
  // Whether this string is the middle of a line.
  const isMiddle = (someString: string) => lineIndex.lineByMiddle.has(someString);

  // The left and right of the line with this middle.
  const endsOf = (middleId: string): [string, string] | undefined => {
    const line = lineIndex.lineByMiddle.get(middleId);
    return line && [line[0], line[2]];
  };

  // Every line with this string as its left or its right.
  const linesTouching = (someString: string): Line[] => [
    ...(lineIndex.linesByLeft.get(someString) ?? []),
    ...(lineIndex.linesByRight.get(someString) ?? []),
  ];

  const allLines = (): Line[] => [...lineIndex.lineByMiddle.values()];

  // Whether the line with this middle is a link: it leaves a plain string.
  const isLink = (middleId: string) => {
    const line = lineIndex.lineByMiddle.get(middleId);
    return !!line && !isMiddle(line[0]);
  };

  // The tags on a middle: the lines leaving it. A plain string has none — what leaves it
  // is a link.
  const tagLines = (middleId: string): Line[] => (isMiddle(middleId) ? lineIndex.linesByLeft.get(middleId) ?? [] : []);
  const tagsOn = (middleId: string): string[] => tagLines(middleId).map(([, , word]) => word);

  // The links through this string, and which side of each it is on.
  const linksFrom = (someString: string): { line: Line; side: "left" | "right" }[] => [
    ...(lineIndex.linesByLeft.get(someString) ?? []).map((line) => ({ line, side: "left" as const })),
    ...(lineIndex.linesByRight.get(someString) ?? []).map((line) => ({ line, side: "right" as const })),
  ].filter(({ line: [, middleId] }) => isLink(middleId));

  return { isMiddle, endsOf, linesTouching, allLines, isLink, tagLines, tagsOn, linksFrom };
}
