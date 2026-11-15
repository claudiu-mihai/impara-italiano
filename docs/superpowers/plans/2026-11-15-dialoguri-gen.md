# Genul personajului în dialoguri — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cursantul alege genul personajului din dialoguri și vede/aude formele potrivite, cu cuvintele care se schimbă evidențiate.

**Architecture:** marcaj `{m|f}` în textul replicilor, rezolvat în `src/domain/dialogue/gender.ts`; validat la build; setare `learnerGender`; comutator pe pagina dialogului, transmis modurilor Ascultă și Joc de rol.

**Tech Stack:** React + TS, Dexie, zod (build și backup), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-dialoguri-gen-design.md`

## Global Constraints

- Marcaj: `{masculin|feminin}`, exact un `|`, fără imbricare; titlul și `canDo` fără marcaj.
- Setarea `learnerGender: "m" | "f"`, implicit `"m"`, în `DEFAULT_SETTINGS`, `withSettingDefaults` și schema de backup.
- Textele interfeței în `ro.ts` și `it.ts`; commit-uri fără atribuire; PR doar cu acordul utilizatorului.

## Review Focus

- Text fără marcaj: rezolvarea îl întoarce neschimbat, fără segmente evidențiate — test unitar (Task 1).
- Marcaj la începutul sau sfârșitul replicii și variantă goală (`român{|că}`) — test unitar (Task 1).
- Vocea citește textul rezolvat, nu acoladele — E2E (Task 3) prin `spoken`.
- Backup vechi fără `learnerGender` se importă cu „m” — test unitar pe `withSettingDefaults` (Task 2).
- Comutatorul de pe pagină nu schimbă setarea salvată — E2E (Task 3).

---

### Task 1: Marcajul și validarea

**Files:** Create `src/domain/dialogue/gender.ts` + `gender.test.ts`; Modify `src/domain/dialogue/check.ts` (+ test), `scripts/dialogues.test.ts`, cele 10 fișiere din `content/dialogues/`.

**Interfaces — Produces:**
- `type Gender = "m" | "f"`
- `resolveGender(text: string, gender: Gender): string`
- `genderParts(text: string, gender: Gender): { text: string; gendered: boolean }[]` — cuvintele care conțin un marcaj sunt segmente `gendered`.
- `genderMarkupProblems(text: string): string[]`; `dialogueProblems` raportează problemele de marcaj pe replici și orice marcaj în titlu sau `canDo`.

- [ ] Teste: `resolveGender("Sei sposat{o|a}?", "f") === "Sei sposata?"`; `resolveGender("Sunt român{|că}.", "m") === "Sunt român."`; fără marcaj → neschimbat; `genderParts("Buongiorno, {signore|signora}!", "f")` → `[{text:"Buongiorno, ",gendered:false},{text:"signora",gendered:true},{text:"!",gendered:false}]`; probleme pentru `{o}`, `{o|a|i}`, `{o|a`, `{{o|a}|i}`; `dialogueProblems` cu marcaj în titlu → mesaj.
- [ ] Rulează → FAIL; implementează; rulează → PASS.
- [ ] Conținut: 1–2 replici cu gen în fiecare dialog; `scripts/dialogues.test.ts` cere cel puțin un marcaj în fiecare dialog; `npm run validate` → PASS.
- [ ] Commit `feat(dialoguri): marcaj pentru genul personajului`.

### Task 2: Setarea `learnerGender`

**Files:** Modify `src/domain/settings.ts` (+ test), `src/data/backup/backup.ts`, `src/features/settings/SettingsPage.tsx`, i18n.

- [ ] Test: `withSettingDefaults({...fără learnerGender})` → `"m"`; schema de backup acceptă `"f"` și refuză `"x"`.
- [ ] FAIL → implementare (select „În dialoguri joc ca” cu Bărbat/Femeie) → PASS.
- [ ] Commit `feat(setari): genul personajului din dialoguri`.

### Task 3: Pagina dialogului

**Files:** Modify `src/features/dialogue/{DialoguePage,ListenMode,RolePlayMode,Bubble}.tsx`, i18n; Modify `tests/e2e/dialogues.spec.ts` (rezolvă textele cu `resolveGender`).

**Interfaces — Consumes:** `resolveGender`, `genderParts`, `settings.learnerGender`.

- Comutator `role="radiogroup"` „Joci ca” (♂ Bărbat / ♀ Femeie) pe ecranul cu modurile; starea pornește din setare, nu se salvează; modurile primesc `gender`.
- Bubble afișează `genderParts` (segmentele `gendered` subliniate, `data-gendered`); `speak` și „Spune în italiană” folosesc textul rezolvat.

- [ ] Teste E2E: la „Familia”, ca femeie, replica lui Marco conține „sposata” (evidențiat) și `spoken` conține „sposata”; ca bărbat „sposato”; după comutare, Setări arată tot „Bărbat”; testele existente trec cu textele rezolvate.
- [ ] `npx tsc --noEmit && npx vitest run && npx playwright test` → PASS.
- [ ] Documentație (`app-plan.md`, planul general) și commit `feat(dialoguri): alegerea genului pe pagina dialogului`.
