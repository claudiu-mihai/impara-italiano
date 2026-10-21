// Numerele în italiană, generate din reguli (nu scrise de mână): 0 – 999.999.999.

const UNITS = [
  "zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci",
  "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove",
];
const TENS = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];

/** Pune accent pe „tre” final în numerele compuse (ventitré, centotré); „tre” singur rămâne fără accent. */
function accentFinalTre(words: string): string {
  const last = words.split(" ").at(-1)!;
  return last.endsWith("tre") && last !== "tre" ? `${words.slice(0, -3)}tré` : words;
}

/** 0–99 (forma principală). */
function below100(n: number): string {
  if (n < 20) return UNITS[n]!;
  const ten = TENS[Math.floor(n / 10)]!;
  const unit = n % 10;
  if (unit === 0) return ten;
  // zecea pierde vocala finală înaintea lui „uno” și „otto”: ventuno, ventotto
  const base = unit === 1 || unit === 8 ? ten.slice(0, -1) : ten;
  return `${base}${UNITS[unit]}`;
}

/** 0–999, cu variantele de elidare la „cento” (centottanta / centoottanta). */
function below1000(n: number, elide: boolean): string {
  if (n < 100) return below100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds === 1 ? "cento" : `${UNITS[hundreds]}cento`;
  if (rest === 0) return head;
  const tail = below100(rest);
  // „cento” + ottanta / otto: centottanta, centotto (ca și forma fără elidare: centoottanta)
  const elided = elide && /^ott/.test(tail) ? head.slice(0, -1) : head;
  return `${elided}${tail}`;
}

function build(n: number, elide: boolean): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new RangeError(`număr în afara intervalului: ${n}`);
  if (n < 1000) return below1000(n, elide);

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (millions > 0) parts.push(millions === 1 ? "un milione" : `${build(millions, elide)} milioni`);

  let thousandsWord = "";
  if (thousands === 1) thousandsWord = "mille";
  else if (thousands > 1) thousandsWord = `${below1000(thousands, elide)}mila`;
  // cu milioane, miile și restul se despart prin spațiu (un milione duecentomila trecento)
  const tail = rest > 0 ? below1000(rest, elide) : "";
  const lower = `${thousandsWord}${tail}`;
  if (lower) parts.push(lower);
  return parts.join(" ");
}

/** Numărul scris cu litere, în forma principală (ventitré, centottanta, duemilaventitré, un milione). */
export function numberToItalian(n: number): string {
  return accentFinalTre(build(n, true));
}

/** Toate scrierile acceptate (cu și fără elidare la „cento”). */
export function numberForms(n: number): string[] {
  return [...new Set([build(n, true), build(n, false)].map(accentFinalTre))];
}

/** Cifrele cu punct ca separator al miilor, ca în italiană: 1.234.567 (sub 1000 rămân neschimbate). */
export function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Scrierile cu cifre acceptate la răspuns: 1234, 1.234, 1 234. */
export function digitForms(n: number): string[] {
  return [...new Set([String(n), formatNumber(n), formatNumber(n).replaceAll(".", " ")])];
}
