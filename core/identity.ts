// CORE — id(line) = hash( left · right ). Imports nothing from middle/ or display/.
//
// A line's id is its content: the same two ends are the same line, whoever writes it. Who
// said it is a tag on the line, not part of its name.

import { createHash } from "node:crypto";

// Length-prefixed, so "ab"+"c" and "a"+"bc" stay apart.
export function id(left: string, right: string): string {
  const hash = createHash("sha256");
  for (const part of [left, right]) hash.update(`${Buffer.byteLength(part)}:${part}`);
  return hash.digest("hex").slice(0, 12);
}
