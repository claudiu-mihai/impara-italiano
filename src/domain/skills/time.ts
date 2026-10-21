import { numberToItalian } from "./numbers.ts";

/** Ora pe ceasul de 12 ore: `hour` 1–12, `minute` 0–59. */
export interface ClockTime {
  hour: number;
  minute: number;
}

/** „7:45” */
export const formatDigital = ({ hour, minute }: ClockTime): string => `${hour}:${String(minute).padStart(2, "0")}`;

const nextHour = (hour: number) => (hour % 12) + 1;

/** „sono le tre” / „è l'una” – verbul depinde de ora numită. */
const clause = (hour: number) => (hour === 1 ? "è l'una" : `sono le ${numberToItalian(hour)}`);

/** Fără verb: „le tre”, „l'una”. */
const bare = (hour: number) => (hour === 1 ? "l'una" : `le ${numberToItalian(hour)}`);

/**
 * Cum se spune ora în italiană: forma principală este prima, urmată de variantele acceptate
 * (cu sau fără „sono le / è l'una”): „sono le sette meno un quarto”, „le sette e quarantacinque” etc.
 */
export function timeForms({ hour, minute }: ClockTime): string[] {
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) throw new RangeError(`oră invalidă: ${hour}:${minute}`);

  const minutes = (m: number) => (m === 15 ? "un quarto" : numberToItalian(m));
  const forms: { clause: string; bare: string }[] = [];
  const add = (h: number, tail: string) => forms.push({ clause: `${clause(h)}${tail}`, bare: `${bare(h)}${tail}` });

  if (minute === 0) {
    add(hour, "");
    add(hour, " in punto");
    if (hour === 12) {
      forms.push({ clause: "è mezzogiorno", bare: "mezzogiorno" }, { clause: "è mezzanotte", bare: "mezzanotte" });
    }
  } else if (minute === 30) {
    add(hour, " e mezza");
    add(hour, " e mezzo");
    add(hour, " e trenta");
  } else if (minute < 30) {
    add(hour, ` e ${minutes(minute)}`);
    if (minute === 15) add(hour, " e quindici");
  } else {
    const rest = 60 - minute;
    add(nextHour(hour), ` meno ${minutes(rest)}`);
    add(hour, ` e ${minute === 45 ? "tre quarti" : numberToItalian(minute)}`);
    if (rest === 15) add(nextHour(hour), " meno quindici");
    if (minute === 45) add(hour, " e quarantacinque");
  }

  const all = forms.flatMap((f) => [f.clause, f.bare]);
  // formele cu verb primele, fără duplicate
  return [...new Set([...forms.map((f) => f.clause), ...all])];
}

/** Forma principală: „sono le sette meno un quarto”. */
export const timePhrase = (time: ClockTime): string => timeForms(time)[0]!;
