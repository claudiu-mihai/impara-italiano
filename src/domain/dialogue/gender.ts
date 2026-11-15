/**
 * Genul personajului jucat de cursant în dialoguri. Replicile pot conține marcajul `{masculin|feminin}` oriunde într-un
 * cuvânt (`Sei sposat{o|a}?`, `Sunt român{|că}`, `{signore|signora}`); se alege varianta după gen.
 */
export type Gender = "m" | "f";

// un cuvânt care conține un marcaj, cu literele lipite de el (sposat{o|a}, român{|că})
const WORD_WITH_MARKUP = /[\p{L}'’]*\{[^{}|]*\|[^{}|]*\}[\p{L}'’]*/gu;
const MARKUP = /\{([^{}|]*)\|([^{}|]*)\}/gu;

const pick = (text: string, gender: Gender) => text.replace(MARKUP, (_, m: string, f: string) => (gender === "m" ? m : f));

/** Textul cu variantele alese pentru gen. */
export function resolveGender(text: string, gender: Gender): string {
  return pick(text, gender);
}

/** Textul pe segmente: cuvintele care se schimbă după gen (rezolvate) separat, ca să poată fi evidențiate. */
export function genderParts(text: string, gender: Gender): { text: string; gendered: boolean }[] {
  const parts: { text: string; gendered: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD_WITH_MARKUP)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), gendered: false });
    parts.push({ text: pick(match[0], gender), gendered: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), gendered: false });
  return parts;
}

/** Problemele marcajului (pentru build): acolade neechilibrate sau imbricate, câte un singur „|” în fiecare. */
export function genderMarkupProblems(text: string): string[] {
  const problems: string[] = [];
  let depth = 0;
  let pipes = 0;
  for (const char of text) {
    if (char === "{") {
      depth++;
      pipes = 0;
      if (depth > 1) problems.push(`marcaj imbricat în „${text}”`);
    } else if (char === "}") {
      if (depth === 0) problems.push(`„}” fără „{” în „${text}”`);
      else if (pipes !== 1) problems.push(`marcajul trebuie să aibă exact o bară „|” în „${text}”`);
      depth = Math.max(0, depth - 1);
    } else if (char === "|") {
      if (depth === 0) problems.push(`„|” în afara unui marcaj în „${text}”`);
      pipes++;
    }
  }
  if (depth > 0) problems.push(`marcaj neînchis în „${text}”`);
  return problems;
}
