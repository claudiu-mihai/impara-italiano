# Audio pregenerat pentru dialoguri – plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicile dialogurilor se redau din MP3-uri generate local (Francesco, Giullia; Luca/Sofia ca a doua voce), cu vocea de sistem ca rezervă.

**Architecture:** Regula vocilor e în `src/domain/dialogue/voices.ts`. Un script Node (`scripts/audio/`) calculează fișierele (hash din voce și text) și pornește generatorul Python; `build-data` leagă fișierele existente de replici. `speak()` redă fișierul, cu rezervă pe `speechSynthesis`; service worker-ul le păstrează offline.

**Tech Stack:** TypeScript (Node 24, rulat direct), Python + mlx_audio (în `~/qwen-tts/.venv`), ffmpeg, React, vite-plugin-pwa (Workbox), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-audio-dialoguri-design.md`

## Global Constraints

- Vocile: `francesco`, `giullia` (principale), `luca`, `sofia` (a doua voce); referințe `<QWEN_TTS_DIR>/<voce>_hd.wav`, text de referință „Buongiorno! Come posso aiutarti oggi con il tuo progetto?”, model `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16`, `lang_code=it`.
- Fișier: primele 16 caractere hex din `sha256(voce + "\n" + text)` + `.mp3`, în `public/audio/dialogues/`.
- MP3 mono, 64 kbps.
- Viteza fișierului: `ttsRate / 0.9`, limitată la [0,5; 2].
- Textele UI noi în `ro.ts` și `it.ts` (aceleași chei).
- Fără atribuire AI în commituri.

## Review Focus

1. Fișier lipsă sau 404 (offline, necache-uit): replica se aude cu vocea de sistem, nu tace.
2. `play()` respins (politica de autoplay): rezervă pe vocea de sistem, o singură dată (fără dublă redare când vin și `error`, și respingerea).
3. O redare nouă sau ieșirea din dialog oprește fișierul în curs (`stopSpeaking`).
4. Text schimbat după generare: replica pierde fișierul la build (hash diferit), nu redă textul vechi.
5. Dispozitiv fără voce italiană: 🔊 din dialog apare pentru replicile cu fișier, iar „Ascultă întâi” ascunde textul doar când replica are fișier.

---

### Task 1: Genul personajelor și regula vocilor

**Files:** `src/domain/content/schema.ts`, `src/domain/dialogue/check.ts`, `src/domain/dialogue/voices.ts` (nou), `src/domain/dialogue/voices.test.ts` (nou), `scripts/dialogues.test.ts`, `content/dialogues/*.json`

**Produces:** `type VoiceName = "francesco" | "giullia" | "luca" | "sofia"`; `dialogueVoice(dialogue: Pick<Dialogue, "speakers" | "you">, speakerId: string, learner: Gender): VoiceName`.

- [ ] Teste: celălalt m → francesco, f → giullia; cursant m cu celălalt f → francesco; cursant f cu celălalt m → giullia; cursant m cu celălalt m → luca; cursant f cu celălalt f → sofia. `dialogueProblems`: personaj celălalt fără `gender` → problemă; cursant cu `gender` → problemă.
- [ ] Rulează, vezi că pică.
- [ ] Schema: `gender: z.enum(["m","f"]).optional()` pe personaj; regulile în `check.ts`; `voices.ts`.
- [ ] Adaugă `gender` în cele 10 dialoguri (Farmacista: f).
- [ ] `npm test`, `npm run validate` trec; commit.

### Task 2: Fișierele replicilor la build

**Files:** `scripts/audio/dialogueAudio.ts` (nou), `scripts/audio/dialogueAudio.test.ts` (nou), `scripts/content.ts` sau `scripts/build-data.ts`, `src/domain/content/schema.ts` (tip)

**Produces:** `audioFileName(voice: VoiceName, text: string): string`; `dialogueAudioJobs(dialogues): { voice, text, file }[]` (unice); `withDialogueAudio(dialogue, exists: (file: string) => boolean): GeneratedDialogue`; tipul `GeneratedDialogue` cu `lines[i].audio?: Partial<Record<Gender, string>>`.

- [ ] Teste: numele e stabil și diferă la voce sau text diferit; replica fără marcaj cu celălalt personaj are același fișier pentru m și f; replica cu marcaj are fișiere diferite; `withDialogueAudio` pune doar fișierele existente.
- [ ] Implementare; `build-data` folosește `existsSync(public/audio/dialogues/<file>)` și afișează câte replici au audio.
- [ ] Teste, typecheck; commit.

### Task 3: Generarea

**Files:** `scripts/audio/generate-dialogues.ts` (nou), `scripts/audio/generate.py` (nou), `package.json` (`audio:dialogues`), `public/audio/dialogues/*.mp3`

- [ ] Scriptul Node scrie joburile lipsă într-un fișier temporar și rulează `<QWEN_TTS_DIR>/.venv/bin/python scripts/audio/generate.py <jobs.json> <out_dir>`; Python încarcă modelul o dată, generează WAV, convertește cu ffmpeg și afișează durata și caracterele pe secundă; Node listează replicile suspecte (< 6 sau > 22 caractere pe secundă).
- [ ] Rulează generarea; verifică numărul de fișiere și duratele; `npm run build:data` arată toate replicile cu audio; commit (fișierele MP3 incluse).

### Task 4: Redarea în aplicație

**Files:** `src/services/tts.ts`, `src/ui/AudioButton.tsx`, `src/features/dialogue/{Bubble,ListenMode,RolePlayMode}.tsx`, `tests/e2e/helpers.ts`, `tests/e2e/dialogues.spec.ts`

**Produces:** `speak(text, rate, { speaker?, audio?: string })`; `AudioButton` cu prop `audio?: string`; `dialogueAudioUrl(file: string): string`.

- [ ] E2E (pică întâi): cu vocea de sistem mock-uită și `play()` înregistrat, dialogul de la bar redă `/audio/dialogues/<fișier>.mp3` la prima replică; cu `play()` respins, se aude textul prin vocea de sistem (testele existente). Fără voce italiană, 🔊 apare în balon.
- [ ] `mockSpeech` respinge implicit `HTMLMediaElement.prototype.play` (testele existente verifică rezerva); un helper nou `mockAudio` înregistrează sursele.
- [ ] Implementare în `tts.ts` (fișier, viteză, rezervă o singură dată, oprire), `AudioButton`, componentele dialogului.
- [ ] Teste unitare, E2E dialoguri; commit.

### Task 5: Offline și documentație

**Files:** `vite.config.ts`, `app-plan.md`, `docs/superpowers/plans/2026-11-10-pedagogie-plan-general.md`

- [ ] `runtimeCaching`: `/\/audio\//`, `CacheFirst`, `cacheName: "audio"`, `rangeRequests: true`, `cacheableResponse: { statuses: [0, 200] }`, `expiration: { maxEntries: 2000 }`.
- [ ] Documentează generarea (`npm run audio:dialogues`) și redarea; build complet, suita completă (unit + E2E); commit.

### Task 6: Cuvintele A1 (extindere)

**Files:** `scripts/audio/run.ts` (nou, extras din generarea dialogurilor), `scripts/audio/wordAudio.ts` + test, `scripts/audio/generate-words.ts`, `scripts/build-data.ts` (`recordings.json`), `src/services/tts.ts` (`preloadRecordings`, `recordingFor`, `useRecording`), `src/ui/AudioButton.tsx`, `src/app/App.tsx`, `tests/e2e/audio-words.spec.ts`, `public/audio/words/*.mp3`

- [ ] Teste: joburile doar pentru A1, cu articol la substantive, fără dubluri (omografe); indexul doar cu fișierele existente; `speak()` folosește indexul după încărcare. E2E: 🔊 la *essere* redă înregistrarea, și fără voce italiană.
- [ ] Generare (`npm run audio:words`), build, suita completă; commit.
