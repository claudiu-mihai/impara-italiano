// Reguli pentru articole și plural, folosite la completarea automată a substantivelor
// și apoi verificate față de Wiktionary.

const VOWEL = /^[aeiouàèéìòù]/;
/** Cuvinte care cer „lo” / „gli”: z, s + consoană, gn, ps, pn, x, y. */
const SPECIAL = /^(z|s[^aeiouàèéìòù]|gn|ps|pn|x|y)/;

export type Gender = "m" | "f";

export function definiteArticle(word: string, gender: Gender): "il" | "lo" | "la" | "l'" {
  word = word.toLowerCase(); // „Italia” → l'Italia
  if (VOWEL.test(word)) return "l'";
  if (gender === "f") return "la";
  return SPECIAL.test(word) ? "lo" : "il";
}

export function pluralArticle(word: string, gender: Gender, pluralGender: Gender = gender): "i" | "gli" | "le" {
  if (pluralGender === "f") return "le";
  return VOWEL.test(word) || SPECIAL.test(word) ? "gli" : "i";
}

/** Pluralul „de manual”; dacă diferă de cel real, cuvântul primește marcajul de plural neregulat. */
export function regularPlural(word: string, gender: Gender): string {
  if (/[àèéìòùíóúîôû]$/.test(word) || /[^aeiou]$/.test(word)) return word; // invariabil: città, caffè, film
  if (/ca$/.test(word)) return word.replace(/ca$/, "che");
  if (/ga$/.test(word)) return word.replace(/ga$/, "ghe");
  if (/(cia|gia)$/.test(word)) return word.replace(/(c|g)ia$/, "$1e"); // arancia → arance (fără -i- accentuat)
  if (/io$/.test(word)) return word.replace(/io$/, "i"); // figlio → figli
  if (/o$/.test(word)) return gender === "m" ? word.replace(/o$/, "i") : word; // mano → mani
  if (/a$/.test(word)) return gender === "f" ? word.replace(/a$/, "e") : word.replace(/a$/, "i");
  if (/e$/.test(word)) return word.replace(/e$/, "i");
  return word;
}
