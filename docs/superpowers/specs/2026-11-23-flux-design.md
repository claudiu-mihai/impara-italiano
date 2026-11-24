# Design: Flux — învățat prin scrolling

## De ce

Utilizatorul vrea să înlocuiască „doom scrolling”-ul (Instagram, TikTok) cu italiana: când vine reflexul de a derula ceva, deschide aplicația și derulează un flux de carduri scurte. Fluxul trebuie să captiveze cât mai mult, ca obiceiul să se mute, dar fiecare minut trebuie să conteze pentru învățare, nu doar pentru expunere.

Aplicația are deja materia primă: 3617 cuvinte cu exemple și note, 6764 de propoziții, 18 lecții de gramatică, dialoguri și povești cu voci înregistrate, plus programul de repetare (FSRS), care știe ce e scadent. Fluxul le pune într-un format de consum rapid și adaugă un pachet nou de conținut scris special pentru flux, pentru noutate.

## Obiective

- Un ecran nou, **Flux**, cu carduri pe tot ecranul, derulate vertical, câte unul pe ecran (scroll-snap), fără sfârșit.
- **Flux mixt** (ales de utilizator): majoritatea cardurilor se citesc și se ascultă; cam unul din 3–4 este un test de o atingere, iar răspunsurile intră în repetare după regulile existente.
- Repetițiile scadente apar primele, „deghizate” în carduri de flux; cuvintele noi respectă limita zilnică din Setări.
- Mecanici care țin atenția: varietate imprevizibilă, audio automat, combo pentru răspunsuri corecte la rând, reacții ale lui Lupino, carduri de bilanț, sărbătoare când s-au terminat repetițiile zilei.
- **Pachet de conținut nou** pentru flux (ales de utilizator, varianta B): expresii idiomatice, prieteni falși RO–IT, „Lo sapevi?” (cultură), gesturi italiene și micro-povești, cu audio înregistrat.
- Acces într-o atingere: tab în bara de jos, scurtătură pe iconița aplicației și opțiunea de a porni aplicația direct în Flux.

## Ce nu intră

- Social: like-uri publice, comentarii, distribuire, clasamente.
- Imagini sau video (gesturile se descriu în text, cu emoji acolo unde există, ex. 🤌).
- Conținut generat pe loc cu un model AI (nu merge offline, calitate necontrolată).
- Tipuri noi de card FSRS sau schimbări în formatul backup-ului și al sincronizării.
- Statistici noi pe ecranul Statistici (timp în flux etc.).
- Limită de timp sau oprire forțată (utilizatorul vrea un flux care captivează).

## Anti-obiective

- **Repetiții false:** un card notat fără ca răspunsul să fi fost ascuns întâi (ex. „știu” cu traducerea deja vizibilă). Asta ar umfla programul FSRS cu cuvinte care nu sunt de fapt știute.
- **Flux previzibil:** același tip de card de mai multe ori la rând sau același cuvânt repetat la câteva carduri distanță. Odată ce fluxul devine previzibil, nu mai ține atenția.
- **Pornire mai lentă:** Fluxul și datele lui se încarcă la cerere; testul de viteză (`tests/e2e/perf.spec.ts`, pe Acasă, cu setările implicite) trebuie să treacă neschimbat. Cu „Pornește în Flux” activ, cardul de start nu are nevoie de date (vezi „Ecranul Flux”), iar `sentences.json` (1,4 MB) și `details.json` (1,3 MB) se încarcă în fundal, după primul ecran.
- **Exersarea liberă să mănânce limitele:** fluxul nu introduce mai multe cuvinte noi decât `newPerDay` și nu notează mai multe repetiții decât `maxReviewsPerDay`.

## Abordări luate în calcul

**Ce fel de flux** (ales de utilizator: B, flux mixt)
- A. Pasiv: doar citit și ascultat, fără efect asupra progresului. Cel mai aproape de scrolling-ul obișnuit, dar ajută puțin la memorare.
- **B. Mixt (ales):** cam unul din 3–4 carduri e un test de o atingere, cu notare în repetare.

**De unde vine conținutul** (ales de utilizator: B)
- A. Doar conținutul existent. Cel mai rapid, iar fluxul e practic nesfârșit.
- **B. Conținutul existent plus un pachet nou scris pentru flux (ales):** mai multă noutate, cu timp în plus pentru scris, revizuit și înregistrat.

**Forma ecranului** (decizia mea, pentru captivare)
- **Pe tot ecranul, vertical, câte un card (ales):** cel mai imersiv, iar formatul e deja familiar din Reels/TikTok.
- Listă de carduri, ca pe Instagram: se văd mai multe carduri deodată, deci atenția se împarte. Respins.
- Generare cu AI: respinsă (vezi „Ce nu intră”).

## Ecranul Flux

Ruta `/feed`, ecran de studiu pe tot ecranul (fără bara de jos, ca `isStudyRoute` din `App.tsx`). Derularea folosește CSS `scroll-snap-type: y mandatory`; fiecare card are înălțimea zonei vizibile (`useVisibleViewport`). Nu se adaugă dependențe noi.

```
┌──────────────────────────┐
│ ✕     🔥 x4    ●●●○ 12/20│  ✕ închide · combo · repetițiile de azi
│                          │
│        allora            │  se aude singur
│                          │
│   atinge = traducerea    │
│   dublă atingere = știu  │
│                          │
│  «Allora, andiamo?»      │  exemplu, cu 🔊
│               Lupino 😼  │
└──────────────────────────┘
         ↑ glisează
```

**Antet fix:** ✕ (înapoi de unde ai venit; la pornirea direct în Flux, spre Acasă), 🔇/🔊 (sunetul fluxului, doar pentru vizita curentă, ex. în autobuz fără căști), contorul de combo (apare de la 2 răspunsuri corecte la rând) și progresul repetițiilor de azi (făcute / scadente la intrare). Când nu mai e nimic scadent, progresul devine „✓ Repetiții gata”.

**Primul card** e un card de start cu Lupino: „Atinge ca să începi”. Nu are nevoie de date, deci apare imediat, cât timp primul lot se pregătește. Atingerea deblochează audio-ul pe iOS (redarea automată cere un gest), iar de acolo fiecare card își redă singur sunetul când ajunge în ecran.

**Audio pe iOS:** azi `playRecording` din `src/services/tts.ts` creează un `Audio()` nou la fiecare redare, iar pe iOS un gest deblochează doar elementul redat atunci. Înregistrările vor folosi un singur element audio refolosit (deblocat la atingerea de start), în toată aplicația, nu doar în Flux. Se verifică pe un iPhone real că redarea automată merge după 20 de carduri, atât cu înregistrări, cât și cu vocea dispozitivului.

**Redare automată:** urmează setarea existentă `autoPlayAudio`; cu ea oprită, cardurile au doar butoane 🔊.

**Card activ:** cardul vizibil în proporție de cel puțin 60% (IntersectionObserver). Doar cardul activ redă audio; la ieșirea din ecran, redarea se oprește.

**Navigare fără gesturi:** tastele ↑/↓, PageUp/PageDown și Spațiu trec la cardul următor sau anterior. Orice acțiune făcută prin dublă atingere are și un buton vizibil. Cu `prefers-reduced-motion` nu există animații de tranziție și nici confetti.

## Tipurile de card

Fiecare card are o acțiune principală de cel mult o atingere. „Pasiv” înseamnă că nu se notează nimic.

**Din conținutul existent**

| Card | Ce arată | Interacțiune | Notare |
| --- | --- | --- | --- |
| Repetiție cuvânt | Cuvânt scadent: fața cardului (IT sau RO, după direcție) se aude/se vede, răspunsul ascuns. Cu „Ascultă întâi” și voce disponibilă, IT → RO începe doar cu 🔊. | Atingere = arată răspunsul, apoi butoanele existente Nu/Da (`RatingButtons`, după `ratingMode`). Dublă atingere *înainte* de dezvăluire = „Da” cu animație ❤️. | Ca la carduri (`source: "flashcard"`). Dacă treci mai departe fără notă, nu se scrie nimic, iar cardul poate reveni mai târziu în același flux. |
| Cuvânt nou ✨ | Cardul nou din coada sesiunii zilnice (`buildDailySession`): cuvânt nou în ordinea ghidată sau a doua direcție deblocată a unui cuvânt știut. Eticheta „✨ Cuvânt nou”; răspunsul ascuns, ca în `WordCard`. | Atingere = răspunsul, cu exemplu, notă și audio; apoi Nu/Da. | Ca un card nou din sesiunea zilnică; introdus doar dacă notezi, în limitele `newPerDay` și `newReversePerDay`. |
| Cuvânt cunoscut | Un cuvânt deja început, nescadent, cu traducere, un exemplu și, dacă are, nota. | Pasiv; 🔊 pe cuvânt și pe exemplu. | — |
| Propoziție | O propoziție ale cărei cuvinte sunt toate începute (ca `buildSentenceRound`), audio IT, traducerea ascunsă. | Atingere = traducerea. | — |
| Regulă | O regulă dintr-o lecție de gramatică de până la nivelul ales, IT cu traducerea dedesubt (după `nativeHelp`), și linkul „Deschide lecția”. | Pasiv. | — |
| Replică | 2–3 replici consecutive dintr-un dialog sau o scenă de poveste, cu vocile înregistrate, și linkul spre dialog/poveste. | Pasiv; se aud în serie. | — |
| Știai că? | Nota unui cuvânt (589 de cuvinte au `note`) sau `falseFriend` (19), cu cuvântul și exemplul. | Pasiv. | — |
| Test: grilă | Ca o întrebare din quiz: 4 variante (`pickDistractors`), uneori din auz (`LISTEN_SHARE`), despre un cuvânt început și *nescadent*. Cardurile scadente apar doar ca „Repetiție cuvânt”, unde pot primi „Bine” (o grilă corectă dă doar „Greu” și ar scurta intervalele). | O atingere, răspuns imediat, cu sunet și combo. | Exersare liberă. |
| Test: adevărat/fals | „*cane* = pisică?” cu ✓ / ✗. Jumătate din întrebări sunt adevărate. | O atingere. | Exersare liberă (două variante sunt prea ușor de ghicit pentru FSRS). |
| Test: completează | Un item cu lacună dintr-o lecție de gramatică (`items`), cu 3 variante. | O atingere. | Exersare liberă. |
| Test: cuvânt nou | 4–8 carduri după un „Cuvânt nou” notat, o grilă despre el. | O atingere. | Ca la quiz (`quizGrade`, `source: "quiz"`), doar dacă e IT → RO și cardul e scadent (în învățare, de obicei este); altfel exersare liberă. |

**Din pachetul nou** (vezi „Conținut nou”)

| Card | Interacțiune | Notare |
| --- | --- | --- |
| Espressione / Falso amico / Lo sapevi? / Gesto | Textul italian se aude; explicația e vizibilă. Fiecare are 🔊 și, opțional, exemplu. | — |
| Micro-poveste | 3–6 replici scurte, cu narator și voci, ca un mini-episod; poanta apare la final. | — |
| Test din pachet | Întrebarea itemului (ex. „Ce înseamnă *In bocca al lupo*?”), cu 3–4 variante. Apare doar pentru itemi văzuți deja (într-o vizită anterioară sau cu cel puțin 10 carduri în urmă). | Exersare liberă. |

**Carduri speciale**

- **Bilanț** la 25, 50, 100, apoi la fiecare 100 de carduri din aceeași vizită: carduri văzute, repetiții făcute, cuvinte noi, cel mai lung combo, cu Lupino.
- **Repetiții gata:** o singură dată pe zi, imediat după ce ultima repetiție scadentă a fost notată, cu sărbătoare (confetti, Lupino), apoi fluxul continuă.
- **Final de material:** dacă nu mai există conținut nevăzut în vizita curentă (puțin probabil), un card cu Lupino propune o temă sau o lecție, iar fluxul reia cu ce a fost văzut cel mai demult.

## Mecanici de captivare

- **Combo 🔥:** crește la fiecare test corect la rând și se resetează la greșeală. La 3, 5, 10 și 20 apare o animație mai mare, iar sunetul de corect urcă un ton (`playFeedback` primește nivelul combo-ului). Cel mai lung combo din vizită apare în bilanț.
- **Lupino:** reacții scurte după teste și la cardurile speciale, cu pozele existente din `src/ui/mascot/` (`bravo` la combo și bilanț, `pensa` după o greșeală, `in-bocca-al-lupo` pe cardul expresiei, `serie` la „Repetiții gata”, `ciao` la start). Nu se desenează poze noi.
- **Vibrație** la răspuns corect/greșit, unde există (`navigator.vibrate`, Android); se oprește odată cu sunetul (`soundEnabled`).
- **Varietate imprevizibilă:** amestecul urmează ponderile de mai jos, dar ordinea are o parte aleatorie; cardurile din pachetul nou și micro-poveștile sunt „surprizele”.
- **Recompensă imediată:** cuvântul nou e testat după câteva carduri, deci îl recunoști cât e proaspăt.

## Cum se construiește fluxul

O funcție pură, `buildFeedBatch` (`src/domain/feed/`), produce următoarele ~15 carduri pe baza a ceea ce știe aplicația și a ceea ce s-a văzut deja în vizită. Ecranul cere un lot nou când mai sunt 5 carduri până la capăt.

**Ponderi de pornire** (constante, ajustabile după folosire):

- cât timp există repetiții scadente: ~40% repetiții cuvinte, ~25% teste, ~35% restul;
- după terminarea lor: ~30% teste, ~15% pachet nou, ~15% propoziții, ~10% cuvinte cunoscute, ~10% replici, ~10% reguli, ~10% Știai că? / cuvinte noi (cât permite limita).

**Reguli de ordine:**

- niciodată două teste la rând și niciodată mai mult de 3 carduri fără test;
- același tip de card de cel mult 2 ori la rând (excepție: repetițiile, de cel mult 3 ori);
- același cuvânt de cel mult o dată la 10 carduri (excepție: testul de după un cuvânt nou);
- un card din pachetul nou (item sau testul lui) cam o dată la 6–8 carduri, după primele 5, dar *numai dacă există unul eligibil* (vezi mai jos); altfel locul îl ia alt tip;
- primul lot începe cu un card ușor și plăcut (cuvânt cunoscut sau Lo sapevi?), nu cu un test.

**Ce s-a văzut:**

- În vizită (în memorie): ce a fost arătat, ca să nu se repete.
- Între vizite, doar pentru pachetul nou: `db.meta`, cheia `feedSeen`, cu `{ [itemId]: { shown?: ms, quizzed?: ms } }`, momentul ultimei afișări a itemului și a testului lui. *Decizia mea:* local, nu sincronizat (pe alt dispozitiv se pot repeta câțiva itemi; nu merită schimbarea sincronizării).
- **Eligibil:** un item nevăzut niciodată; sau unul neafișat de cel puțin 3 zile; sau testul unui item văzut, netestat de cel puțin 3 zile. Itemii nevăzuți au prioritate, apoi cei văzuți cel mai demult. Nimic nu se repetă în aceeași vizită. *Consecință asumată:* la folosire intensă (sute de carduri pe zi), cei ~45 de itemi ai unui nivel se văd în 1–2 zile, după care cardurile din pachet devin rare (câțiva pe zi, pe măsură ce trec cele 3 zile) în loc să se repete. Pachetul poate crește ulterior cu loturi noi, fără schimbări de cod.
- Cuvintele, propozițiile, regulile și replicile se aleg aleatoriu din ce e permis, deci nu e nevoie de istoric între vizite.

**Nivel:** totul vine din conținutul de până la nivelul ales în Setări; propozițiile, doar din cuvinte începute.

## Notare și limite

- Se refolosesc regulile existente, fără reguli noi: cardurile „Repetiție cuvânt” și „Cuvânt nou” notează ca `FlashcardsPage` (inclusiv pașii de învățare, care readuc cardul în același flux după câteva minute); grilele notează doar la „Test: cuvânt nou”, ca `QuizPage` (corect → Greu, greșit → Din nou). Restul testelor sunt exersare liberă, cu combo dar fără scriere în FSRS.
- Repetițiile și cuvintele noi vin direct din coada `buildDailySession` (cu `maxReviewsPerDay`, `newPerDay`, `newReversePerDay`), deci limitele sunt aceleași ca în sesiunea zilnică, fără calcul separat.
- *Decizia mea:* sursele existente (`"flashcard"`, `"quiz"`) în loc de una nouă `"feed"`, pentru că backup-ul validează lista de surse (`src/data/backup/backup.ts`) și sincronizarea ar trebui și ea schimbată. Consecința: în jurnal nu se vede ce repetiții au venit din flux.
- Repetițiile din flux intră în seria de zile 🔥, în numărul de repetiții ale zilei și în statistici, ca restul.
- Un card notat în flux nu mai apare în sesiunea zilnică de azi și invers (aceleași carduri FSRS).
- Coada de repetiții se calculează la intrare și se recalculează când se cere un lot nou (cardurile notate cu „Din nou” revin după pasul de învățare, ca în sesiunea zilnică).

## Conținut nou

Un fișier per categorie în `content/feed/`, validat cu Zod la build (`scripts/content.ts`), generat în `src/data/generated/feed.json`, inclus în `dataVersion` și încărcat la cerere (`loadFeed()` în `contentStore.ts`).

```json
{
  "id": "espr-in-bocca-al-lupo",
  "kind": "espressione",
  "level": "A1",
  "it": "In bocca al lupo!",
  "ro": "Baftă! (literal: „În gura lupului!”)",
  "explain": {
    "it": "Si dice per augurare fortuna. Si risponde «Crepi!».",
    "ro": "Se spune ca urare de noroc. Se răspunde «Crepi!» (să moară lupul)."
  },
  "example": { "it": "Domani hai l'esame? In bocca al lupo!", "ro": "Mâine ai examen? Baftă!" },
  "wordIds": ["n-bocca", "n-lupo"],
  "quiz": { "question": { "it": "Cosa si risponde a «In bocca al lupo»?", "ro": "Ce răspunzi la «In bocca al lupo»?" }, "options": ["Crepi!", "Grazie mille!", "Anche tu!"], "answer": 0 }
}
```

Micro-poveștile folosesc formatul poveștilor existente (personaje cu `voice`, replici), cu o singură scenă de 3–6 replici.

**Categorii și cantități (ținta: ~90 de itemi):**

| Categorie | `kind` | Câte | Note |
| --- | --- | --- | --- |
| Expresii idiomatice | `espressione` | 25 | Uzuale în vorbire: *In bocca al lupo*, *Che figata!*, *Non vedo l'ora*, *Magari!* |
| Prieteni falși RO–IT | `falso-amico` | 20 | Specifici unui vorbitor de română, aleși cât se poate dintre cuvintele A1–A2 (ex. *salire* = a urca, nu „a sări”); nivelul vine din dicționar |
| Lo sapevi? | `lo-sapevi` | 20 | Cultură practică: cappuccino doar dimineața, *coperto*, *passeggiata*, cum se salută la telefon (*Pronto*) |
| Gesturi | `gesto` | 10 | Descriere în text + emoji (🤌 *Ma che vuoi?*) |
| Micro-povești | `micro-storia` | 15 | A1–A2, cu narator și 1–2 personaje, poantă la final |

**Nivelul itemilor:**
- Expresiile, „Lo sapevi?”, gesturile și micro-poveștile au nivelul scris de mână, după cât de utile sunt, nu după nivelul cuvintelor. O expresie se învață ca un tot: *In bocca al lupo* e utilă la A1, deși *lupo* e B1 în dicționar. *Decizia mea:* fără regula „nivelul cuvintelor ≤ nivelul itemului” de la teme.
- Prietenii falși au nivelul cuvântului italian din dicționar (primul din `wordIds`, obligatoriu la `falso-amico`), calculat la build, nu scris. Lista se alege astfel încât cei mai mulți să fie A1–A2. Unii propuși mai sus (*fattoria* C1, *cantina* B2, *morbido* B2) ies dintre ei sau rămân pentru nivelurile mari.
- Nivelurile permise: A1–B1. Fluxul arată itemii de până la nivelul ales.

**`wordIds`** servesc la legătura spre dicționar (atingerea cuvântului deschide fișa lui) și la regula „același cuvânt de cel mult o dată la 10 carduri”. Nu condiționează afișarea: un item poate apărea și dacă nu ai început cuvintele lui.

**Reguli verificate la build:** id unic cu prefix după categorie (`espr-`, `falso-`, `sap-`, `gest-`, `stor-`); `level` A1–B1 (lipsă la `falso-amico`, unde se calculează); `wordIds` există în dicționar; `quiz.answer` e un index valid, cu variante distincte; micro-poveștile au 3–6 replici și vocile din `VOICE_NAMES`.

**Audio:** ca la dialoguri și povești, nu ca la cuvinte. Fiecare text înregistrat (textul italian, exemplul, replicile micro-poveștilor, fiecare cu vocea ei) primește la build un câmp `audio` cu calea fișierului, după modelul `withDialogueAudio` / `withStoryAudio` din `scripts/audio/`. Fișierele stau în `public/audio/feed/`, iar generarea se face prin `npm run audio:dialogues`, extins cu joburile pachetului. Itemii simpli folosesc vocea `francesco`, iar micro-poveștile vocile personajelor. Fără înregistrare, se folosește vocea dispozitivului.

**Revizie:** textele le scriu eu; trebuie citite de un vorbitor (italiană și română) înainte de a fi considerate finale, ca la dialoguri și gramatică. Expresiile și gesturile trebuie verificate în special: sensul și registrul (familiar/vulgar) contează.

## Acces

- **Bara de jos:** un tab nou „Flux” (▶️), al treilea din șase. *Decizia mea:* șase tab-uri încap la 375 px lățime (≈62 px fiecare), cu etichetele actuale de 11 px; se verifică la 320 px că etichetele nu se suprapun (captură în testul E2E al fluxului).
- **Acasă:** un buton „▶ Derulează” lângă butonul principal al sesiunii zilnice.
- **Scurtătură pe iconiță:** `shortcuts` în manifestul PWA (`vite.config.ts`), „Flux” → `/feed` (apăsare lungă pe iconiță, Android; pe iOS nu există scurtături pentru PWA).
- **Setare nouă** `startInFeed` („Pornește în Flux”, oprită implicit): aplicația deschisă de pe iconiță merge direct în Flux. Intră în backup și sincronizare ca restul setărilor (valoare implicită pentru setările vechi, prin `withSettingDefaults`).

## Constrângeri

- Textele interfeței în `src/i18n/ro.ts` și `it.ts`, cu aceleași chei (testul `noHardcodedText`).
- Ecranul și datele (propoziții, gramatică, dialoguri, pachetul nou) se încarcă la cerere; pachetul de start nu crește (`perf.spec.ts`).
- Accesibilitate: axe trece pe Flux; butoane de minimum 48 px; cardul activ anunțat (`aria-live="polite"`); fiecare gest are o alternativă cu buton sau tastă.
- Funcționează offline (conținutul e în build; audio-ul pachetului se salvează în cache la prima ascultare, ca înregistrările existente).
- Un branch, un PR la final (`feat/flux`).

## Ce rămâne la latitudinea celui care construiește

- Componentele cardurilor și cât refolosesc din `WordCard`, `QuizPage`, `Bubble`, `RatingButtons`.
- Valorile exacte ale ponderilor și pragurilor (în limitele de mai sus), plus animațiile.
- Cum se împart textele pachetului între fișiere, dacă un fișier per categorie devine prea mare.

## Gata când

Testele unitare și E2E trec, `npm run typecheck` și `npm run validate` trec, iar:

- Fluxul se derulează fără sfârșit, cu toate tipurile de card și regulile de ordine respectate (test unitar pe `buildFeedBatch`, cu generator aleatoriu fix).
- O repetiție scadentă notată în flux dispare din sesiunea zilnică și apare în numărul de repetiții ale zilei.
- Cuvintele noi din flux nu depășesc `newPerDay`.
- Cei ~90 de itemi din pachetul nou trec validarea și au audio.
- Pe un iPhone real, după atingerea de start, redarea automată merge și după 20 de carduri (înregistrări și voce de sistem).
- Cu „Pornește în Flux” activ, cardul de start apare fără să aștepte `sentences.json` sau `details.json` (test E2E).
- Tab-ul, butonul de pe Acasă, scurtătura și „Pornește în Flux” duc în Flux.
