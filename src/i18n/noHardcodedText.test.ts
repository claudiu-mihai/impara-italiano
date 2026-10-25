import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

/**
 * Textele interfeței stau în `src/i18n`. Testul caută text românesc (cu diacritice) scris direct în cod și îl refuză,
 * ca textele noi să nu rămână netraduse. Excepțiile sunt conținut în limba maternă sau mesaje pentru dezvoltatori.
 */
const ALLOWED: { file: string; text: string; why: string }[] = [
  { file: "src/ui/RulesBox.tsx", text: "De reținut", why: "titlul casetei în limba maternă (conținut)" },
  { file: "src/ui/TopicRulesBox.tsx", text: "De reținut", why: "titlul feței în limba maternă (conținut)" },
  { file: "src/features/home/HomePage.tsx", text: "Salut!", why: "traducerea frazei lui Lupino, în limba maternă" },
  { file: "src/features/home/HomePage.tsx", text: "Baftă!", why: "traducerea frazei lui Lupino, în limba maternă" },
  { file: "src/features/home/HomePage.tsx", text: "Ai terminat pentru azi", why: "traducerea frazei lui Lupino, în limba maternă" },
  { file: "src/domain/greeting.ts", text: "Bună", why: "traducerea salutului, în limba maternă" },
  { file: "src/domain/content/display.ts", text: "ro:", why: "etichetele grupurilor de teme: texte în două limbi" },
  { file: "src/domain/content/schema.ts", text: "spații la început", why: "mesaj de validare la build" },
  { file: "src/domain/content/wordsCodec.ts", text: "rangul", why: "eroare pentru dezvoltatori" },
  { file: "src/domain/content/wordsCodec.ts", text: "id-ul nu se poate", why: "eroare pentru dezvoltatori" },
  { file: "src/domain/sentence/tokenize.ts", text: "varianta", why: "mesaj de validare la build" },
  { file: "src/domain/skills/numbers.ts", text: "număr în afara", why: "eroare pentru dezvoltatori" },
  { file: "src/domain/skills/time.ts", text: "oră invalidă", why: "eroare pentru dezvoltatori" },
  { file: "src/app/content.tsx", text: "trebuie folosit", why: "eroare pentru dezvoltatori" },
  { file: "src/features/settings/SettingsPage.tsx", text: ">Română<", why: "numele limbii, scris în limba ei" },
];

const DIACRITICS = /[ăâîșțĂÂÎȘȚ]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "i18n" || name === "generated" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

const isComment = (line: string) => /^\s*(\/\/|\/\*|\*)/.test(line);

test("în componente și cod nu a rămas text românesc scris direct (în afara excepțiilor)", () => {
  const found: string[] = [];
  for (const file of sourceFiles("src")) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        if (isComment(line) || !DIACRITICS.test(line)) return;
        // doar șiruri între ghilimele/backtick sau text JSX; comentariile de la sfârșitul rândului se ignoră
        const code = line.replace(/\s\/\/.*$/, "");
        if (!/"[^"]*[ăâîșțĂÂÎȘȚ][^"]*"|`[^`]*[ăâîșțĂÂÎȘȚ][^`]*`|>[^<>{}]*[ăâîșțĂÂÎȘȚ][^<>{}]*</.test(code)) return;
        if (ALLOWED.some((a) => file.replaceAll("\\", "/").endsWith(a.file) && code.includes(a.text))) return;
        found.push(`${file}:${index + 1}: ${line.trim()}`);
      });
  }
  expect(found, "text românesc scris direct; mută-l în src/i18n/ro.ts și it.ts").toEqual([]);
});
