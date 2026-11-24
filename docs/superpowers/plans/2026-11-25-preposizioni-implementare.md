# Prepozițiile: plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corecturile din lecția 10 și opt lecții noi de gramatică despre prepoziții (19–26), cu exemple pentru jocuri și audio.

**Architecture:** Doar conținut. Fiecare lecție e un fișier în `content/grammar/` validat de `grammarTopicSchema` și de `loadGrammar` (`scripts/content.ts`). Lecțiile primesc automat listare, jocuri (cartonașe, potrivire, scriere), repetiție și audio prin generatorul `audio:grammar`.

**Tech Stack:** JSON, Zod 4 (validare la build), Vitest, Playwright, Qwen3-TTS local (`~/qwen-tts`).

**Spec:** `docs/superpowers/plans/2026-11-24-preposizioni-articolate.md` (planul de conținut, aprobat de utilizator). Secțiunea 6 dă id-urile, ordinea, titlurile și nivelurile. Secțiunea 7 dă, pentru fiecare lecție, fișierul, blocurile, regulile și eșantionul de exemple. Secțiunea 9 dă punctele nesigure.

**Execuție (cerută de utilizator):** implementarea și reviziile cu subagenți **Sonnet**, PR-ul (Task 6) cu un subagent **Haiku**.

## Global Constraints

- Branch `feat/preposizioni`, un singur PR la final. Commit-urile în română (`feat(gramatica): …`), **fără nicio mențiune de AI/asistent, fără trailere `Co-Authored-By` și fără „Generated with”**.
- Nu se face push, PR sau merge, cu excepția Task 6 (PR deschis, nu îmbinat).
- Fiecare lecție nouă are:
  - id-ul, `order`, titlul (`it` / `ro`) și `level` din tabelul din secțiunea 6 a spec-ului;
  - fișierul cu numele din secțiunea 7 (ex. `content/grammar/19-preposizioni-luogo.json`).
- **Blocuri:** cele din secțiunea 7, în ordinea dată, între 3 și 20 de blocuri, cel puțin unul `examples`.
  - Blocurile `text` și `trap` au ambele limbi (`ro`, `it`), cu marcajele `[it]…[/it]` și `[b]…[/b]`, ca în lecțiile existente.
  - Tabelele cu celule descriptive au `captionIt` / `headIt` / `rowsIt`.
- **Reguli:** cele 1–4 reguli („De reținut”) din secțiunea 7, cu `it` și `ro`.
- **Exemple:** 18–25 pe lecție (`items`). Eșantionul din secțiunea 7 se păstrează și se completează.
  - Fiecare exemplu are `id` cu prefixul lecției (ex. `plu-01`), `it`, `gap`, `ro`, `note` și `noteIt` (merg împreună).
  - `gap` apare exact o dată, ca un cuvânt întreg, în `it`.
  - `id`, `it` și `ro` sunt unice în lecție.
  - Fiecare lacună are un singur răspuns firesc în context: jocul de scriere acceptă un singur răspuns.
- **Puncte nesigure:** formele din secțiunea 9 a spec-ului marcate ca nesigure sau variabile **nu** se pun ca lacună (ex. *tra/fra*, *a/in maggio*, *nel/in Veneto*, *mia mamma / la mia mamma*, *sulle otto*).
- **Calitatea limbii:** italiană vorbită firească și corectă; română firească, cu diacritice (ă, â, î, ș, ț). Comentariile, dacă apar, în română.
- **Verificarea de la final:** `npm test`, `npm run typecheck`, `npm run validate`, `npm run test:e2e -- --trace off`.

## Review Focus

- **Lacună cu două răspunsuri corecte:** de exemplu *tra/fra*, *a/in* la luni, *in/sul treno* pentru un obiect uitat. Jocul de scriere ar marca greșit un răspuns bun. Fiecare revizie de task verifică exemplele unul câte unul.
- **Traducerea română care trădează sau contrazice lacuna:** de exemplu „la medic” pentru *dal medico* e corectă, dar o notă care spune „in + oraș” ar fi greșită. Revizia verifică `note` / `noteIt` față de exemplu.
- **Potrivire ambiguă:** două exemple cu traduceri românești foarte apropiate în aceeași lecție. Validarea cere doar `ro` unic; revizia verifică să nu fie echivalente.
- **Numărul de lecții scris în teste:** `tests/e2e/grammar.spec.ts:25` și `tests/e2e/stats.spec.ts:35,44` (18). Devine 26 în Task 4.
- **Lecția 10 rămâne lecția de formă:** corecturile nu mută sensurile în ea și păstrează blocurile sub 20.

---

### Task 1: Lecția 10 (corecturi) și lecțiile 19–20 (loc, timp)

**Files:**
- Modify: `content/grammar/10-preposizioni.json` (spec 7.0 și secțiunea 0, „Ce aș corecta”)
- Create: `content/grammar/19-preposizioni-luogo.json` (spec 7.1), `content/grammar/20-preposizioni-tempo.json` (spec 7.2)

**Interfaces:**
- Produces: id-urile de lecție `preposizioni-luogo` (order 19, A2) și `preposizioni-tempo` (order 20, A2).

- [ ] **Step 1: Aplică corecturile la lecția 10:**
  - textul despre *con/per* devine mai nuanțat (*col/coi* acceptate în vorbire, opționale) și se adaugă că *tra/fra* nu se contopesc niciodată;
  - regula 2 se ajustează după spec;
  - `pre-20` „Vado con il treno.” se înlocuiește cu „Esco con gli amici stasera.” (lacuna `con`, traducere și note potrivite);
  - se adaugă un bloc `text` cu regula de alegere a formei și o trimitere la lecțiile 19–26.
- [ ] **Step 2: Scrie lecțiile 19 și 20** după secțiunile 7.1 și 7.2 și după Global Constraints.
- [ ] **Step 3: Validează**

Run: `npm run validate`
Expected: `Conținut valid: …` fără erori. O eroare de lacună sau de unicitate se rezolvă în conținut.

- [ ] **Step 4: Verifică generarea și testele unitare**

Run: `npm run build:data && npm test`
Expected: rândul „Date generate” arată 20 de teme de gramatică; testele trec.

- [ ] **Step 5: Commit**

```bash
git add content/grammar
git commit -m "feat(gramatica): lecția 10 corectată și lecțiile despre prepozițiile de loc și de timp"
```

---

### Task 2: Lecțiile 21–22 (di, a)

**Files:**
- Create: `content/grammar/21-preposizione-di.json` (spec 7.3), `content/grammar/22-preposizione-a.json` (spec 7.4)

**Interfaces:**
- Consumes: lecțiile 19–20 (Task 1), ca să nu se repete aceleași exemple.
- Produces: `preposizione-di` (order 21, A2), `preposizione-a` (order 22, A2).

- [ ] **Step 1: Scrie lecțiile 21 și 22** după secțiunile 7.3 și 7.4. Sensurile vin din 2.1 și 2.2, contrastele din secțiunea 3, capcanele din secțiunea 5.
- [ ] **Step 2: Validează și generează**

Run: `npm run validate && npm run build:data && npm test`
Expected: fără erori; 22 de teme de gramatică; testele trec.

- [ ] **Step 3: Commit**

```bash
git add content/grammar
git commit -m "feat(gramatica): lecțiile despre prepozițiile di și a"
```

---

### Task 3: Lecțiile 23–24 (da, in și su)

**Files:**
- Create: `content/grammar/23-preposizione-da.json` (spec 7.5), `content/grammar/24-preposizioni-in-su.json` (spec 7.6)

**Interfaces:**
- Produces: `preposizione-da` (order 23, B1), `preposizioni-in-su` (order 24, B1).

- [ ] **Step 1: Scrie lecțiile 23 și 24** după secțiunile 7.5 și 7.6 (sensurile din 2.3, 2.4, 2.5). Pasivul (*da* agent) apare doar în forma *è stato fatto da*.
- [ ] **Step 2: Validează și generează**

Run: `npm run validate && npm run build:data && npm test`
Expected: fără erori; 24 de teme de gramatică; testele trec.

- [ ] **Step 3: Commit**

```bash
git add content/grammar
git commit -m "feat(gramatica): lecțiile despre prepozițiile da, in și su"
```

---

### Task 4: Lecțiile 25–26 (con, per, tra/fra; capcane) și testele cu numărul de lecții

**Files:**
- Create: `content/grammar/25-preposizioni-con-per-tra.json` (spec 7.7), `content/grammar/26-preposizioni-trappole.json` (spec 7.8)
- Modify: `tests/e2e/grammar.spec.ts:25` (`toHaveCount(18)` devine 26), `tests/e2e/stats.spec.ts:35,44` („din 18 lecții citite” devine „din 26”)

**Interfaces:**
- Produces: `preposizioni-con-per-tra` (order 25, B1), `preposizioni-trappole` (order 26, B1).

- [ ] **Step 1: Scrie lecțiile 25 și 26** după secțiunile 7.7 și 7.8. Lecția 26 adună capcanele (secțiunea 5) și particularitățile (secțiunea 4, inclusiv privitul pe fereastră). Exemplele ei nu repetă exemple din lecțiile 19–25.
- [ ] **Step 2: Actualizează testele** cu numărul de lecții.
- [ ] **Step 3: Validează, generează și rulează testele afectate**

Run: `npm run validate && npm run build:data && npm test && npm run test:e2e -- --trace off tests/e2e/grammar.spec.ts tests/e2e/stats.spec.ts tests/e2e/grammar-review.spec.ts tests/e2e/grammar-links.spec.ts`
Expected: fără erori; 26 de teme de gramatică; testele trec.

- [ ] **Step 4: Commit**

```bash
git add content/grammar tests/e2e/grammar.spec.ts tests/e2e/stats.spec.ts
git commit -m "feat(gramatica): lecțiile despre con, per, tra și capcanele prepozițiilor"
```

---

### Task 5: Audio pentru frazele noi

**Files:**
- Create: fișiere `.mp3` în `public/audio/words/` (frazele exercițiilor de gramatică)

- [ ] **Step 1: Generează**

Run: `npm run audio:grammar` (cere `~/qwen-tts/.venv`; dacă lipsește, raportează task-ul ca blocat)
Expected: generează doar frazele noi sau schimbate, apoi listează clipurile cu durată neobișnuită (de copiat în raport).

- [ ] **Step 2: Verifică acoperirea**

Run: `npm run build:data`, apoi un script scurt care compară `item.it` din toate lecțiile din `src/data/generated/grammar.json` cu cheile din `src/data/generated/recordings.json`.
Expected: fiecare frază de exercițiu are înregistrare.

- [ ] **Step 3: Commit**

```bash
git add public/audio/words
git commit -m "feat(audio): audio pentru exercițiile lecțiilor despre prepoziții"
```

---

### Task 6: Verificarea finală și PR-ul (subagent Haiku)

- [ ] **Step 1: Toată suita**

Run: `npm test && npm run typecheck && npm run validate && npm run test:e2e -- --trace off`
Expected: PASS. Testul de viteză (`perf.spec.ts`) poate pica o dată sub încărcare; dacă trece rulat singur, se notează în PR.

- [ ] **Step 2: Push și PR** (deschis, **nu îmbinat**), cu descrierea pregătită de controller:
  - ce aduce: lecția 10 corectată și lecțiile 19–26;
  - verificarea;
  - clipurile suspecte;
  - o listă de bifat cu „Textele italiene și punctele din secțiunea 9 au fost verificate”.

  Fără nicio mențiune de AI/asistent.
