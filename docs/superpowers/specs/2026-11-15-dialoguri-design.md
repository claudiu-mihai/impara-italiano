# Design: Faza 6 — Dialoguri

## De ce

Scopul aplicației e italiana vorbită, de zi cu zi. După fazele 1–5, aplicația antrenează cuvinte, conjugări și gramatică, inclusiv din auz, dar niciun exercițiu nu pune cursantul într-o conversație: să audă o replică în context și să răspundă el, cu voce tare. Auditul pedagogic (2026-11-10) a pus mini-dialogurile pe primul loc ca impact: „Dialoguri: nu există deloc.”

Faza 6 adaugă dialoguri scurte pe teme, ascultate replică cu replică și apoi jucate (joc de rol), care revin la repetare ca lecțiile de gramatică. Reperele „pot să…” arată ce situații poate deja descurca.

## Obiective

- ~10 dialoguri scurte (4–8 replici), legate de temele uzuale, A1 și A2.
- **Ascultă:** replică cu replică, cu cine vorbește, audio și, după ascultare, textul italian și traducerea.
- **Joc de rol:** cursantul joacă un personaj fix (clientul, turistul); replicile celuilalt se aud singure, ale lui sunt ascunse: vede ce trebuie să spună în română, o spune cu voce tare, apoi o dezvăluie și o aude.
- **Repetare:** fiecare dialog e o abilitate FSRS; după primul joc de rol pe un dialog nou sau scadent cursantul se notează singur; dialogul revine pe Acasă când e scadent.
- **Repere „pot să…”:** pe Acasă, lista situațiilor, bifate când dialogul e învățat.

## Ce nu intră

- Recunoaștere vocală sau înregistrare (auditul: nu știm dacă merge offline pe telefoanele țintă; autoevaluarea acoperă deocamdată vorbirea).
- Alegerea rolului (joci mereu personajul marcat ca al tău), ramificări, răspunsuri alternative.
- Dialoguri peste A2; audio înregistrat sau generat dinainte (rămâne vocea dispozitivului).

## Anti-obiective

- Să devină o lectură: dacă replicile se văd înainte de a fi auzite sau spuse, exercițiul nu antrenează vorbirea.
- Să încetinească pornirea aplicației (testul LCP din `perf.spec.ts`).
- Să complice backup-ul sau sincronizarea (nu se adaugă tipuri noi de card).

## Abordări luate în calcul

**Ce se întâmplă după dialog** (ales de utilizator: A)
- **A. Repetare FSRS (ales).** Dialogul revine singur; „pot să…” înseamnă învățat, nu doar parcurs o dată.
- B. Exercițiu liber pe pagina temei; reperul se bifează la primul joc de rol. Mai simplu, dar dialogul se uită.

**Unde stă conținutul** (ales de utilizator: 1)
- **1. Fișiere separate în `content/dialogues/` (ales),** legate de temă prin `topicId`: mai multe dialoguri pe temă, validare separată, încărcate doar la nevoie.
- 2. Câmp `dialogue` în fișa temei: un singur dialog pe temă, fișe mai mari.

## Conținut

Un fișier pe dialog, `content/dialogues/<id>.json`, cu numele egal cu id-ul:

```json
{
  "id": "la-bar-01",
  "topicId": "la-bar",
  "title": { "it": "Un caffè, per favore", "ro": "O cafea, vă rog" },
  "canDo": { "it": "So ordinare al bar", "ro": "Pot să comand la bar" },
  "speakers": [
    { "id": "barista", "name": { "it": "Barista", "ro": "Barmanul" } },
    { "id": "cliente", "name": { "it": "Tu", "ro": "Tu" } }
  ],
  "you": "cliente",
  "lines": [
    { "speaker": "barista", "it": "Buongiorno! Cosa prende?", "ro": "Bună ziua! Ce doriți?" },
    { "speaker": "cliente", "it": "Vorrei un caffè, per favore.", "ro": "Aș vrea o cafea, vă rog." }
  ]
}
```

Reguli verificate la build (`scripts/content.ts`, ca la teme și lecții):
- id unic, egal cu numele fișierului, format `tema-NN`;
- `topicId` există; nivelul dialogului este nivelul temei (nu se scrie separat);
- exact 2 personaje, cu id-uri diferite; `you` e unul dintre ele;
- 4–8 replici; fiecare personaj are cel puțin 2; nicio replică goală;
- `canDo` unic între dialoguri.

Cele 10 dialoguri (temă → situație „pot să…”):

| Temă | Nivel | Pot să… |
| --- | --- | --- |
| saluturi-si-politete | A1 | mă prezint și să salut |
| la-bar | A1 | comand la bar |
| mesele-zilei | A1 | comand la restaurant și să cer nota |
| piata-si-supermarket | A1 | cumpăr la piață și să întreb prețul |
| directii | A1 | întreb drumul și să înțeleg răspunsul |
| ora | A1 | întreb cât e ceasul și la ce oră e ceva |
| familia | A1 | vorbesc despre familia mea |
| la-hotel | A2 | fac check-in la hotel |
| gara-si-aeroport | A2 | cumpăr un bilet de tren |
| la-medic-si-farmacie | A2 | explic la farmacie ce mă doare |

Replicile folosesc, cât se poate, cuvintele temei. Textele le scriu eu; trebuie citite de un vorbitor (italiană și română) înainte de a fi considerate finale, ca la lecțiile de gramatică.

Build-ul scrie `src/data/generated/dialogues.json` (toate dialogurile, ~15 KB), inclus în `dataVersion`, încărcat la cerere (`loadDialogues()` în `contentStore.ts`).

## Repetare (FSRS)

- Card de tip `skill` existent: `cardId` `skill:dialogue:<id>`, `wordId` `dialogue:<id>`. Backup-ul și sincronizarea nu se schimbă.
- Identificatorii și scadența în `src/domain/dialogue/due.ts` (fără `ts-fsrs`, folosit de Acasă), notarea în `review.ts`, după modelul `domain/grammar/`.
- Notarea: la finalul jocului de rol, trei butoane — **Din nou** („am uitat multe”), **Greu** („cu ezitări”), **Bine** („le-am spus fără să mă uit”). Fără „Ușor”.
- Doar primul joc de rol terminat pe un dialog nou (fără card) sau scadent se notează; altfel e exersare liberă (textul „Exersare liberă, programul nu se schimbă”). Ascultarea nu notează nimic.
- Fără pașii scurți FSRS (`shortTerm` false), ca dialogul să nu revină după 10 minute.
- **Învățat** = stabilitate ≥ 7 zile (aceeași valoare ca deblocarea timpurilor, `TENSE_UNLOCK_STABILITY_DAYS`).
- Repetiția se salvează cu `source: "skill"`, ca la gramatică, deci intră în jurnal, în streak și în numărul de repetiții ale zilei, dar nu în statisticile de cuvinte.

## Ecrane

**Pagina temei.** Dialogurile se încarcă la cerere pe pagina temei. Pentru fiecare dialog al temei, un buton „💬 Dialog: *Un caffè, per favore*” (după exercițiile existente) → `/learn/topics/:id/dialogue/:dialogueId`. ✕ și finalul te întorc la temă.

**Pagina dialogului.** Antet: titlul (italiană, cu traducerea dedesubt), reperul „Pot să comand la bar” și starea de repetare (refolosește `ReviewStatus` din gramatică: „De repetat” / „Următoarea repetiție: peste N zile”). Două butoane: **🎧 Ascultă** și **🗣️ Joc de rol**.

**Ascultă.** Câte o replică pe ecran, sub forma unui balon de chat (stânga celălalt, dreapta tu), cu numele personajului. Replica se aude singură. Cu „Ascultă întâi” activ și voce disponibilă (`useListening`), textul italian e ascuns până la „Arată textul”; altfel se vede direct. Traducerea apare sub text. Replicile deja ascultate rămân deasupra (ca un chat), cu 🔊 pentru reluare. „Următoarea replică” → la final, „Treci la jocul de rol”.

```
 Barmanul                       [🔊]
 Buongiorno! Cosa prende?
 Bună ziua! Ce doriți?
                           Tu  [🔊]
              (ascuns) [Arată textul]
 ─────────────────────────────────
 [ Următoarea replică ]
```

**Joc de rol.** Același chat. Replicile celuilalt se aud singure și se văd (text și traducere). La replica ta apare un balon cu traducerea („Spune în italiană: *Aș vrea o cafea, vă rog.*”) și butonul „Arată replica”, care dezvăluie textul italian și îl redă, ca să compari. Apoi „Continuă”. La final: cele 3 butoane de notare (dacă se notează) sau „Exersare liberă”, apoi „Încă o dată” și „Înapoi la temă” (numele „Din nou” rămâne doar pentru notă).

**Acasă.**
- Dialogurile se încarcă pe Acasă doar dacă există cel puțin un card de dialog (se vede din carduri); o instalare nouă nu le încarcă.
- „Dialoguri de repetat” (ca „Gramatică de repetat”): dialogurile scadente, cu link direct la jocul de rol.
- „Pot să…”, sub bara de progres, tot de la primul card de dialog. Lista reperelor dialogurilor de la nivelul curent și de dedesubt, cu ✓ la cele învățate și ○ la restul, plus numărul „3 din 7”.

**Învață.** Un rând „💬 Dialoguri” către `/learn/dialogues`: lista tuturor dialogurilor (titlu, temă, nivel, starea de repetare), grupate pe nivel.

## Voci

- Fiecare personaj are o voce. Dacă dispozitivul are cel puțin două voci italiene utilizabile acum (locale, sau de rețea când e online), al doilea personaj primește a doua voce, aleasă după aceleași reguli ca prima (`pickVoice`), excluzând-o pe cea a primului.
- Cu o singură voce, al doilea personaj se deosebește prin înălțime (`pitch` 0,85 față de 1,1). *Decizia mea:* înălțimea în loc de viteză (propusă inițial), ca viteza aleasă în Setări să rămână aceeași pentru toate replicile.
- Serviciul TTS primește o opțiune nouă `speak(text, rate, { speaker: 0 | 1 })`; restul aplicației nu se schimbă.
- Fără voce italiană, dialogul merge cu text (ca restul exercițiilor din auz): textul se vede direct, iar butoanele de audio sunt inactive.

## Constrângeri

- Textele interfeței în `src/i18n/ro.ts` și `it.ts` (aceleași chei; testul `noHardcodedText`).
- Acasă nu importă `ts-fsrs` și nu încarcă dialogurile la pornire.
- Accesibilitate: axe trece pe pagina dialogului (ascultă și joc de rol) și pe listă; butoanele de minimum 48 px; replicile noi anunțate (`aria-live`).
- Un branch, un PR la final (`feat/dialoguri`).

## Gata când

Testele unitare și E2E trec, `npx tsc --noEmit` și `npm run validate` trec, iar un dialog terminat la jocul de rol revine pe Acasă când e scadent și bifează reperul „pot să…” când e învățat.

Teste:
- unitare: validarea conținutului, scadența și notarea (`domain/dialogue`), alegerea vocii pentru al doilea personaj;
- E2E: ascultare cu și fără „Ascultă întâi”, joc de rol până la notare, dialog scadent pe Acasă, reper bifat pentru un card cu stabilitate ≥ 7, exersare liberă la un dialog programat mai târziu, axe.

## Lăsat constructorului

- Formularea exactă a textelor din interfață și aspectul baloanelor, în stilul existent.
- Dacă lista `/learn/dialogues` grupează pe nivel sau pe grupul temei.
- Fișierele și numele componentelor, după modelul `features/grammar` și `features/topics`.
- Actualizarea `app-plan.md` și a planului general (secțiunea Faza 6).
