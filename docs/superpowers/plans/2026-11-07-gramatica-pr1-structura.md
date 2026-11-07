# Gramatică, PR 1 (structura): plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „Jocuri” devine „Gramatică”: fiecare temă are o lecție (blocuri text / tabel / exemple / capcană), un buton
„Am citit” și cel mai bun scor la jocuri, cu progres salvat local, sincronizat în cont și inclus în backup. Cele 3 teme
existente primesc lecții.

**Architecture:** Conținutul rămâne în `content/grammar/*.json`, cu un câmp nou, `lesson`, validat cu zod la build.
Progresul stă într-un tabel Dexie nou (`grammarProgress`) și într-o colecție PocketBase nouă (`grammar_progress`). Se
combină cu o funcție pură (citit = cea mai mică dată, scor = maximul), deci nu există conflicte. Ecranele din
`src/features/games/` se mută în `src/features/grammar/`, pe rutele `/learn/grammar/...`; rutele vechi redirecționează.

**Tech Stack:** React 19, react-router 7, Dexie 4 + dexie-react-hooks, zod 4, PocketBase (migrații JS), vitest +
fake-indexeddb, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-07-gramatica-design.md` (§2, §3, §5 și cele 3 teme existente din §4;
linkurile din §6 vin în PR 3, celelalte lecții în PR 2). Butonul „Înapoi” din lecție duce aici mereu la
`/learn/grammar`. Întoarcerea la ecranul de unde ai venit (spec §2) se face în PR 3, odată cu linkurile care o fac
necesară.

## Global Constraints

- Branch: tot lucrul pe un branch `feat/…` pornit din `main`; fără push, PR sau merge fără acordul utilizatorului.
- Commit-uri fără nicio atribuire (fără `Co-Authored-By`, fără „Generated with…”).
- Mesajele de commit, comentariile din cod și textele de validare sunt în română, ca în restul proiectului.
- Fără dependențe noi (fără Markdown): marcajele permise în text sunt doar `[it]…[/it]` și `[b]…[/b]`.
- Orice text nou de interfață intră în `src/i18n/ro.ts` **și** `src/i18n/it.ts` (testul `noHardcodedText` refuză
  textul românesc scris direct în cod).
- Id-urile temelor existente (`articoli`, `essere`, `avere`) nu se schimbă.
- Procentele sunt numere întregi 0–100 (`Math.round`).
- Câmpul `dirty` este `1` sau lipsește (niciodată `true` / `false`), ca în `db.ts`.

## Review Focus

1. **Semne de carte vechi:** `/learn/games/articoli/type` trebuie să deschidă jocul Scriere la articole, nu o pagină
   goală (test în Task 6).
2. **Backup vechi, fără `grammarProgress`:** importul trebuie să meargă, cu progresul la gramatică gol (test în Task 5).
3. **„Încă o rundă” cu scor mai mic:** scorul bun salvat anterior nu scade (test în Task 3).
4. **Două telefoane offline:** unul marchează lecția citită, celălalt face 100% la Scriere. După sincronizare, ambele au
   și „citită”, și 100% (test în Task 4).
5. **Date stricate pe server** (de exemplu `best.type: 140` sau `data: "x"`): sunt numărate ca invalide, nu opresc
   sincronizarea și nu strică rândul local (test în Task 4).

---

### Task 1: Formatul lecției (marcaje + schemă + validare la build)

**Files:**
- Create: `src/domain/grammar/markup.ts`
- Create: `src/domain/grammar/lesson.test.ts`
- Modify: `src/domain/content/schema.ts` (lângă `grammarTopicSchema`, ~liniile 134–158)
- Modify: `scripts/content.ts` (`loadGrammar`, ~liniile 170–197)

**Interfaces:**
- Produces:
  - `type InlineSegment = { text: string; it?: true; bold?: true }`
  - `parseInline(s: string): InlineSegment[]`: împarte textul în segmente; fără marcaje, rezultatul este un singur segment.
  - `markupError(s: string): string | undefined`: mesaj de eroare dacă marcajele nu sunt închise corect, sunt
    imbricate sau necunoscute (orice `[x]` în afară de `[it]`, `[/it]`, `[b]`, `[/b]`).
  - `plainText(s: string): string`: textul fără marcaje (pentru voce).
  - `lessonBlockSchema` (uniune discriminată după `type`) și `type LessonBlock`:
    - `{ type: "text", ro }`
    - `{ type: "table", caption?, head: string[], rows: string[][], itColumns?: number[] }`
    - `{ type: "examples", items: { it, ro, note? }[] }` (minim 1 element)
    - `{ type: "trap", ro }`
  - `grammarTopicSchema` primește `lesson: z.array(lessonBlockSchema).min(3).max(20).optional()`. Devine obligatoriu
    în Task 8, după ce există conținutul.

- [ ] **Step 1: Scrie testele care pică**, în `src/domain/grammar/lesson.test.ts`:

```ts
test("parseInline: italiană, bold și text simplu", () => {
  expect(parseInline("Cartea = [it]il libro[/it].")).toEqual([
    { text: "Cartea = " }, { text: "il libro", it: true }, { text: "." },
  ]);
  expect(parseInline("[b]înaintea[/b]")).toEqual([{ text: "înaintea", bold: true }]);
  expect(parseInline("fără marcaje")).toEqual([{ text: "fără marcaje" }]);
});

test("markupError: neînchis, imbricat, necunoscut", () => {
  expect(markupError("[it]il libro")).toMatch(/neînchis/);
  expect(markupError("[it][b]x[/b][/it]")).toMatch(/imbricat/);
  expect(markupError("[i]x[/i]")).toMatch(/necunoscut/);
  expect(markupError("[it]a[/it] și [b]b[/b]")).toBeUndefined();
});

test("plainText scoate marcajele", () => {
  expect(plainText("[it]lo[/it] înaintea [b]s[/b]")).toBe("lo înaintea s");
});

test("lessonBlockSchema: tabel cu rânduri inegale și exemple goale sunt refuzate", () => {
  expect(lessonBlockSchema.safeParse({ type: "table", head: ["a", "b"], rows: [["1"]] }).success).toBe(false);
  expect(lessonBlockSchema.safeParse({ type: "examples", items: [] }).success).toBe(false);
  expect(lessonBlockSchema.safeParse({ type: "trap", ro: "x" }).success).toBe(true);
});

test("lesson: cel puțin un bloc examples", () => {
  const base = { id: "t", order: 9, title: "T", level: "A1", rules: ["r"], items: TEN_ITEMS };
  const noExamples = [{ type: "text", ro: "a" }, { type: "text", ro: "b" }, { type: "trap", ro: "c" }];
  expect(grammarTopicSchema.safeParse({ ...base, lesson: noExamples }).success).toBe(false);
});
```

(`TEN_ITEMS` = 10 elemente valide, construite ca `item()` din `grammar.test.ts`.)

- [ ] **Step 2: Rulează testele și verifică faptul că pică**

Run: `npx vitest run src/domain/grammar/lesson.test.ts`
Expected: FAIL (`parseInline` / `lessonBlockSchema` nu există)

- [ ] **Step 3: Implementează `markup.ts` și schema**

Parsare cu o expresie regulată pe `\[(\/?)(it|b)\]`, cu o stivă de adâncime maximă 1. Regula „rânduri egale” intră
ca `.refine` pe blocul `table`. Regula „cel puțin un `examples`” intră ca `.refine` pe `lesson`. Mesajele de eroare
sunt în română.

- [ ] **Step 4: Validare la build în `scripts/content.ts`**

În `loadGrammar`, pentru fiecare text dintr-o lecție (`text.ro`, `trap.ro`, `examples[].note`), apelează
`markupError`. La eroare adaugă `"${file}: lecția, blocul ${i + 1}: ${mesaj}"` în `errors`.

- [ ] **Step 5: Rulează testele și validarea**

Run: `npx vitest run src/domain/grammar && npm run validate`
Expected: PASS; `validate` trece (temele încă nu au `lesson`, câmpul e opțional)

- [ ] **Step 6: Commit** — `feat(grammar): formatul lecțiilor (blocuri și marcaje [it]/[b])`

---

### Task 2: Scoruri și combinarea progresului (funcții pure)

**Files:**
- Create: `src/domain/grammar/progress.ts`
- Modify: `src/domain/sync/merge.ts`
- Test: `src/domain/grammar/progress.test.ts`, `src/domain/sync/merge.test.ts`

**Interfaces:**
- Produces (în `progress.ts`):
  - `type GrammarGame = "match" | "type"`
  - `interface GrammarProgress { readAt?: number; best: Partial<Record<GrammarGame, number>> }`
  - `typeScore(correct: number, total: number): number`: `round(correct / total × 100)`; `total === 0` → 0.
  - `matchScore(pairs: number, mistakes: number): number`: `round(pairs / (pairs + mistakes) × 100)`; `pairs === 0` → 0.
  - `bestScore(p: GrammarProgress | undefined): number | undefined`: maximul dintre `best.match` și `best.type`.
  - `grammarProgressSchema` (zod): `readAt` număr opțional; `best.match` / `best.type` întregi 0–100, opționale.
- Produces (în `merge.ts`): `mergeGrammarProgress(a: GrammarProgress, b: GrammarProgress): GrammarProgress`.
  `readAt` = minimul valorilor definite; fiecare `best.*` = maximul valorilor definite; cheile nedefinite lipsesc din
  rezultat (nu apar ca `undefined`).

- [ ] **Step 1: Scrie testele care pică**

```ts
test("scoruri", () => {
  expect(typeScore(7, 10)).toBe(70);
  expect(typeScore(2, 3)).toBe(67);
  expect(typeScore(0, 0)).toBe(0);
  expect(matchScore(10, 0)).toBe(100);
  expect(matchScore(10, 5)).toBe(67);
  expect(bestScore({ best: { match: 80, type: 60 } })).toBe(80);
  expect(bestScore({ best: {} })).toBeUndefined();
});

test("mergeGrammarProgress: cel mai mic readAt, scorul maxim, comutativ", () => {
  const a = { readAt: 200, best: { type: 60 } };
  const b = { readAt: 100, best: { type: 90, match: 50 } };
  expect(mergeGrammarProgress(a, b)).toEqual({ readAt: 100, best: { type: 90, match: 50 } });
  expect(mergeGrammarProgress(b, a)).toEqual(mergeGrammarProgress(a, b));
  expect(mergeGrammarProgress({ best: {} }, { best: {} })).toEqual({ best: {} });
});
```

- [ ] **Step 2: Rulează și verifică faptul că pică** — `npx vitest run src/domain/grammar/progress.test.ts src/domain/sync/merge.test.ts` → FAIL

- [ ] **Step 3: Implementează** cele de mai sus.

- [ ] **Step 4: Rulează testele** → PASS

- [ ] **Step 5: Commit** — `feat(grammar): scorul jocurilor și combinarea progresului`

---

### Task 3: Progresul local (Dexie v3 + funcțiile de salvare)

**Files:**
- Modify: `src/data/db/db.ts` (tip nou + `version(3)`)
- Create: `src/data/db/grammarProgress.ts`
- Modify: `src/data/sync/pending.ts` (`pendingCount`)
- Test: `src/data/db/grammarProgress.test.ts`

**Interfaces:**
- Consumes: `GrammarProgress`, `GrammarGame`, `mergeGrammarProgress` (Task 2).
- Produces:
  - în `db.ts`: `type GrammarProgressRow = GrammarProgress & SyncFlags & { topicId: string; updatedAt: number }`
    și `grammarProgress: EntityTable<GrammarProgressRow, "topicId">` în `ImparaDb`; `version(3)` repetă toate tabelele
    din v2 și adaugă `grammarProgress: "topicId, dirty"` (fără `upgrade`).
  - în `grammarProgress.ts`:
    - `markLessonRead(db: ImparaDb, topicId: string, now: Date): Promise<void>`: setează `readAt` doar dacă lipsește.
    - `saveGameScore(db: ImparaDb, topicId: string, game: GrammarGame, percent: number, now: Date): Promise<void>`:
      scrie doar dacă `percent` depășește valoarea existentă.
    - Ambele: când scriu, pun `updatedAt = now.getTime()`, `dirty = 1` și apelează `notifyLocalChange()`. Când nu se
      schimbă nimic, nu scriu deloc.

- [ ] **Step 1: Scrie testele care pică**, cu `fake-indexeddb/auto` și `createDb("gp-" + Math.random())`, ca în
  `repositories.test.ts`:

```ts
test("markLessonRead păstrează prima dată", async () => {
  await markLessonRead(db, "articoli", at(0));
  await markLessonRead(db, "articoli", at(5));
  expect((await db.grammarProgress.get("articoli"))?.readAt).toBe(at(0).getTime());
});

test("saveGameScore păstrează doar maximul; un scor mai mic nu scrie nimic", async () => {
  await saveGameScore(db, "articoli", "type", 80, at(0));
  await db.grammarProgress.update("articoli", { dirty: undefined });
  await saveGameScore(db, "articoli", "type", 50, at(1));
  const row = await db.grammarProgress.get("articoli");
  expect(row?.best).toEqual({ type: 80 });
  expect(row?.dirty).toBeUndefined();
  expect(row?.updatedAt).toBe(at(0).getTime());
});

test("pendingCount numără progresul la gramatică netrimis", async () => {
  await saveGameScore(db, "avere", "match", 100, at(0));
  expect(await pendingCount(db)).toBe(1);
});
```

- [ ] **Step 2: Rulează și verifică faptul că pică** — `npx vitest run src/data/db/grammarProgress.test.ts` → FAIL

- [ ] **Step 3: Implementează** schema v3, cele două funcții și numărarea în `pendingCount`.

- [ ] **Step 4: Rulează testele** — `npx vitest run src/data` → PASS (inclusiv testele existente de migrare)

- [ ] **Step 5: Commit** — `feat(grammar): progresul lecțiilor salvat local`

---

### Task 4: Sincronizarea progresului (colecția `grammar_progress`)

**Files:**
- Create: `pocketbase/pb_migrations/1793000000_grammar_progress.js`
- Modify: `src/data/sync/types.ts`, `src/data/sync/fakeRemote.ts`, `src/data/sync/pocketbaseRemote.ts`,
  `src/data/sync/engine.ts`
- Test: `src/data/sync/engine.test.ts`

**Interfaces:**
- Consumes: `grammarProgressSchema`, `mergeGrammarProgress` (Task 2); `GrammarProgressRow`, `db.grammarProgress` (Task 3).
- Produces:
  - `Collection` include `"grammar_progress"`.
  - Înregistrarea pe server: `{ topicId, data: { readAt?, best }, updatedAt }`; în `SyncItem`, `key = topicId`.

Detalii fixate:
- **Migrația** creează colecția `grammar_progress` cu aceleași reguli „doar ale mele” (`listRule`, `viewRule`,
  `createRule`, `updateRule`, `deleteRule`), relația `user`, câmpurile `topicId` (text, obligatoriu, max 100), `data`
  (json), `updatedAt` (number, obligatoriu), câmpurile autodate `created` / `updated`, plus indecșii
  `UNIQUE (user, topicId)` și `(user, updated)`. Regulile se copiază din `1792540800_sync_collections.js`; funcția
  de revenire șterge colecția.
- **`pocketbaseRemote.ts`**: `toItem` / `toFields` primesc un caz `"grammar_progress"` (cheia este câmpul `topicId`).
- **`engine.ts`**:
  - `PULL_ORDER` se termină cu `"grammar_progress"`; tranzacția de descărcare include `db.grammarProgress`.
  - `applyGrammarProgress`: datele invalide → `invalid++`. Altfel `merged = mergeGrammarProgress(local, remote)`.
    Dacă `merged` diferă de rândul local, se scrie fără `dirty` și `changed++`. Dacă diferă de server, rândul se
    marchează `dirty: 1`, ca să fie retrimis.
  - `pushGrammarProgress`: trimite rândurile `dirty`, apoi șterge `dirty` doar dacă `updatedAt` nu s-a schimbat între
    timp (ca la `pushCards`).
  - La `syncReplace`, `deleteAll` include `"grammar_progress"`.

- [ ] **Step 1: Scrie testele care pică** în `engine.test.ts`, folosind `device()` și `remote` din fișier:

```ts
test("gramatică: citit pe un telefon + 100% pe altul → ambele au tot", async () => {
  const a = await device(); const b = await device();
  await markLessonRead(a, "articoli", at(0));
  await saveGameScore(b, "articoli", "type", 100, at(1));
  await runSync(a, remote); await runSync(b, remote); await runSync(a, remote);
  for (const db of [a, b]) {
    expect(await db.grammarProgress.get("articoli")).toMatchObject({ readAt: at(0).getTime(), best: { type: 100 } });
  }
  expect(await pendingCount(a)).toBe(0);
  expect(await pendingCount(b)).toBe(0);
});

test("gramatică: date invalide de pe server sunt numărate și ignorate", async () => {
  const a = await device();
  await saveGameScore(a, "essere", "match", 70, at(0));
  await remote.push("grammar_progress", [
    { key: "essere", updatedAt: 1, data: { best: { type: 140 } } },
    { key: "avere", updatedAt: 1, data: "x" },
  ]);
  const report = await runSync(a, remote);
  expect(report.invalid).toBe(2);
  expect((await a.grammarProgress.get("essere"))?.best).toEqual({ match: 70 });
});
```

(Testul pentru import cu cont este în Task 5, pentru că depinde de backup.)

- [ ] **Step 2: Rulează și verifică faptul că pică** — `npx vitest run src/data/sync/engine.test.ts` → FAIL

- [ ] **Step 3: Implementează** migrația, tipul, `FakeRemote.store.grammar_progress`, cazurile din
  `pocketbaseRemote.ts` și descărcarea / trimiterea din `engine.ts`.

- [ ] **Step 4: Rulează testele** — `npx vitest run src/data/sync` → PASS

- [ ] **Step 5: Verifică migrația pe PocketBase local**

Run: `npm run pocketbase`; în panoul de administrare (`http://127.0.0.1:8090/_/`) colecția `grammar_progress` apare
cu indecșii de mai sus. Oprește serverul după verificare.

- [ ] **Step 6: Commit** — `feat(sync): sincronizarea progresului la gramatică`

---

### Task 5: Backup, import și resetare

**Files:**
- Modify: `src/data/backup/backup.ts`
- Test: `src/data/backup/backup.test.ts`

**Interfaces:**
- Consumes: `grammarProgressSchema` (Task 2), `db.grammarProgress` (Task 3).
- Produces:
  - `Backup.grammarProgress: { topicId: string; readAt?: number; best: {...} }[]`, fără `updatedAt` / `dirty`.
  - În `backupSchema`: `grammarProgress: z.array(...).default([])`. `BACKUP_VERSION` rămâne 1, pentru că un câmp
    nou opțional nu strică backup-urile vechi.
  - `importBackup` golește tabelul și adaugă rândurile cu `updatedAt = now`, `dirty: 1`.
  - `resetProgress` golește și `grammarProgress`.

- [ ] **Step 1: Scrie testele care pică**

```ts
test("backup: progresul la gramatică dus-întors", async () => {
  await saveGameScore(db, "articoli", "type", 90, NOW);
  await markLessonRead(db, "articoli", NOW);
  const json = backupToJson(await exportBackup(db, "v1", NOW));
  await resetProgress(db);
  expect(await db.grammarProgress.count()).toBe(0);
  await importBackup(db, parseBackup(json), NOW);
  expect(await db.grammarProgress.get("articoli")).toMatchObject({ readAt: NOW.getTime(), best: { type: 90 }, dirty: 1 });
});

test("backup vechi, fără grammarProgress, se importă", async () => {
  const old = JSON.parse(backupToJson(await exportBackup(db, "v1", NOW)));
  delete old.grammarProgress;
  expect(parseBackup(JSON.stringify(old)).grammarProgress).toEqual([]);
});
```

și în `src/data/sync/engine.test.ts`:

```ts
test("gramatică: importul cu cont înlocuiește progresul din cont", async () => {
  const a = await device();
  await saveGameScore(a, "avere", "type", 40, at(0));
  await runSync(a, remote);
  const backup = await exportBackup(a, "v1", at(1));
  await saveGameScore(a, "essere", "type", 90, at(2));
  await runSync(a, remote);
  await importBackup(a, backup, at(3));
  await runSync(a, remote);
  expect([...remote.store.grammar_progress.keys()]).toEqual(["avere"]);
});
```

- [ ] **Step 2: Rulează și verifică faptul că pică** — `npx vitest run src/data/backup src/data/sync` → FAIL
- [ ] **Step 3: Implementează** în `backup.ts` (exportul scoate `updatedAt` / `dirty`, ca la celelalte tabele).
- [ ] **Step 4: Rulează testele** — `npx vitest run src/data` → PASS
- [ ] **Step 5: Commit** — `feat(backup): progresul la gramatică în backup`

---

### Task 6: Secțiunea „Gramatică”: rute, redirecționări, texte

**Files:**
- Move: `src/features/games/*` → `src/features/grammar/` (`git mv`). Se redenumesc
  `GamesPage.tsx` → `GrammarListPage.tsx` și `GameMenuPage.tsx` → `GrammarTopicPage.tsx`; restul fișierelor își
  păstrează numele.
- Create: `src/features/grammar/LegacyGamesRedirect.tsx`
- Modify: `src/app/App.tsx` (importuri lazy, rute, `isStudyRoute`), `src/features/learn/LearnPage.tsx`,
  `src/i18n/ro.ts`, `src/i18n/it.ts`, toate `"/learn/games"` din jocuri → `"/learn/grammar"`
- Modify: `tests/e2e/games.spec.ts` → `git mv` în `tests/e2e/grammar.spec.ts`

**Interfaces:**
- Produces:
  - Rute: `learn/grammar` (`GrammarListPage`), `learn/grammar/:id` (`GrammarTopicPage`),
    `learn/grammar/:id/cards|match|type`.
  - `learn/games` și `learn/games/*` → `LegacyGamesRedirect`, care face
    `<Navigate replace to={pathname.replace(/^\/learn\/games/, "/learn/grammar")} />`.
  - `isStudyRoute`: regexul devine `/^\/learn\/(topics|grammar)\/[^/]+\/[a-z]+$/`.
- Texte i18n (ro / it):
  - `learn.games` / `learn.gamesHint` se înlocuiesc cu `learn.grammar` („Gramatică” / „Grammatica”) și
    `learn.grammarHint` („Lecții scurte și exerciții: articole, essere, avere” / „Lezioni brevi ed esercizi:
    articoli, essere, avere”).
  - `games.intro` devine „Lecții scurte de gramatică, în ordinea în care e bine să le înveți. Citește lecția, apoi
    exersează.” / „Brevi lezioni di grammatica, nell'ordine in cui conviene impararle. Leggi la lezione, poi
    esercitati.”
  - `games.backToList` devine „Înapoi la gramatică” / „Torna alla grammatica”.
- Plăcuța din `LearnPage`: `to="/learn/grammar"`, emoji `📘`, titlu `t("learn.grammar")`.

- [ ] **Step 1: Actualizează testul E2E să ceară noul comportament** în `tests/e2e/grammar.spec.ts`:
  - primul test: link `/Gramatică/`, heading `"Gramatică"`, pagina temei pe `/learn/grammar/articoli`;
  - toate `page.goto("/learn/games/...")` devin `/learn/grammar/...`;
  - test nou:

```ts
test("rutele vechi /learn/games duc la /learn/grammar", async ({ page }) => {
  await page.goto("/learn/games/articoli/type");
  await expect(page).toHaveURL(/\/learn\/grammar\/articoli\/type$/);
  await expect(page.getByRole("textbox")).toBeVisible();
  await page.goto("/learn/games");
  await expect(page).toHaveURL(/\/learn\/grammar$/);
});
```

- [ ] **Step 2: Rulează și verifică faptul că pică** — `npx playwright test tests/e2e/grammar.spec.ts` → FAIL
- [ ] **Step 3: Implementează** mutarea, rutele, redirecționarea, plăcuța și textele.
- [ ] **Step 4: Rulează verificările**

Run: `npm run typecheck && npx vitest run && npx playwright test tests/e2e/grammar.spec.ts`
Expected: PASS (inclusiv `i18n.test.ts`, care cere aceleași chei în ro și it)

- [ ] **Step 5: Commit** — `feat(grammar): secțiunea Gramatică înlocuiește Jocuri (rute și redirecționări)`

---

### Task 7: Pagina lecției, „Am citit” și scorurile

**Files:**
- Create: `src/features/grammar/Lesson.tsx`, `src/features/grammar/InlineText.tsx`
- Modify: `src/features/grammar/GrammarTopicPage.tsx`, `src/features/grammar/GrammarListPage.tsx`,
  `src/features/grammar/TypeGame.tsx`, `src/features/grammar/MatchGame.tsx`, `src/ui/RulesBox.tsx`,
  `src/i18n/noHardcodedText.test.ts` (excepția „Capcană pentru români”), `src/i18n/ro.ts`, `src/i18n/it.ts`
- Test: `tests/e2e/grammar.spec.ts`

**Interfaces:**
- Consumes: `LessonBlock`, `parseInline`, `plainText` (Task 1); `bestScore`, `typeScore`, `matchScore` (Task 2);
  `markLessonRead`, `saveGameScore`, `db.grammarProgress` (Task 3).
- Produces:
  - `<InlineText text={string} />`: segmentele `it` devin `<span lang="it" className="italic">`, iar cele `bold`
    devin `<strong>`.
  - `<Lesson blocks={LessonBlock[]} />`, cu redare pe tip de bloc:
    - `text` → `<p>`;
    - `table` → `<table>` cu `<caption>`; celulele din `itColumns` (implicit toate, mai puțin prima) au `lang="it"`
      și conțin un buton care rostește `plainText(celulă)`;
    - `examples` → listă: italiană (cu `lang="it"`) + `AudioButton text={it}`, română, `note` cu `InlineText`;
    - `trap` → `<aside>` cu titlul „Capcană pentru români”. Titlul e scris direct în componentă, ca „De reținut”
      din `RulesBox`: lecțiile sunt mereu în română, deci se adaugă excepție în `noHardcodedText.test.ts`.
  - `RulesBox` primește `defaultOpen?: boolean` (implicit `false`).
- Pagina temei (`GrammarTopicPage`), în ordine:
  1. titlu + badge de nivel;
  2. `<Lesson>`, doar dacă `topic.lesson` există;
  3. `<RulesBox defaultOpen>`;
  4. butonul `grammar.markRead` („Am citit” / „L'ho letto”), care după apăsare devine `grammar.read`
     („✓ Citită” / „✓ Letta”), cu `aria-pressed`;
  5. jocurile; la Potrivire și Scriere apare `grammar.best` („Cel mai bun: {n}%” / „Migliore: {n}%”) când există scor.
- Lista (`GrammarListPage`): lângă badge, `✓` (cu `aria-label` = `grammar.read`) dacă `readAt` există și
  `bestScore` ca „{n}%”. Rândurile de progres pentru teme care nu mai există se ignoră.
- Jocurile: Scriere salvează `typeScore(score, session.length)` o singură dată, când sesiunea se termină. Potrivire
  salvează `matchScore(totalPairs, mistakes)` când se termină ultima rundă. Pentru „o singură dată” pe încercare se
  folosește un `useRef` resetat la „Încă o rundă”.

- [ ] **Step 1: Scrie testele E2E care pică** în `tests/e2e/grammar.spec.ts`:

```ts
test("lecție: Am citit + scor la Scriere apar în listă", async ({ page }) => {
  await page.goto("/learn/grammar/articoli");
  await expect(page.getByRole("table").first()).toBeVisible();
  await expect(page.getByText("Capcană pentru români")).toBeVisible();
  await page.getByRole("button", { name: "Am citit" }).click();
  await expect(page.getByRole("button", { name: /Citită/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: /Introducere text/ }).click();
  const prompt = page.getByTestId("grammar-prompt");
  const input = page.getByRole("textbox", { name: "Cuvântul care lipsește" });
  for (let step = 0; step < 10; step++) {
    const ro = (await prompt.locator("xpath=following-sibling::p").textContent())!;
    await input.fill(articoli.items.find((i) => i.ro === ro)!.gap);
    await page.getByRole("button", { name: "Verifică" }).click();
    await page.getByRole("button", { name: /Continuă|Vezi rezultatul/ }).click();
  }
  await page.goto("/learn/grammar");
  const row = page.getByRole("list", { name: "Temele de gramatică" }).getByRole("link", { name: /Articolul/ });
  await expect(row.getByLabel("Citită")).toBeVisible();
  await expect(row).toContainText("100%");
});
```

Testul existent despre „De reținut” se schimbă: pe pagina temei caseta este acum deschisă implicit
(`aria-expanded="true"`).

- [ ] **Step 2: Rulează și verifică faptul că pică** — `npx playwright test tests/e2e/grammar.spec.ts` → FAIL
  (temele nu au încă lecții: testul de lecție rămâne roșu până la Task 8; restul trebuie să treacă după Step 3)
- [ ] **Step 3: Implementează** componentele, pagina, lista și salvarea scorurilor.
- [ ] **Step 4: Rulează verificările** — `npm run typecheck && npx vitest run` → PASS
- [ ] **Step 5: Commit** — `feat(grammar): pagina lecției, „Am citit” și cel mai bun scor`

---

### Task 8: Lecțiile pentru articole, essere, avere

**Files:**
- Modify: `content/grammar/01-articoli.json`, `content/grammar/02-essere.json`, `content/grammar/03-avere.json`
- Modify: `src/domain/content/schema.ts` (`lesson` devine obligatoriu)
- Modify: `tests/e2e/grammar.spec.ts` (titlurile din primul test), `tests/e2e/a11y.spec.ts`

Conținut fixat (spec §4):
- **Ordinea:** `articoli` rămâne 1, `essere` primește `order: 4`, `avere` primește `order: 5`. Locurile 2–3 sunt pentru
  PR 2. Numele fișierelor rămân aceleași (ordinea vine din `order`).
- **Titlul pentru `essere`** devine „Pronumele subiect și verbul „a fi””. Lecția lui acoperă și pronumele subiect
  (*io, tu, lui/lei, noi, voi, loro*) și faptul că pronumele de obicei lipsește, ca în română.
- **Fiecare lecție are 5–10 blocuri:** cel puțin un `table`, un `examples` cu 4–6 propoziții și un `trap`. Capcane
  propuse:
  - articole: articolul stă înainte, nu lipit la final; *lo/gli*;
  - *essere*: *sono stanco*, nu „ho stanco”; *c'è* abia în PR 2;
  - *avere*: *ho 20 anni*, *ho fame / sete / freddo*, unde româna folosește „mi-e”.
- **Verificare umană:** textele italiene se arată utilizatorului înainte de commit.

- [ ] **Step 1: Scrie testul care pică** în `tests/e2e/a11y.spec.ts`: adaugă `/learn/grammar/articoli` la paginile
  verificate cu axe (după modelul celor existente).
- [ ] **Step 2: Fă `lesson` obligatoriu** în `grammarTopicSchema` și rulează `npm run validate` → FAIL, cu
  „lesson: Required” pentru cele 3 fișiere.
- [ ] **Step 3: Scrie cele 3 lecții** și actualizează `order` / titlul pentru `essere`.
- [ ] **Step 4: Arată utilizatorului lecțiile** (text, tabele, exemple, capcane) și aplică corecturile. Fără commit
  înainte de acordul lui.
- [ ] **Step 5: Rulează verificarea completă**

Run: `npm run validate && npm run typecheck && npx vitest run && npm run test:e2e`
Expected: totul PASS, inclusiv testul de lecție din Task 7 și axe pe pagina lecției.

- [ ] **Step 6: Commit** — `feat(grammar): lecții pentru articole, essere și avere`
