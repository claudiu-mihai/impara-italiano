# Dialoguri (Faza 6) — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dialoguri scurte pe teme, ascultate replică cu replică și jucate cu voce tare, care revin la repetare (FSRS) și bifează reperele „pot să…”.

**Architecture:** conținut în `content/dialogues/*.json`, validat în `scripts/content.ts` și scris în `src/data/generated/dialogues.json` (încărcat la cerere). Fiecare dialog are un card `skill` (`skill:dialogue:<id>`), după modelul `src/domain/grammar/{due,review}.ts`. O pagină `DialoguePage` cu două moduri (Ascultă, Joc de rol); secțiuni noi pe Acasă și o listă în Învață.

**Tech Stack:** React + TS, Dexie, ts-fsrs, zod (doar la build), Web Speech API, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-dialoguri-design.md`

## Global Constraints

- Textele interfeței doar în `src/i18n/ro.ts` și `it.ts`, cu aceleași chei (testul `noHardcodedText`); plurale cu `_one`/`_other` și `tp()`.
- Acasă nu importă valori din `ts-fsrs` și nu încarcă `dialogues.json` dacă nu există niciun card `skill:dialogue:*`.
- Card: `cardId` `skill:dialogue:<id>`, `wordId` `dialogue:<id>`, `kind: "skill"`, `variant: "auto"`; repetiția salvată cu `source: "skill"`; `reviewStoredCard(..., shortTerm = false)`.
- Notare: doar Din nou / Greu / Bine; doar primul joc de rol terminat pe un dialog fără card sau scadent; altfel exersare liberă.
- Învățat = `stability >= TENSE_UNLOCK_STABILITY_DAYS` (7).
- Conținut: 4–8 replici, exact 2 personaje, fiecare cu ≥ 2 replici, `you` unul dintre ele, `canDo` unic, `topicId` existent, id = numele fișierului, format `^[a-z0-9-]+-\d{2}$`; nivelul = nivelul temei.
- Fără voce italiană: textul se vede direct, butoanele audio inactive (ca restul aplicației).
- Commit-uri fără nicio atribuire (regula utilizatorului); un singur PR la final, doar cu acordul utilizatorului.

## Review Focus

- Un dialog programat pentru mai târziu, deschis din listă: jocul de rol nu trebuie să schimbe programul (exersare liberă) — test E2E în Task 7.
- Al doilea joc de rol în aceeași vizită (după „Încă o dată”) nu se mai notează — test unitar pe `dialogueCountsForSrs` + logica `attempt === 0` în Task 5 (E2E: după „Încă o dată”, butoanele de notare lipsesc).
- O singură voce italiană: al doilea personaj tot se aude (aceeași voce, altă înălțime), nu tace — test unitar în Task 4.
- Dialog deschis cu id inexistent (link vechi) sau temă fără dialoguri: mesaj „dialog negăsit” cu întoarcere la temă, nu ecran gol — E2E în Task 7.
- Ieșirea din dialog în timpul redării: vocea se oprește (`stopSpeaking` la demontare) — verificat în E2E-ul de ascultare (Task 7) prin `mockSpeech`, fără erori în consolă.

---

### Task 1: Formatul dialogurilor, validarea și încărcarea

**Files:**
- Modify: `src/domain/content/schema.ts` (schema `dialogueSchema`, tipul `Dialogue`)
- Create: `src/domain/dialogue/check.ts`, `src/domain/dialogue/check.test.ts`
- Modify: `scripts/content.ts` (`loadDialogues`, `LoadedContent.dialogues`), `scripts/build-data.ts` (scrie `dialogues.json`, intră în `dataVersion`)
- Modify: `src/data/content/contentStore.ts` (`loadDialogues()`), Create: `src/app/dialogues.ts` (`useDialogues(enabled = true)`)
- Create: `content/dialogues/la-bar-01.json` (primul dialog, ca exemplu pentru test)

**Interfaces:**
- Produces: `type Dialogue = { id; topicId; title: Localized; canDo: Localized; speakers: [{ id; name: Localized }, { id; name: Localized }]; you: string; lines: { speaker: string; it: string; ro: string }[] }`; în datele generate fiecare dialog primește și `level: Level` (al temei).
- Produces: `dialogueProblems(d: Dialogue, topicIds: ReadonlySet<string>): string[]` (fără zod, pur).
- Produces: `loadDialogues(): Promise<GeneratedDialogue[]>` unde `GeneratedDialogue = Dialogue & { level: Level }`; `useDialogues(enabled?: boolean): GeneratedDialogue[] | undefined` (ca `useGrammar`).

- [ ] **Step 1: Teste pentru `dialogueProblems`**: un dialog valid → `[]`; mesaje pentru: temă inexistentă, 3 replici, 9 replici, `you` necunoscut, personaje cu același id, un personaj cu o singură replică, replică cu `speaker` necunoscut.
- [ ] **Step 2:** `npx vitest run src/domain/dialogue` → FAIL (modul lipsă).
- [ ] **Step 3:** schema zod (strict) + `dialogueProblems`; în `scripts/content.ts`, `loadDialogues(topics, errors)` citește `content/dialogues/*.json`, verifică id = nume fișier, id unic, `canDo.ro` unic, adaugă `level` din temă, sortează după grupul temei apoi id. `build-data.ts` scrie un dialog pe linie.
- [ ] **Step 4:** `npx vitest run src/domain/dialogue && npm run build:data && npm run validate` → PASS.
- [ ] **Step 5:** commit `feat(dialoguri): formatul dialogurilor și validarea la build`.

### Task 2: Cele 10 dialoguri

**Files:**
- Create: `content/dialogues/{saluturi-si-politete-01,mesele-zilei-01,piata-si-supermarket-01,directii-01,ora-01,familia-01,la-hotel-01,gara-si-aeroport-01,la-medic-si-farmacie-01}.json` (plus `la-bar-01` din Task 1)
- Create: `scripts/dialogues.test.ts`

Reperele (`canDo.ro`) exact ca în tabelul din spec („Pot să mă prezint și să salut”, „Pot să comand la bar”, …). Replicile folosesc cuvintele temei; registrul politicos (*Lei*) cu personalul, *tu* în familie.

- [ ] **Step 1: Test** `scripts/dialogues.test.ts`: `errors` fără mesaje despre dialoguri; exact 10 dialoguri; un dialog pe fiecare din cele 10 teme; 7 A1 și 3 A2; fiecare are 4–8 replici.
- [ ] **Step 2:** rulează → FAIL (1 dialog).
- [ ] **Step 3:** scrie cele 9 fișiere.
- [ ] **Step 4:** `npx vitest run scripts/dialogues.test.ts && npm run validate` → PASS.
- [ ] **Step 5:** commit `feat(dialoguri): 10 dialoguri A1–A2`.

### Task 3: Repetarea dialogurilor (FSRS)

**Files:**
- Create: `src/domain/dialogue/due.ts`, `src/domain/dialogue/review.ts`, `src/domain/dialogue/review.test.ts`

**Interfaces:**
- Produces (`due.ts`, fără `ts-fsrs`): `dialogueSkillId(id) => "dialogue:<id>"`, `dialogueCardId(id) => "skill:dialogue:<id>"`, `dialogueCountsForSrs(card: StoredCard | undefined, now: Date): boolean`, `dueDialogueIds(cards, now): string[]`, `dueDialogues<T extends {id}>(list, cards, now): T[]`, `isDialogueLearned(card: StoredCard | undefined): boolean`, `hasDialogueCards(cards): boolean`.
- Produces (`review.ts`): `newDialogueCard(id, now): StoredCard`, `reviewDialogueCard(card | undefined, id, grade: Grade, now, retention)` (shortTerm false).

- [ ] **Step 1: Teste**: id-urile; fără card → se notează; card scadent → se notează; programat peste 3 zile → nu; `dueDialogueIds` ignoră cardurile de gramatică și numere; `isDialogueLearned` la stabilitate 6.9 → false, 7 → true; după `Rating.Good` pe un card nou, `due` e la cel puțin o zi (fără pași scurți).
- [ ] **Step 2:** rulează → FAIL.
- [ ] **Step 3:** implementare după `domain/grammar/due.ts` și `review.ts`.
- [ ] **Step 4:** `npx vitest run src/domain/dialogue` → PASS.
- [ ] **Step 5:** commit `feat(dialoguri): dialogul ca abilitate FSRS`.

### Task 4: Vocea celui de-al doilea personaj

**Files:**
- Modify: `src/services/voices.ts` (`pickVoices`), `src/services/tts.ts` (`speak(text, rate, options?)`)
- Test: `src/services/voices.test.ts` (extins)

**Interfaces:**
- Produces: `pickVoices<T extends VoiceInfo>(voices, opts: PickVoiceOptions): [T | undefined, T | undefined]` — prima = `pickVoice(voices, opts)`, a doua = cea mai bună voce utilizabilă diferită de prima (aceleași reguli: italiană, locală când e offline), `undefined` dacă nu există.
- Produces: `speak(text: string, rate = 0.9, options?: { speaker?: 0 | 1 }): void` — `speaker: 1` folosește a doua voce; dacă lipsește, prima voce cu `pitch = SECOND_SPEAKER_PITCH` (0.85); `speaker: 0` cu `pitch = FIRST_SPEAKER_PITCH` (1.1) doar când se folosește o singură voce pentru ambii; fără `options`, comportament neschimbat.

- [ ] **Step 1: Teste** `pickVoices`: două voci italiene locale → două diferite; una singură → `[v, undefined]`; offline cu o voce de rețea → a doua `undefined`; vocea preferată din Setări rămâne prima.
- [ ] **Step 2:** rulează → FAIL.
- [ ] **Step 3:** implementare; `utteranceFor` primește `speaker` și setează `voice`/`pitch`.
- [ ] **Step 4:** `npx vitest run src/services` → PASS; `npx tsc --noEmit`.
- [ ] **Step 5:** commit `feat(tts): o voce sau o înălțime diferită pentru al doilea personaj`.

### Task 5: Pagina dialogului (Ascultă, Joc de rol, notare)

**Files:**
- Create: `src/features/dialogue/DialoguePage.tsx` (antet, alegerea modului), `src/features/dialogue/ListenMode.tsx`, `src/features/dialogue/RolePlayMode.tsx`, `src/features/dialogue/Bubble.tsx` (balonul unei replici)
- Modify: `src/app/App.tsx` (ruta `learn/topics/:id/dialogue/:dialogueId`, lazy), `src/features/topics/TopicPage.tsx` (butoanele „💬 Dialog: <titlu>” din `useDialogues()` filtrate după `topicId`), `src/features/grammar/ReviewStatus.tsx` (props opționale `start?: string`, `testId?: string`, implicit comportamentul actual)
- Modify: `src/i18n/ro.ts`, `src/i18n/it.ts`

**Interfaces:**
- Consumes: `useDialogues`, `dialogueCardId`, `dialogueCountsForSrs`, `reviewDialogueCard`, `speak(..., { speaker })`, `stopSpeaking`, `useListening(settings.listenFirst)`, `saveReview`.
- Produces: rute `/learn/topics/:id/dialogue/:dialogueId` și `?mode=roleplay` (deschide direct jocul de rol; folosit de Acasă). Test id-uri: `dialogue-line` (fiecare balon), `canDo`, `dialogue-review` (ReviewStatus), `say-line` (balonul cu traducerea la replica ta).
- Indexul vorbitorului: `speaker` 0 = primul personaj din `speakers`, 1 = al doilea.

Comportament (din spec): Ascultă — o replică nouă la „Următoarea replică”, redată singură; cu ascultare activă textul italian ascuns până la „Arată textul”; traducerea sub text; la final „Treci la jocul de rol”. Joc de rol — replicile celuilalt redate și vizibile; la replica ta balonul „Spune în italiană: <ro>” + „Arată replica” (dezvăluie și redă), apoi „Continuă”; la final 3 butoane (Din nou/Greu/Bine) dacă `countsForSrs && attempt === 0`, altfel textul de exersare liberă; „Încă o dată” (attempt + 1) și „Înapoi la temă”. `stopSpeaking()` la demontare. Replicile noi într-o regiune `aria-live="polite"`.

- [ ] **Step 1:** componentele și ruta; texte noi în i18n (chei `dialogue.*`).
- [ ] **Step 2:** `npx tsc --noEmit && npx vitest run` → PASS (inclusiv `noHardcodedText`).
- [ ] **Step 3:** verificare vizuală cu o captură Playwright (ascultă, joc de rol, final).
- [ ] **Step 4:** commit `feat(dialoguri): pagina dialogului cu ascultare și joc de rol`.

### Task 6: Acasă și Învață

**Files:**
- Modify: `src/features/home/HomePage.tsx` (secțiunile „Dialoguri de repetat” și „Pot să…”), `src/features/learn/LearnPage.tsx` (rândul „💬 Dialoguri”)
- Create: `src/features/dialogue/DialogueListPage.tsx`, ruta `learn/dialogues` în `App.tsx`
- Create: `src/domain/dialogue/canDo.ts` + test (`canDoList(dialogues, cards, level): { dialogue; learned: boolean }[]` — dialogurile cu `isUpTo(level, current)`, în ordinea din date)
- Modify: i18n

**Interfaces:**
- Consumes: `hasDialogueCards`, `dueDialogues`, `isDialogueLearned`, `useDialogues(enabled)`, `isUpTo`.
- Acasă: `useDialogues(hasDialogueCards(cards))`; „Dialoguri de repetat” leagă la `/learn/topics/<topicId>/dialogue/<id>?mode=roleplay`; „Pot să…” are titlul cu `tp("home.canDoCount", learned)` „3 din 7” și elementele cu ✓ / ○ (`data-testid="can-do"`, `data-learned`).
- Lista: grupată pe nivel; fiecare rând: titlul, tema, `ReviewStatus compact`.

- [ ] **Step 1: Teste** `canDoList`: la A1 doar dialogurile A1; la A2 toate; `learned` după stabilitate.
- [ ] **Step 2:** rulează → FAIL; **Step 3:** implementare; **Step 4:** `npx tsc --noEmit && npx vitest run` → PASS.
- [ ] **Step 5:** commit `feat(dialoguri): Acasă (de repetat, pot să…) și lista din Învață`.

### Task 7: E2E și documentație

**Files:**
- Create: `tests/e2e/dialogues.spec.ts`; Modify: `tests/e2e/helpers.ts` (`seedSkillCard(page, cardId, wordId, { dueInDays, stability })`), `tests/e2e/a11y.spec.ts` (pagina dialogului și lista)
- Modify: `app-plan.md`, `docs/superpowers/plans/2026-11-10-pedagogie-plan-general.md` (secțiunea Faza 6)

- [ ] **Step 1: Teste E2E:**
  - ascultare cu „Ascultă întâi” (text ascuns, „Arată textul”, `spoken` conține replica) și fără (text vizibil);
  - joc de rol până la notare „Bine” → pe pagina dialogului „Următoarea repetiție”; după „Încă o dată” nu mai apar butoanele de notare;
  - dialog scadent (card cu `dueInDays: -1`) apare pe Acasă la „Dialoguri de repetat” și se deschide în jocul de rol;
  - reper bifat pentru un card cu stabilitate 10, nebifat pentru 3; „1 din 7” la A1;
  - dialog programat peste 5 zile → la final „Exersare liberă”, fără butoane de notare;
  - id inexistent → mesajul de dialog negăsit și link înapoi;
  - pagina temei „La bar” arată „💬 Dialog: Un caffè, per favore”.
- [ ] **Step 2:** `npx playwright test` (toată suita) → PASS.
- [ ] **Step 3:** documentație: `app-plan.md` (FR nou pentru dialoguri, faza în „Stare”), planul general (Faza 6).
- [ ] **Step 4:** commit `test(dialoguri): E2E` și `docs(dialoguri): …`.
