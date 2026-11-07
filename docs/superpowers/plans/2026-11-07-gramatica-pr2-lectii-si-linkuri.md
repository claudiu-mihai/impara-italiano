# Gramatică, partea 2 (lecțiile A1 + linkuri): plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (sau subagent-driven-development) pentru a implementa planul task cu task. Pașii folosesc checkbox-uri (`- [ ]`).

**Goal:** Restul temelor A1 (9 lecții noi, cu exerciții) și linkurile către lecții din fișa cuvântului și din conjugare,
cu întoarcere la ecranul de plecare. Totul intră pe același branch (`feat/gramatica-structura`) și într-un singur PR,
împreună cu partea 1.

**Architecture:** Lecțiile sunt fișiere noi în `content/grammar/`, în formatul din partea 1 (`lesson`, `rules`,
`items`). Legăturile cuvânt/timp → lecție stau într-un singur modul (`src/domain/grammar/links.ts`), verificat la build.
Lista verbelor neregulate la prezent se generează la build într-un fișier JSON mic, încărcat doar de ecranele care au
nevoie de el (nu la pornire).

**Tech Stack:** ca în partea 1.

**Spec:** `docs/superpowers/specs/2026-11-07-gramatica-design.md`, §2 (întoarcerea), §4 (temele 2, 3, 6–12) și §6
(linkuri).

## Global Constraints

- Aceleași ca în planul părții 1: fără atribuire, commit-uri în română, texte noi de interfață în `ro.ts` și `it.ts`,
  fără dependențe noi.
- Pachetul de pornire nu crește: după fiecare task care atinge `src/`, `npm run build` trebuie să aibă tot 7 fișiere
  JS în `dist/index.html`. Testul `perf.spec.ts` (Slow 4G) trebuie să rămână sub 1500 ms.
- Fiecare lecție nouă are 5–10 blocuri: cel puțin un `table`, un `examples` (4–6 propoziții) și un `trap`; 1–4 reguli;
  minimum 20 de exerciții, cu `gap` unic ca cuvânt întreg și cu `it` / `ro` unice.
- Exercițiile nu au mereu același răspuns. La negație, de exemplu, se ascunde și cuvântul de întrebare, nu doar *non*.
- **Verificare umană:** utilizatorul citește toate cele 9 lecții la final, înainte de PR. Corecturile intră într-un
  commit separat. Aceasta e o abatere de la spec §4 („în `content/drafts/` înainte de mutare”), aleasă ca să
  lucrăm continuu până la PR-ul unic.

## Review Focus

1. **Verb neregulat doar la alte timpuri** (de exemplu *nascere*): linkul de la prezent trebuie să ducă la lecția
   „regulat”, pentru că la prezent verbul e regulat (test în Task 4).
2. **Linkul din conjugare în timpul unei sesiuni:** după „Înapoi”, sesiunea reîncepe fără să piardă repetițiile deja
   salvate (test în Task 6).
3. **Pagina de lecție deschisă direct** (fără ecran de plecare): „Înapoi” duce la `/learn/grammar` (test în Task 5).
4. **Interfață în italiană:** eticheta linkului apare în italiană, chiar dacă titlul lecției rămâne în română
   (test în Task 5).
5. **Id de lecție greșit în `links.ts`:** build-ul pică cu un mesaj clar, nu apare un link mort (test în Task 4).

---

### Task 1: Lecțiile 2, 3, 6 (gen și plural, acordul adjectivului, prezentul regulat)

**Files:** Create `content/grammar/04-genere-plurale.json` (`order: 2`), `05-aggettivi.json` (`order: 3`),
`06-presente-regolare.json` (`order: 6`).

Conținut fixat:
- `genere-plurale`: -o → -i (masculin), -a → -e (feminin), -e → -i (ambele). Excepții frecvente: *la mano / le mani*,
  *il problema / i problemi*, *l'uomo / gli uomini*, cuvinte cu accent final invariabile (*la città / le città*).
  Capcană: genul nu coincide mereu cu româna (*il latte*, *il fiore*, *la gente* = oamenii, la singular).
- `aggettivi`: adjectivul se acordă în gen și număr; după substantiv (*una casa grande*), cu excepția câtorva frecvente
  (*bello, buono, grande*). Tabel: *rosso / rossa / rossi / rosse*, *verde / verdi*. Capcană: *molto* ca adjectiv
  (*molti amici*) față de adverb (*molto bello*).
- `presente-regolare`: trei grupe (-are, -ere, -ire) + -ire cu -isc-; tabel cu *parlare / credere / dormire / capire*.
  Capcană: accentul la persoana a III-a plural (*parlano*, nu *parlàno*).

- [ ] **Step 1:** Scrie cele 3 fișiere.
- [ ] **Step 2:** `npm run validate` → „Conținut valid”.
- [ ] **Step 3:** Commit `feat(grammar): lecții pentru gen și plural, adjectiv, prezentul regulat`.

### Task 2: Lecțiile 7, 8, 9 (neregulate la prezent, negația și întrebarea, c'è / ci sono)

**Files:** Create `07-presente-irregolare.json` (`order: 7`), `08-negazione-domande.json` (`order: 8`),
`09-ce-ci-sono.json` (`order: 9`).

Conținut fixat:
- `presente-irregolare`: *andare, fare, venire, volere, potere, dovere, sapere, dire, uscire, stare*. Tabel cu
  formele de *andare, fare, volere, potere*. Capcană: *stare* față de *essere* (*Come stai?*, *Sto bene*).
- `negazione-domande`: *non* înaintea verbului; dubla negație (*Non vedo niente*, *Non c'è nessuno*); întrebarea se
  face din intonație (*Sei stanco?*); cuvintele de întrebare. În exerciții se ascund *non*, *niente*, *nessuno*,
  *mai* și cuvintele de întrebare.
- `ce-ci-sono`: *c'è* + singular, *ci sono* + plural; *Che cosa c'è?*; *C'è Marco?* (e acasă?). Capcană: „este” de
  existență nu se traduce cu *è*: *C'è un bar qui vicino*, nu „È un bar”.

- [ ] **Step 1:** Scrie cele 3 fișiere.
- [ ] **Step 2:** `npm run validate` → „Conținut valid”.
- [ ] **Step 3:** Commit `feat(grammar): lecții pentru verbe neregulate, negație și întrebare, c'è / ci sono`.

### Task 3: Lecțiile 10, 11, 12 (prepoziții articulate, posesive, mi piace) + lista completă

**Files:**
- Create `10-preposizioni.json` (`order: 10`), `11-possessivi.json` (`order: 11`), `12-piacere.json` (`order: 12`)
- Modify `src/i18n/ro.ts`, `src/i18n/it.ts` (`learn.grammarHint`)
- Modify `tests/e2e/grammar.spec.ts` (primul test)

Conținut fixat:
- `preposizioni`: tabelul *di, a, da, in, su* × *il, lo, la, l', i, gli, le* (*del, al, dal, nel, sul…*); *con* și
  *per* nu se contopesc; *dei libri* = niște cărți.
- `possessivi`: *il mio / la mia / i miei / le mie*…; articolul stă înaintea posesivului (*la mia casa*), dar dispare la
  rudele la singular (*mia madre*, dar *le mie sorelle*). Capcană: *loro* nu se schimbă (*la loro casa*,
  *i loro amici*).
- `piacere`: *mi piace* + singular sau verb, *mi piacciono* + plural; *ti, gli, le, ci, vi, gli*. Capcană: ordinea
  e inversă față de „îmi place”, dar acordul e la fel: *Mi piacciono i gatti* = îmi plac pisicile.
- `learn.grammarHint`: „Lecții scurte și exerciții, de la articole la verbe” / „Lezioni brevi ed esercizi, dagli
  articoli ai verbi”.
- Testul E2E „Învață → Gramatică” verifică primele 3 titluri: articolele, genul și pluralul, acordul adjectivului.

- [ ] **Step 1:** Actualizează testul E2E (titlurile) și rulează-l → FAIL.
- [ ] **Step 2:** Scrie cele 3 fișiere și textul `learn.grammarHint`.
- [ ] **Step 3:** `npm run validate && npx playwright test tests/e2e/grammar.spec.ts` → PASS.
- [ ] **Step 4:** Commit `feat(grammar): lecții pentru prepoziții, posesive și mi piace`.

### Task 4: Legăturile cuvânt / timp → lecție (domeniu + build)

**Files:**
- Create `src/domain/grammar/links.ts`, `src/domain/grammar/links.test.ts`
- Modify `scripts/content.ts` (validarea id-urilor), `scripts/build-data.ts` (scrie
  `src/data/generated/presenteIrregular.json`)
- Modify `src/data/content/contentStore.ts` (`loadPresenteIrregular`)

**Interfaces:**
- `GRAMMAR_LINKS`, ca în spec §6: `noun`, `adjective`, `verbRegular`, `verbIrregular`, `tense`.
- `lessonForWord(pos: Pos, verbId: string, irregularPresente: ReadonlySet<string>): string | undefined`:
  `noun` → `genere-plurale`, `adjective` → `aggettivi`, `verb` → `presente-irregolare` dacă `verbId` e în set,
  altfel `presente-regolare`; altfel `undefined`.
- `lessonForTense(tense: Tense, verbId: string, irregularPresente: ReadonlySet<string>): string | undefined`: pentru
  `presente`, aceeași alegere ca la verb; pentru celelalte timpuri, `GRAMMAR_LINKS.tense[tense]` (deocamdată
  `undefined`).
- `presenteIrregular.json`: lista sortată de id-uri de verbe (`v-…`) cu prezentul în `irregular.json`, plus
  *essere* și *avere*. Se încarcă prin `loadPresenteIrregular(): Promise<ReadonlySet<string>>` (import dinamic).
- La build: fiecare id din `GRAMMAR_LINKS` (inclusiv `tense`) trebuie să existe în `content/grammar/`. Altfel apare
  eroarea `links.ts: lecția „<id>” nu există`.

- [ ] **Step 1:** Testele care pică:

```ts
const irregular = new Set(["v-andare", "v-essere"]);
test("lessonForWord", () => {
  expect(lessonForWord("noun", "n-libro", irregular)).toBe("genere-plurale");
  expect(lessonForWord("adjective", "a-rosso", irregular)).toBe("aggettivi");
  expect(lessonForWord("verb", "v-parlare", irregular)).toBe("presente-regolare");
  expect(lessonForWord("verb", "v-andare", irregular)).toBe("presente-irregolare");
  expect(lessonForWord("adverb", "x-bene", irregular)).toBeUndefined();
});
test("lessonForTense: doar prezentul are lecție deocamdată", () => {
  expect(lessonForTense("presente", "v-nascere", irregular)).toBe("presente-regolare");
  expect(lessonForTense("presente", "v-essere", irregular)).toBe("presente-irregolare");
  expect(lessonForTense("imperfetto", "v-andare", irregular)).toBeUndefined();
});
test("toate id-urile din GRAMMAR_LINKS există în content/grammar", () => {
  // citește id-urile din content/grammar/*.json, ca grammar.test.ts
});
```

(Ultimul test chiar citește fișierele și compară id-urile; nu rămâne un simplu comentariu.)

- [ ] **Step 2:** Rulează testele → FAIL. **Step 3:** Implementează. **Step 4:** `npx vitest run && npm run validate`
  → PASS; `npm run build` → tot 7 fișiere la pornire.
- [ ] **Step 5:** Commit `feat(grammar): legăturile dintre cuvinte, timpuri și lecții`.

### Task 5: Linkuri în fișa cuvântului + întoarcerea din lecție

**Files:** Create `src/features/grammar/LessonLink.tsx`; modify `src/features/browse/WordDetailPage.tsx`,
`src/features/grammar/GrammarTopicPage.tsx`, `src/i18n/ro.ts`, `src/i18n/it.ts`, `tests/e2e/grammar.spec.ts`.

**Interfaces:**
- `<LessonLink topicId={string} from={{ path: string; label: string }} />`: link mic „📘 {grammar.ruleLink}: <titlul
  lecției>” către `/learn/grammar/<id>`, cu `state: { from }`. Titlul vine din `useGrammar()`; până se încarcă
  temele, nu se afișează nimic.
- i18n: `grammar.ruleLink` = „Regula” / „La regola”.
- `GrammarTopicPage`: dacă `location.state?.from` există, `BackLink` duce la `from.path`, cu eticheta `from.label`;
  altfel duce la `/learn/grammar`, ca acum.
- `WordDetailPage`: în secțiunile substantiv / adjectiv / verb, `LessonLink` cu
  `lessonForWord(word.pos, word.id, irregular)` și `from = { path: "/browse/<id>", label: word.it }`.

- [ ] **Step 1:** Teste E2E care pică:
  1. `/browse/v-andare` → link „Regula: Verbe neregulate frecvente la prezent” → lecția → „Înapoi la andare” →
     înapoi pe `/browse/v-andare`.
  2. `/learn/grammar/articoli` deschis direct → `BackLink` duce la `/learn/grammar`.
  3. Cu interfața în italiană: pe `/browse/n-libro` apare „La regola”.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează. **Step 4:** testele E2E pentru gramatică și dicționar
  (minus cele 3 care pică deja pe `main`) → PASS; build cu 7 fișiere la pornire.
- [ ] **Step 5:** Commit `feat(grammar): linkuri către lecții din fișa cuvântului`.

### Task 6: Link în conjugare

**Files:** modify `src/features/conjugation/ConjugationPage.tsx`, `tests/e2e/conjugation-modes.spec.ts` (sau un spec
nou, `grammar-links.spec.ts`).

- Sub cartonaș, dacă `lessonForTense(item.tense, item.verbId, irregular)` dă o lecție: `LessonLink`, cu
  `from = { path: "/learn/conjugation", label: t("learn.conjugation") }`.
- Lista se încarcă cu `loadPresenteIrregular()` doar pe acest ecran.

- [ ] **Step 1:** Test E2E care pică: sesiune de conjugare (după modelul din `conjugation-modes.spec.ts`), cu un
  cartonaș la prezent → apare linkul → lecția → „Înapoi la Conjugare” → sesiunea e din nou vizibilă.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează. **Step 4:** testele E2E pentru conjugare și gramatică
  → PASS; build cu 7 fișiere; `perf.spec.ts` sub 1500 ms.
- [ ] **Step 5:** Commit `feat(grammar): link către lecție din conjugare`.

### După toate task-urile

1. Suita completă: `npm run validate && npm run typecheck && npx vitest run && npm run test:e2e`. Singurele
   eșecuri acceptate sunt cele 3 din `browse.spec.ts`, care pică deja pe `main`.
2. Utilizatorul citește cele 9 lecții. Corecturile intră într-un commit separat.
3. Review final al întregului branch (părțile 1 + 2), apoi întrebarea despre PR.
