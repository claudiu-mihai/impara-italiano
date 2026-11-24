# Modi di dire: plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 60 de idiomuri italiene în dicționar și într-o temă „Modi di dire”, plus 58 de carduri noi în Flux, cu traducere literală, echivalent românesc și categoria de potrivire.

**Architecture:**
- Idiomurile sunt intrări `expression` obișnuite, deci primesc automat cartonașe FSRS, căutare, propoziții și audio.
- Tema le grupează pentru exercițiul de potrivire.
- În Flux, un tip nou de item în pachet, `modo-di-dire`, extinde itemul simplu cu `literal`, `roEquivalent` și `match`. Cardul `PackItemCard` le afișează.
- Pentru audio se folosesc doar generatoarele existente.

**Tech Stack:** React 19, TypeScript, Zod 4, Tailwind, Vitest, Playwright, Qwen3-TTS local (`~/qwen-tts`).

**Spec:** `docs/superpowers/specs/2026-11-24-modi-di-dire-design.md`. Citește-o întâi: tabelul cu cele 60 de idiomuri e conținutul exact.

**Execuție (cerută de utilizator):** implementarea și reviziile cu subagenți **Sonnet**, PR-ul (Task 5) cu un subagent **Haiku**.

## Global Constraints

- Branch `feat/modi-di-dire`. Commit-urile în română, în stilul repo-ului (`feat(flux): …`, `feat(continut): …`), **fără nicio mențiune de AI/asistent, fără trailere `Co-Authored-By` și fără „Generated with”**, chiar dacă un default al uneltelor cere asta.
- Nu se face push, PR sau merge, cu excepția Task 5 (PR deschis, nu îmbinat).
- Textele interfeței în `src/i18n/ro.ts` și `src/i18n/it.ts`, cu aceleași chei (`src/i18n/i18n.test.ts`, `src/i18n/noHardcodedText.test.ts`).
- Fără dependențe noi.
- Conținutul din tabelul spec-ului (it, sens, literal, echivalent, match, nivel, grup) se copiază exact. Exemplele, explicațiile și testele se scriu nou, în italiană corectă și în română naturală.
- Comentariile din cod în română, la densitatea din fișierele vecine.
- Verificarea de la final: `npm test`, `npm run typecheck`, `npm run validate`, `npm run test:e2e -- --trace off`.

## Review Focus

- **Utilizator sub nivelul idiomului:** un utilizator B1 nu vede în Flux carduri `modo-di-dire` B2. Testul e în Task 1 (`pack.test.ts`).
- **Idiom fără echivalent (`different`):** cardul nu afișează un rând „În română” gol. Testul e în Task 3.
- **Idiomuri lungi în potrivire:** „dire pane al pane e vino al vino” și altele nu depășesc lățimea ecranului la 360 px. Testul e în Task 3.
- **Id-uri cu apostrof sau diacritice** (`e-a_quattr'occhi`, `e-non_è_pane_per_i_miei_denti`): pagina cuvântului se deschide. Testul e în Task 3.
- **Testele din Flux:** răspunsul corect nu e mereu pe aceeași poziție în fișier (amestecarea din `PackQuizCard` nu acoperă o greșeală de conținut repetată). Verificarea e în Task 2.

---

### Task 1: Tipul `modo-di-dire`: schema, regulile și eticheta

**Files:**
- Modify: `src/domain/content/schema.ts` (lângă `PACK_KINDS`, `PACK_ID_PREFIX`, `packSimple`, `packItemSchema`)
- Modify: `src/domain/feed/check.ts` (`packProblems`)
- Modify: `src/i18n/ro.ts`, `src/i18n/it.ts` (cheia `feed.kind.modo-di-dire`, altfel `t(\`feed.kind.${item.kind}\`)` din `PackCards.tsx` nu mai trece de typecheck)
- Test: `src/domain/feed/check.test.ts`, `src/domain/feed/pack.test.ts`

**Interfaces:**
- Produces:

```ts
// schema.ts
export const IDIOM_MATCH = ["same", "twist", "different"] as const;
export type IdiomMatch = (typeof IDIOM_MATCH)[number];
// PACK_KINDS += "modo-di-dire"; PACK_ID_PREFIX["modo-di-dire"] = "modo-"
// varianta din packItemSchema: câmpurile lui packSimple + { literal: text; roEquivalent?: text; match: IdiomMatch }
// PackSimpleItem / GeneratedPackItem o includ automat (uniune discriminată după `kind`)
```

- Mesajele noi din `packProblems` (Task 2 și 3 nu depind de text, dar testele da):
  - `${id}: nivel A1–B2 (nu ${level})`, la `modo-di-dire` cu C1/C2 (ceilalți itemi păstrează „nivel A1–B1”);
  - `${id}: un modo di dire are obligatoriu un test`;
  - `${id}: trebuie cel puțin un cuvânt în wordIds (intrarea din dicționar)`;
  - `${id}: la „same” și „twist” echivalentul românesc e obligatoriu`.

- [ ] **Step 1: Scrie testele din `check.test.ts`** cu un helper `modo(over)`: un item valid cu id `modo-essere-al-verde`, nivel `B1`, `wordIds: ["n-lupo"]`, `literal`, `match: "different"`, fără `roEquivalent`, cu `quiz`.
  - „un modo di dire valid, inclusiv B2 și fără echivalent la «different»”: `packProblems([modo(), modo({ id: "modo-x", level: "B2" })], levelOf)` e `[]`.
  - „modo di dire: C1 respins, B2 permis doar lui”: `modo({ level: "C1" })` conține „nivel A1–B2 (nu C1)”; `espr({ level: "B2" })` conține tot „nivel A1–B1”.
  - „modo di dire: test și cuvânt obligatorii”: `modo({ quiz: undefined })` conține „are obligatoriu un test”; `modo({ wordIds: [] })` conține „cel puțin un cuvânt în wordIds”.
  - „modo di dire: «same» și «twist» cer echivalentul”: `modo({ match: "same" })` și `modo({ match: "twist" })` conțin „echivalentul românesc e obligatoriu”; `modo({ match: "twist", roEquivalent: "a fi în al nouălea cer" })` nu mai are probleme.
  - „schema: «match» necunoscut e respins”: `packItemSchema.safeParse({ ...modo(), match: "similar" }).success === false`.

- [ ] **Step 2: Scrie testul din `pack.test.ts`:** „un idiom B2 nu apare la nivelul B1, apare la B2”. `eligiblePackItems([modoB2], {}, visit, "B1", now)` e gol, iar cu `"B2"` îl conține. Folosește forma de `visit` și `now` din testele existente.

- [ ] **Step 3: Rulează testele și verifică că pică**

Run: `npx vitest run src/domain/feed/check.test.ts src/domain/feed/pack.test.ts`
Expected: FAIL la testele noi.

- [ ] **Step 4: Implementează** schema, regulile și cheia `feed.kind.modo-di-dire`, cu textul „Expresie idiomatică” în `ro.ts` și „Modo di dire” în `it.ts`. Varianta nouă se construiește din forma lui `packSimple("modo-di-dire")` extinsă cu cele trei câmpuri și rămâne `.strict()`.

- [ ] **Step 5: Rulează testele și typecheck-ul**

Run: `npx vitest run && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain/content/schema.ts src/domain/feed src/i18n
git commit -m "feat(flux): tipul de item „modo di dire”, cu literal, echivalent românesc și categorie"
```

---

### Task 2: Conținutul: dicționar, niveluri, temă, Flux

**Files:**
- Create: `content/words/tranche-35.json` (60 de intrări), `content/topics/43-modi-di-dire.json`, `content/feed/modi-di-dire.json` (58 de itemi)
- Modify: `content/levels.json` (60 de chei noi în `overrides`, în ordinea alfabetică a fișierului), `content/feed/espressioni.json` (`wordIds` la `espr-in-bocca-al-lupo` și `espr-non-vedo-lora`)

**Interfaces:**
- Consumes: tipul `modo-di-dire` din Task 1.
- Produces: id-urile din dicționar `e-<it cu „_” în loc de spații>` (ex. `e-essere_al_verde`, `e-a_quattr'occhi`, `e-non_è_pane_per_i_miei_denti`) și id-urile din Flux `modo-<it fără diacritice, cu „-” în loc de spații și apostrof>` (ex. `modo-essere-al-settimo-cielo`, `modo-a-quattr-occhi`, `modo-non-e-pane-per-i-miei-denti`, `modo-in-gamba`). Task 3 folosește `modo-essere-al-settimo-cielo`, `modo-in-gamba`, `e-a_quattr'occhi` și `e-non_è_pane_per_i_miei_denti`.

Forma intrărilor:
- **Dicționar** (după modelul `e-mi_raccomando` din `content/words/tranche-14.json`):
  - `id`, `it` (coloana „it”, litere mici), `ro` (coloana „sens”), `tags: ["idiom"]`, `rank: 9999`, `pos: "expression"`;
  - `examples`: 2 propoziții naturale, cu verbul conjugat, fiecare cu traducere;
  - `note`: `Literal: «<literal>». În română: «<echivalent>».`, iar a doua propoziție lipsește când echivalentul e „—”.
- **Nivel:** coloana „nivel”, ca override `"<id>": "<nivel>"`.
- **Tema:**
  - id `modi-di-dire`, titlul `{ "it": "Modi di dire", "ro": "Expresii idiomatice" }`, `group: "conversatie"`, `level: "B2"` (nu B1: `loadTopics` respinge cuvinte cu nivel mai mare decât al temei), `first: false`, `exercises: ["match"]`;
  - șase subgrupuri în ordinea din spec (corpo, cibo, animali, soldi, tempo, stati), cu titlurile din spec și `wordIds` în ordinea din tabel;
  - `rules` și `contrast.ro`, exact:

```json
"rules": [
  { "it": "Un modo di dire ha un significato che non si ricava dalle singole parole: «essere al verde» vuol dire «non avere soldi».", "ro": "O expresie idiomatică are un sens care nu reiese din cuvinte: «essere al verde» înseamnă «a nu avea bani»." },
  { "it": "Il verbo si coniuga normalmente: «costa un occhio della testa», «sono al settimo cielo».", "ro": "Verbul se conjugă normal: «costa un occhio della testa», «sono al settimo cielo»." },
  { "it": "Molti modi di dire sono informali: si usano parlando, meno nello scritto formale.", "ro": "Multe expresii sunt informale: se folosesc în vorbire, mai puțin în scris formal." }
],
"contrast": { "ro": [
  "Multe sunt la fel ca în română: «rompere il ghiaccio» = a sparge gheața.",
  "Atenție la cele aproape la fel: «essere al settimo cielo» = a fi în al nouălea cer (7, nu 9); «avere la pelle d'oca» = pielea de găină (gâscă, nu găină).",
  "Altele folosesc altă imagine: «essere al verde» = a fi lefter; «toccare ferro» = a bate în lemn."
] }
```

- **Flux** (toate rândurile din tabel, mai puțin 23 și 49):
  - `kind: "modo-di-dire"`, `id`, `level` (coloana „nivel”), `wordIds: ["<id din dicționar>"]`;
  - `it`: forma din dicționar, cu majusculă la început;
  - `ro`: sensul; `literal`; `roEquivalent` (omis când e „—”); `match`;
  - `explain`: 1–2 propoziții, când se folosește și, dacă e cazul, de unde vine imaginea, în it și ro;
  - `example`: o replică naturală, cu traducere;
  - `quiz`:
    - `question: { "it": "«<it>» vuol dire…", "ro": "«<it>» înseamnă…" }`;
    - 3 variante în italiană (sensul corect și două plauzibile, dar greșite);
    - `answer` pe poziția 0, 1 sau 2, distribuită.

- [ ] **Step 1: Scrie cele cinci fișiere** după forma de mai sus.

- [ ] **Step 2: Validează**

Run: `npm run validate`
Expected: `Conținut valid: 3677 cuvinte.`, adică 3617 + 60. Orice eroare de propoziție (tokenizare) se rezolvă reformulând exemplul, nu schimbând codul.

- [ ] **Step 3: Verifică numărătorile și distribuția răspunsurilor**

Run: `npm run build:data` și un script scurt (`python3 -I` sau `node`) care citește `src/data/generated/feed.json`, `details.json` și `topics.json`.
Expected:
- 58 de itemi `modo-di-dire`, fiecare cu `wordIds[0]` care există în `details.json` cu eticheta `idiom`;
- 60 de intrări `idiom` cu nivelurile din tabel;
- tema `modi-di-dire` are 60 de cuvinte;
- niciun index de răspuns nu depășește jumătate din teste;
- `espr-in-bocca-al-lupo` și `espr-non-vedo-lora` încep cu `e-in_bocca_al_lupo`, respectiv `e-non_vedere_l'ora`.

- [ ] **Step 4: Rulează testele unitare** (testele de conținut, ex. cele ale temelor, citesc datele generate)

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add content
git commit -m "feat(continut): 60 de idiomuri italiene în dicționar, tema „Modi di dire” și 58 de carduri în Flux"
```

---

### Task 3: Cardul din Flux și testele E2E

**Files:**
- Modify: `src/features/feed/cards/PackCards.tsx` (`PackItemCard`)
- Modify: `src/i18n/ro.ts`, `src/i18n/it.ts`
- Test: `tests/e2e/feed.spec.ts`, `tests/e2e/topics.spec.ts`

**Interfaces:**
- Consumes: `IdiomMatch` și câmpurile `literal`, `roEquivalent`, `match` (Task 1), id-urile din Task 2.
- Produces: atributele `data-testid="idiom-literal"`, `data-testid="idiom-match"` (cu `data-match="<match>"`) și `data-testid="idiom-equivalent"`.

Textele, exact (`ro.ts` / `it.ts`):
- `feed.idiom.literal`: „Cuvânt cu cuvânt: «{text}»” / „Alla lettera: «{text}»”
- `feed.idiom.equivalent`: „În română: «{text}»” / „In rumeno: «{text}»”
- `feed.idiom.match.same`: „Ca în română” / „Come in rumeno”
- `feed.idiom.match.twist`: „Aproape ca în română: atenție la detaliu” / „Quasi come in rumeno: attenzione ai dettagli”
- `feed.idiom.match.different`: „În română se spune altfel” / „In rumeno si dice in un altro modo”

Rândurile noi stau, la itemii `modo-di-dire`, între traducere (`item.ro`) și explicație, cu `lang` setat la limba maternă. Apar indiferent de „Traducere în limba maternă”, pentru că sunt chiar conținutul cardului. Rândul echivalentului lipsește când nu există `roEquivalent`.

- [ ] **Step 1: Scrie testele E2E.** Nivelul se setează din Setări, cu `page.getByLabel("Nivelul curent").selectOption("B2")`, iar restul pachetului se marchează „văzut” cu `seedFeedSeen`, ca la testul micro-poveștii.
  - `feed.spec.ts`, „modo di dire: literal, insignă și echivalentul românesc”: singurul item eligibil e `modo-essere-al-settimo-cielo`; `scrollToType(page, "pack")`; cardul activ conține „Expresie idiomatică”; `idiom-literal` are textul „Cuvânt cu cuvânt: «a fi în al șaptelea cer»”; `idiom-match` are `data-match="twist"` și textul „Aproape ca în română: atenție la detaliu”; `idiom-equivalent` are textul „În română: «a fi în al nouălea cer»”.
  - `feed.spec.ts`, „modo di dire fără echivalent: fără rândul «În română»”: singurul item eligibil e `modo-in-gamba`; `idiom-match` are `data-match="different"`; `idiom-equivalent` are 0 elemente.
  - `topics.spec.ts`, „tema «Modi di dire»: potrivirea încape pe 360 px”: viewport 360×740, `/learn/topics/modi-di-dire/match`; după încărcare, `document.scrollingElement.scrollWidth <= 360`, iar variantele de potrivire sunt vizibile.
  - `topics.spec.ts`, „idiomurile cu apostrof și diacritice își deschid pagina”: `/browse/e-a_quattr'occhi` are titlul „a quattr'occhi” și textul „Literal: «la patru ochi»”; `/browse/e-non_è_pane_per_i_miei_denti` are titlul „non è pane per i miei denti”.

- [ ] **Step 2: Rulează testele și verifică că pică**

Run: `npm run test:e2e -- --trace off tests/e2e/feed.spec.ts tests/e2e/topics.spec.ts`
Expected: FAIL la testele de card (rândurile nu există încă). Testele de temă și de pagină pot trece deja: confirmă că trec.

- [ ] **Step 3: Implementează** rândurile și textele.

- [ ] **Step 4: Rulează testele și verifică că trec**

Run: `npm test && npm run test:e2e -- --trace off tests/e2e/feed.spec.ts tests/e2e/topics.spec.ts tests/e2e/a11y.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/feed src/i18n tests/e2e/feed.spec.ts tests/e2e/topics.spec.ts
git commit -m "feat(flux): cardul „modo di dire” arată traducerea literală, categoria și echivalentul românesc"
```

---

### Task 4: Audio pentru idiomuri

**Files:**
- Create: fișiere `.mp3` în `public/audio/words/` (intrările din dicționar) și `public/audio/feed/` (`it` și `example` din Flux)

**Interfaces:**
- Consumes: conținutul din Task 2. Nu se schimbă cod.

- [ ] **Step 1: Generează audio-ul cuvintelor**

Run: `npm run audio:words`
Expected: „60 de generat” sau un număr apropiat (textele care există deja se sar), apoi raportul cu clipurile de durată neobișnuită. Cere `~/qwen-tts/.venv`. Dacă lipsește, oprește-te și raportează Task 4 ca blocat.

- [ ] **Step 2: Generează audio-ul pachetului Fluxului**

Run: `npm run audio:dialogues`
Expected: generează doar clipurile lipsă din `public/audio/feed/` (116, adică `it` și `example` pentru 58 de itemi); dialogurile și poveștile au deja audio.

- [ ] **Step 3: Verifică acoperirea**

Run: `npm run build:data`
Expected: în rândul „Date generate”, „itemi în flux (audio: N/N texte)” cu cele două numere egale. Numărul „cuvinte cu audio” crește cu numărul de texte noi din dicționar.

- [ ] **Step 4: Commit** (listează în raport clipurile marcate ca suspecte, de ascultat)

```bash
git add public/audio
git commit -m "feat(audio): audio pentru idiomuri, în dicționar și în Flux"
```

---

### Task 5: Verificarea finală și PR-ul (subagent Haiku)

- [ ] **Step 1: Toată suita**

Run: `npm test && npm run typecheck && npm run validate && npm run test:e2e -- --trace off`
Expected: PASS. Un test E2E care pică și pe `main` se notează în PR, nu se repară aici.

- [ ] **Step 2: Push și PR** (deschis, **nu îmbinat**)

```bash
git push -u origin feat/modi-di-dire
gh pr create --base main --head feat/modi-di-dire --title "feat(continut): idiomuri italiene (modi di dire) în dicționar, temă și Flux" --body-file <descriere>
```

Descrierea, în română:
- ce aduce, adică cele trei locuri: dicționar, temă, Flux;
- tipul nou `modo-di-dire` și regulile lui;
- rezultatul verificării;
- clipurile audio suspecte, dacă există;
- o listă de bifat cu „Echivalentele românești și exemplele au fost citite de un vorbitor nativ”.

Fără nicio mențiune de AI/asistent și fără „Generated with”.
