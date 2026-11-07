/**
 * Marcajele din textul lecțiilor: `[it]…[/it]` pentru italiană și `[b]…[/b]` pentru bold.
 * Nu se pot imbrica; orice alt `[x]` este o greșeală de scriere, semnalată la build.
 */

export interface InlineSegment {
  text: string;
  it?: true;
  bold?: true;
}

const TAG = /\[(\/?)([a-z]+)\]/g;
const KNOWN = new Set(["it", "b"]);

/** Mesajul de eroare pentru marcaje greșite, sau `undefined` dacă textul e corect. */
export function markupError(s: string): string | undefined {
  let open: string | undefined;
  for (const [, closing, name] of s.matchAll(TAG)) {
    if (!KNOWN.has(name!)) return `marcaj necunoscut: [${closing}${name}]`;
    if (closing) {
      if (open !== name) return `marcaj [/${name}] fără deschidere`;
      open = undefined;
    } else {
      if (open) return `marcaj imbricat: [${name}] în [${open}]`;
      open = name;
    }
  }
  return open ? `marcaj neînchis: [${open}]` : undefined;
}

/** Împarte textul în segmente (presupune marcaje corecte, verificate la build). */
export function parseInline(s: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let style: "it" | "b" | undefined;
  let last = 0;
  const push = (text: string) => {
    if (!text) return;
    out.push(style === "it" ? { text, it: true } : style === "b" ? { text, bold: true } : { text });
  };
  for (const match of s.matchAll(TAG)) {
    const [, closing, name] = match;
    if (!KNOWN.has(name!)) continue;
    push(s.slice(last, match.index));
    style = closing ? undefined : (name as "it" | "b");
    last = match.index + match[0].length;
  }
  push(s.slice(last));
  return out;
}

/** Textul fără marcaje (pentru voce). */
export function plainText(s: string): string {
  return parseInline(s)
    .map((segment) => segment.text)
    .join("");
}
