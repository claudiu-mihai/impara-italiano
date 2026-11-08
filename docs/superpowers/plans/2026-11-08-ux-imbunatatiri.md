# Îmbunătățiri UX după review: plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (sau subagent-driven-development) pentru a implementa planul task cu task. Pașii folosesc checkbox-uri (`- [ ]`).

**Goal:** Să fie evident ce ai de făcut azi și cum ajungi la fiecare parte a aplicației. Concret: etichete în bara de
jos, conjugările pe Acasă, pagina *Învață* grupată, butoanele temei sus, Setări mai scurte, Statistici cu rezumat și
cu progresul la Gramatică.

**Architecture:** Schimbări în ecranele existente, fără date noi pe server. Singura stare nouă este „ultima temă sau
lecție deschisă”. Ea stă local, în `db.meta`, nu se sincronizează și nu intră în backup.

**Tech Stack:** React 19, react-router 7, Dexie, Tailwind 4, vitest, Playwright + axe.

**Sursa:** review-ul UX din 2026-11-08 (ecranele Acasă, Învață, Teme, Gramatică, Dicționar, Statistici, Setări).
Nu există o specificație separată. Deciziile de mai jos țin loc de specificație și se aprobă odată cu planul.

## Decizii (de aprobat)

| # | Problema din review | Decizia |
|---|---|---|
| D1 | Bara de jos are doar iconițe, două se confundă | Iconiță + etichetă vizibilă (text mic). Numele rămân cele de acum: Acasă · Învață · Dicționar · Statistici · Setări. Iconițe noi, care nu se repetă în pagini: 🏠 · 🎓 · 🔎 · 📈 · ⚙️. |
| D2 | „Începe sesiunea” acoperă doar Flashcards | Pe Acasă, sub butonul principal, apare un al doilea buton „Conjugare: N repetiții · M timpuri noi” când ai conjugări de făcut. Dacă nu mai ai cuvinte, dar ai conjugări, butonul de conjugare devine cel principal și „Fatto!” nu apare. La finalul sesiunii de Flashcards, dacă ai conjugări, butonul principal devine „Continuă cu conjugarea”. |
| D3 | *Învață* are 6 plăci egale | Două grupe cu titluri: **„De făcut azi”** (Flashcards, Conjugare) și **„Exersează liber”** (Teme, Gramatică, Reconstruire propoziție, Quiz). Deasupra celei de-a doua apare „Continuă: <titlu>”, cu ultima temă sau lecție de gramatică deschisă, dacă există. |
| D4 | Butoanele temei sunt la capătul paginii | Ordinea în pagina temei: titlu → butoane (Studiază, Quiz, exerciții) → „Da ricordare” → lista de cuvinte. |
| D5 | Setări lungi, texte tăiate în liste | Pe ecrane înguste, eticheta stă deasupra controlului, iar lista ocupă toată lățimea (fără texte tăiate). Parametrii avansați stau într-o secțiune „Avansat”, restrânsă implicit: proporția de substantive, timpuri noi pe zi, cartonașe inverse pe zi, limita de repetiții, retenția țintă. |
| D6 | Statistici: 11 secțiuni, fără Gramatică | Sus rămân seria de zile și „Următoarele 7 zile”. Urmează o secțiune nouă, „Gramatică și teme” (lecții citite din 12, media celor mai bune scoruri, teme începute). Restul (calendar, niveluri, cuvinte pe progres, pe categorii, activitate) rămâne, în aceeași ordine, cu titluri care se pot restrânge. |
| D7 | Etichete de secțiune cu majuscule peste tot | Titlurile de secțiune devin text normal (prima literă mare), mai închis la culoare, în toată aplicația (constanta `heading` din fiecare pagină). |

## Global Constraints

- Tot lucrul pe un singur branch și un singur PR la final; fără push, PR sau merge fără acordul utilizatorului.
- Commit-uri fără nicio atribuire; mesajele, comentariile și textele noi sunt în română (plus it.ts pentru interfață).
- Textele noi de interfață intră în `src/i18n/ro.ts` **și** `src/i18n/it.ts`.
- **Pornirea nu încetinește:** Acasă nu încarcă `conjugations.json` înainte de prima afișare. Butonul de conjugare
  apare după ce se termină încărcarea la cerere. `perf.spec.ts` (Slow 4G < 1550 ms) trebuie să treacă, iar pachetul
  de pornire nu primește fișiere noi.
- Accesibilitate: `a11y.spec.ts` (axe) trece pe toate ecranele atinse, în ambele teme.
- Nu se schimbă comportamentul sesiunilor (FSRS, cozi, setări). Se schimbă doar unde și cum se ajunge la ele.

## Review Focus

1. **Utilizator nou** (niciun cuvânt învățat): pe Acasă nu apare butonul de conjugare (conjugarea e blocată până înveți
   verbe), iar în *Învață* placa „Conjugare” își păstrează mesajul de blocare (test în Task 2).
2. **Conjugări fără cuvinte noi:** Acasă nu spune „Fatto!” dacă mai ai conjugări (test în Task 2).
3. **„Continuă” către o temă care nu mai există** (id șters din conținut): placa nu apare, iar aplicația nu cade
   (test în Task 3).
4. **Interfața în italiană:** etichetele din bara de jos, titlurile grupelor și „Avansat” apar în italiană și încap
   pe 360 px lățime (test în Task 1 și în Task 5).
5. **Cititoare de ecran:** bara de jos are nume vizibile identice cu numele accesibile (fără `aria-label` dublat), iar
   secțiunile restrânse își anunță starea (`<details>`/`<summary>`) (axe, în Task 1 și în Task 6).

---

### Task 1: Bara de jos cu etichete (D1)

**Files:** `src/app/App.tsx` (`NAV`, `Layout`), teste: `tests/e2e/a11y.spec.ts`, `tests/e2e/ui-language.spec.ts`.

- Fiecare `NavLink` conține iconița (`aria-hidden`) și eticheta vizibilă (`text-xs font-semibold`). Se scot
  `aria-label` și `title`; numele accesibil vine din text.
- Elementul activ are fundalul de acum, plus eticheta în `text-brand-fg`.

- Etichetele nu au voie să fie tăiate sau să treacă pe două rânduri. „Impostazioni” (12 litere) e cea mai lungă. Dacă
  nu încape la 360 px, eticheta scade la `text-[11px]` cu `tracking-tight`, fără prescurtări, pentru că numele trebuie
  să rămână identic cu titlul paginii.

- [ ] **Step 1: Test E2E care pică**, în `ui-language.spec.ts`: pe `/`, bara de navigare are textele vizibile
  „Acasă”, „Învață”, „Dicționar”, „Statistici”, „Setări”. Cu interfața în italiană are „Casa”, „Impara”, „Dizionario”,
  „Statistiche”, „Impostazioni”, iar la viewport 360 px fiecare etichetă are `scrollWidth ≤ clientWidth` și un singur
  rând (înălțimea ≤ 1,5 × `line-height`).
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează. **Step 4:** `ui-language.spec.ts`, `a11y.spec.ts` →
  PASS.
- [ ] **Step 5:** Commit `feat(nav): bara de jos are etichete și iconițe care nu se repetă în pagini`.

### Task 2: Conjugările pe Acasă și după Flashcards (D2)

**Files:** `src/features/home/HomePage.tsx`, `src/features/flashcards/FlashcardsPage.tsx`, `src/i18n/ro.ts`,
`src/i18n/it.ts`, teste: `tests/e2e/conjugation-modes.spec.ts` (sau `tests/e2e/home.spec.ts` nou).

- Acasă: `useConjugations()` (deja încărcare la cerere) + `loadConjugationOverview`. Cât timp datele lipsesc, nu
  apare nimic în plus.
- Butonul secundar are textul `home.conjCta` („Conjugare: {due} repetiții · {fresh} timpuri noi” / „Coniugazione:
  …”), cu stilul „outlined”, și duce la `/learn/conjugation`.
- Cazul „fără cuvinte, cu conjugări”: butonul de conjugare devine cel principal (stilul „filled”), iar replica lui
  Lupino rămâne „In bocca al lupo!”.
- Finalul sesiunii de Flashcards (fără `topicId`): dacă `queue.length > 0` la conjugare, butonul principal e
  „Continuă cu conjugarea” (`flash.continueConj`), iar „Înapoi acasă” devine link secundar.

- [ ] **Step 1: Teste E2E care pică:**
  1. Cu `v-parlare` învățat (`seedLearnedWords`), pe `/` apare linkul „Conjugare: 0 repetiții · 1 timpuri noi”
     (textul după `tp`), care duce la `/learn/conjugation`.
  2. Cu `newPerDay: 0` și conjugări disponibile: pe `/` nu apare „Fatto! Ora relax.”, iar linkul de conjugare are
     stilul principal (`data-variant="primary"`).
  3. Utilizator nou: pe `/` nu există link „Conjugare:”.
  4. Flashcards până la final, cu un verb învățat: apare „Continuă cu conjugarea” → `/learn/conjugation`.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează.
- [ ] **Step 4:** Testele de mai sus, plus `flashcards.spec.ts` și `perf.spec.ts` (`--project=perf`) → PASS; în build,
  `index.html` nu are fișiere JS noi preîncărcate.
- [ ] **Step 5:** Commit `feat(home): conjugările de azi apar pe Acasă și după Flashcards`.

### Task 3: *Învață* în două grupe, cu „Continuă” (D3)

**Files:** `src/features/learn/LearnPage.tsx`, `src/features/topics/TopicPage.tsx`,
`src/features/grammar/GrammarTopicPage.tsx`, `src/data/db/repositories.ts`, `src/i18n/*`, teste:
`src/data/db/repositories.test.ts`, `tests/e2e/phase3.spec.ts` (sau `learn.spec.ts` nou).

**Interfaces:**
- `type LastPractice = { kind: "topic" | "grammar"; id: string }`
- `setLastPractice(db: ImparaDb, value: LastPractice): Promise<void>` și
  `getLastPractice(db: ImparaDb): Promise<LastPractice | undefined>` (cheia `db.meta` „lastPractice”; valori cu altă
  formă → `undefined`).
- `TopicPage` și `GrammarTopicPage` apelează `setLastPractice` la deschidere (o dată pe id).
- `LearnPage`: titlurile `learn.today` („De făcut azi” / „Da fare oggi”) și `learn.practice` („Exersează liber” /
  „Esercizio libero”). Placa „Continuă: <titlu>” (`learn.continue`) ia titlul din `useTopics()` / `useGrammar()`; dacă
  id-ul nu mai există, placa nu apare.

- [ ] **Step 1: Teste care pică:** unitar (`set` → `get` dus-întors; formă greșită → `undefined`); E2E: deschide
  `/learn/topics/familia`, apoi `/learn` → linkul „Continuă: La famiglia” duce la temă; titlurile celor două grupe
  sunt vizibile, iar Flashcards e în prima grupă.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează. **Step 4:** testele → PASS, plus `a11y.spec.ts`.
- [ ] **Step 5:** Commit `feat(learn): „De făcut azi” și „Exersează liber”, cu reluarea ultimei teme`.

### Task 4: Pagina temei cu butoanele sus (D4)

**Files:** `src/features/topics/TopicPage.tsx`, teste: `tests/e2e/topics.spec.ts`.

- [ ] **Step 1: Test E2E care pică:** pe `/learn/topics/familia`, `data-testid="topic-actions"` apare în pagină
  înaintea primei liste de cuvinte (`compareDocumentPosition`), iar „Da ricordare” apare înaintea listei.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Mută blocurile în ordinea din D4. **Step 4:** `topics.spec.ts`,
  `a11y.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat(topics): butoanele temei și „Da ricordare” stau înaintea listei de cuvinte`.

### Task 5: Setări fără texte tăiate, cu „Avansat” (D5)

**Files:** `src/features/settings/SettingsPage.tsx`, `src/i18n/*`, teste: `tests/e2e/phase2.spec.ts` (sau
`settings.spec.ts` nou), `tests/e2e/ui-language.spec.ts`.

- `Field`: sub 480 px (`max-sm`) e o coloană (eticheta sus, controlul pe toată lățimea); de la `sm` în sus rămâne
  rândul de acum. Se scot `max-w-48` și `max-w-[55%]` pe ecrane înguste.
- Secțiunea „Avansat”: `<details>` cu `<summary>` („Avansat” / „Avanzate”), în cardul „Studiu”, cu cele 5 setări din
  D5.

- [ ] **Step 1: Teste E2E care pică:** la 360 px lățime, lista „Nivelul curent” are `scrollWidth ≤ clientWidth`
  (textul opțiunii selectate încape); „Retenție țintă” nu e vizibilă până la deschiderea „Avansat”; după deschidere
  se poate schimba și valoarea rămâne după reîncărcare.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează. **Step 4:** testele de Setări, `ui-language.spec.ts`,
  `a11y.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat(settings): setările avansate restrânse, fără texte tăiate pe telefon`.

### Task 6: Statistici cu „Gramatică și teme” (D6)

**Files:** `src/features/stats/StatsPage.tsx`, `src/i18n/*`, teste: `tests/e2e/phase2.spec.ts` (sau `stats.spec.ts`
nou), unitar dacă se adaugă o funcție de calcul (`src/domain/grammar/progress.ts`:
`grammarSummary(topics: GrammarTopic[], rows: GrammarProgress[]): { read: number; total: number; averageBest?: number }`).

- Ordinea: seria de zile → „Următoarele 7 zile” → „Gramatică și teme” → progres → restul, fiecare cu `<details open>`
  pentru primele trei și `<details>` închis pentru restul.

- [ ] **Step 1: Teste care pică:** unitar `grammarSummary` (fără progres → `{ read: 0, total: 12 }`; două lecții citite
  cu scoruri 80 și 100 → `read: 2, averageBest: 90`); E2E: după „Am citit” la articole, `/stats` arată „1 din 12
  lecții citite”.
- [ ] **Step 2:** Rulează → FAIL. **Step 3:** Implementează. **Step 4:** testele, `a11y.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat(stats): rezumat sus și progresul la gramatică și teme`.

### Task 7: Titluri de secțiune fără majuscule (D7)

**Files:** constanta `heading` (și echivalentele cu `uppercase tracking-wide`) din `SettingsPage.tsx`, `StatsPage.tsx`,
`HomePage.tsx`, `TopicsPage.tsx`, `TopicPage.tsx`, `GrammarTopicPage.tsx`, `WordDetailPage.tsx` și alte locuri găsite
cu `grep -rn "uppercase tracking-wide" src`.

- Noua clasă: `text-base font-semibold text-slate-700 dark:text-slate-200`. Butoanele „De reținut” /
  „Da ricordare” rămân cum sunt, pentru că sunt titluri de casetă, nu de secțiune.

- [ ] **Step 1:** Capturi înainte/după pentru Acasă, Statistici, Setări, temă, în ambele teme. **Step 2:**
  `npx vitest run` și `npm run test:e2e` → PASS (textele DOM nu se schimbă; `text-transform` nu contează pentru
  testele după nume).
- [ ] **Step 3:** Commit `style: titlurile de secțiune fără majuscule`.

### După toate task-urile

1. `npm run validate && npm run typecheck && npx vitest run && npm run test:e2e` → totul trece.
2. Capturi ale ecranelor atinse (luminos și întunecat), arătate utilizatorului înainte de PR.
3. Review final al branch-ului, apoi întrebarea despre PR.
