# Audio pregenerat pentru dialoguri

## De ce

Vocile de sistem de pe Android sună slab, iar dialogurile sunt exercițiul în care vocea contează cel mai mult (ascultare pe replici, joc de rol). Am testat un model local (Qwen3-TTS, în `~/qwen-tts`) cu voci clonate; utilizatorul a ales **Francesco** (masculin) și **Giullia** (feminin). Audio-ul se generează o dată, pe Mac, și se livrează cu aplicația: gratuit, offline după prima ascultare, fără termeni de cloud.

## Obiective

- Fiecare replică a celor 10 dialoguri are un MP3 pentru fiecare gen al cursantului.
- Personajul celălalt are o voce după genul lui; cursantul, după genul ales („Joci ca”).
- Fără fișier (text schimbat, negenerat, eroare de rețea): vocea de sistem, ca azi.

Extins în același PR, la cererea utilizatorului: **cuvintele A1**, cu vocea lui Francesco (vezi mai jos).

Nu intră acum: cuvintele A2+, exemplele, gramatica; verificare automată cu Whisper; precache la instalare.

## Approaches

1. **Fișiere în repo, legate la build** (ales): scriptul generează MP3-uri în `public/audio/dialogues/`, cu numele derivat din voce și text; `build-data` adaugă fișierul la replică doar dacă există. Simplu, fără server, textul schimbat cade singur pe vocea de sistem.
2. Fișiere pe un server separat (PocketBase, CDN): nu e nevoie pentru ~3 MB și ar complica offline-ul.
3. Generare pe dispozitiv: imposibil (modelul are GB și cere Apple Silicon).

## Decizii

- **Genul personajelor.** Personajul celălalt primește `gender: "m" | "f"` în fișa dialogului (obligatoriu); personajul cursantului nu are gen (vine din „Joci ca”). Farmacista e femeie.
- **Vocile.** Celălalt: m → Francesco, f → Giullia. Cursantul: m → Francesco, f → Giullia; când ar coincide cu vocea celuilalt, a doua voce: Luca (m) sau Sofia (f). Regula e o funcție TypeScript (`domain/dialogue/voices.ts`), folosită și la generare, și la build.
- **Fișierul.** `<sha256(voce + "\n" + text rezolvat), primele 16 caractere>.mp3`. Replica din `dialogues.json` primește `audio: { m?: string; f?: string }`.
- **Generarea.** `npm run audio:dialogues`: un script Node scrie lista de fișiere lipsă, iar un script Python (rulat cu `.venv`-ul din `~/qwen-tts`, sau `QWEN_TTS_DIR`) le generează și le convertește cu ffmpeg în MP3 mono 64 kbps. La final listează replicile cu durată suspectă (prea puține sau prea multe caractere pe secundă), ca să fie ascultate.
- **Redarea.** `speak()` primește opțional fișierul; îl redă cu `HTMLAudioElement`, cu viteza relativă la cea implicită (`ttsRate / 0.9`), cu tonul păstrat. La eroare sau la `play()` respins, cade pe vocea de sistem. Butonul 🔊 cu fișier apare și fără voce italiană în sistem; „Ascultă întâi” în dialog funcționează și fără voce de sistem când replica are fișier.
- **Offline.** Service worker-ul salvează fișierele `/audio/` la prima ascultare (CacheFirst, cu suport pentru cereri parțiale, cum face Safari).

## Ce rămâne la latitudinea implementării

Organizarea exactă a scripturilor, mesajele din consolă, pragurile pentru „durată suspectă”.

## Cuvintele A1

- **Ce se înregistrează:** textul rostit în aplicație pentru fiecare cuvânt A1 (`italianText`: substantivele cu articol, „il caffè”, „l'acqua”), o singură dată pe text, cu Francesco. `npm run audio:words` → `public/audio/words/`.
- **Indexul:** `build-data` scrie `recordings.json` (text → fișier, doar cele existente). `speak()` îl consultă pentru orice frază fără înregistrare dată, deci toate ecranele care rostesc cuvinte (carduri, quiz, potrivire, ordonează, dicționar, teme) folosesc înregistrarea fără schimbări.
- **Încărcarea:** indexul (~40 KB) se încarcă la 1,5 s după pornire sau la primul `speak()`, ca să nu întârzie primul ecran; până atunci, vocea de sistem.
- **„Ascultă întâi”** la carduri și quiz rămâne condiționat de vocea de sistem (neschimbat).
