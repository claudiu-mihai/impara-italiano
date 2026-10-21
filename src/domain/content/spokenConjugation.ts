import type { Tense } from "./constants.ts";
import { personsOf } from "./display.ts";

/**
 * Textul rostit pentru o formă conjugată: forma cu pronumele, ca legătura persoană–formă să se fixeze
 * și auditiv (noi abbiamo parlato). La „lui/lei” se rostește doar „lui”; la congiuntivo se pune „che”
 * înainte (che io parli); la imperativ nu se pune pronume (Parla!).
 * Dintre formele acceptate se alege prima fără apostrof (vai, nu va'), pe care vocea o citește corect.
 */
export function spokenConjugation(tense: Tense, personIndex: number, alternatives: readonly string[]): string {
  const form = alternatives.find((f) => !f.endsWith("'")) ?? alternatives[0] ?? "";
  if (tense === "imperativo") return `${form.charAt(0).toUpperCase()}${form.slice(1)}!`;

  const pronoun = personsOf(tense)[personIndex]?.it.split("/")[0] ?? "";
  const phrase = pronoun ? `${pronoun} ${form}` : form;
  return tense === "congiuntivo" ? `che ${phrase}` : phrase;
}
