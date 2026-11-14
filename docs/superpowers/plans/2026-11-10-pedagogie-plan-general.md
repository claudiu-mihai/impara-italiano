# Plan general: pedagogie pentru italiana vorbită (A1–A2)

Rezultatul unui audit pedagogic din 2026-11-10. Scopul aplicației este italiana vorbită, de zi cu zi (înțelegere și vorbire), pentru un vorbitor de română. Auditul a arătat că aplicația antrenează bine vocabularul și conjugările în scris, dar aproape deloc ascultarea și vorbirea.

Fiecare fază se livrează într-un branch și un PR separat. Estimările sunt orientative.

## Fazele

| Fază | Conținut | Efort |
| --- | --- | --- |
| 1. Corecții rapide | Audio automat la carduri; direcția „Ambele” implicită la instalări noi; quiz corectat; bara de progres pe nivel; toleranță la scriere | 3–4 zile |
| 2. Ascultare | Card „ascultă întâi”; quiz din auz; propoziții din auz și cu cuvinte-capcană; potrivire din auz | 4–5 zile |
| 3. Start de supraviețuire | Primele două săptămâni: saluturi, politețe, numere, „Al bar”; temele uzuale la A1; cuvintele temei începute intră cu prioritate în sesiunea zilnică | 2–3 zile |
| 4. Gramatică în repetiție | Lecția ca abilitate FSRS; 6–8 lecții A2 (passato prossimo, reflexive, pronume directe, imperfetto, futuro, modale) | 2 zile cod + conținut |
| 5. Conjugare cu sens | Cerință cu traducere; limită pe verbele frecvente; Flip „cu voce tare” | 2–3 zile |
| 6. Dialoguri | Format de conținut nou; ascultare pe replici; joc de rol; ~10 teme; repere „pot să…” | 4–5 zile cod + conținut |
| 7. Setări pentru dislexie | Spațiere, text mai mare, mai puține elemente pe ecran, recunoaștere înainte de scriere, per utilizator | 3–4 zile |

Fazele 1–3 schimbă fiecare sesiune zilnică fără conținut nou. Fazele 4 și 6 depind de scrierea și revizuirea conținutului, care poate merge în paralel. Faza 7 poate urca mai sus dacă vin curând alți utilizatori.

## Probleme găsite și ce le rezolvă

| Problemă | Unde | Faza |
| --- | --- | --- |
| Audio doar la apăsare; textul italian e mereu vizibil înainte | `src/ui/AudioButton.tsx`, `src/features/flashcards/WordCard.tsx` | 1, 2 |
| Direcția implicită doar IT → RO; nu produci niciodată italiană | `src/domain/settings.ts` | 1 |
| Quiz: un răspuns corect din 4 variante dă „Bine”; runda include carduri nescadente; ghicirea creează carduri | `src/features/quiz/QuizPage.tsx`, `src/domain/quiz/buildQuizRound.ts` | 1 |
| Bara de progres raportează la toate cele 3617 de cuvinte, inclusiv C1–C2 | `src/features/home/HomePage.tsx` | 1 |
| Orice literă greșită e „greșit”; penalizează ortografia, nu italiana vorbită | `src/domain/grading/compareAnswer.ts` | 1 |
| Propoziții de 3–4 blocuri, fără capcane, alese la întâmplare | `src/domain/sentence/sentenceRound.ts` | 2 |
| Potrivire, Ordonează, Unde e Lupino: doar recunoaștere | `src/features/topics/*` | 2 |
| Cuvintele noi vin după frecvență (*essere, avere, fare…*), nu după utilitate | `src/domain/session/orderNewWords.ts` | 3 |
| 31 din 42 de teme sunt A2, inclusiv „Al bar” | `content/topics/` | 3 |
| Gramatică: doar „am citit” și scor; fără repetiție; doar lecții A1 | `src/domain/grammar/progress.ts`, `content/grammar/` | 4 |
| Conjugare: forme izolate, nu în propoziție | `src/features/conjugation/WriteCard.tsx` | 5 |
| Nu există dialoguri și nici exercițiu de vorbire | — | 6 |

## Faza 1 — Corecții rapide

**Gata când:** testele unitare și E2E trec, `npm run typecheck` trece, iar cele cinci schimbări de mai jos se văd în aplicație.

1. **Audio automat la carduri.** Setare nouă `autoPlayAudio` (pornită implicit la instalări noi). Cardul IT → RO redă cuvântul când apare; cardul RO → IT redă răspunsul italian când se întoarce. Fără redare la carduri notate deja sau când nu există voce italiană. Intră în backup și sincronizare ca restul setărilor; backup-urile vechi primesc valoarea implicită. Se actualizează FR4 din `app-plan.md` (azi: „fără redare automată”).
2. **Direcția „Ambele” implicită** la instalări noi. Setările salvate rămân neschimbate. Textul din Setări explică că a doua direcție se deblochează după ce o recunoști sigur.
3. **Quiz corectat.**
   - Doar cardurile scadente schimbă programul de repetare; restul rundei este exersare liberă, fără scriere în FSRS.
   - Răspuns corect din grilă → „Greu”, nu „Bine”; greșit → „Din nou”.
   - Grila nu creează carduri noi și nu notează cardurile RO → IT (producție).
4. **Bara de progres pe nivel.** Pe Acasă, cuvintele stăpânite se raportează la cuvintele nivelului curent (și ale celor de dedesubt), nu la tot dicționarul.
5. **Toleranță la scriere.** Rezultat nou „aproape” și pentru o literă greșită, lipsă, în plus sau inversată (nota „Greu”, forma corectă arătată), cu excepția cazului în care răspunsul dat este altă formă validă a aceluiași verb. La lacunele de gramatică rămâne strict. Setare `spellingTolerance` (pornită implicit).

Nu intră în Faza 1: tipuri noi de card (Faza 2), conținut nou (Fazele 3, 4, 6), setările pentru dislexie (Faza 7).

## Faza 2 — Ascultare

**Gata când:** testele unitare și E2E trec, `npx tsc --noEmit` trece, iar cele patru exerciții de mai jos se pot face din auz.

O singură setare nouă, `listenFirst` (pornită implicit, inclusiv pentru setările deja salvate), care ține cardul, quiz-ul și propozițiile. Funcționează doar când dispozitivul poate reda italiană (`useListening`); altfel rămân cu text.

1. **Card „ascultă întâi”.** La un card IT → RO deja început, fața arată 🔊 mare și „Arată textul”. Cuvântul se redă singur, indiferent de „Audio automat”. Cuvintele noi se introduc cu text și audio.
2. **Quiz din auz.** Jumătate din întrebările IT → RO (`QuizQuestion.listen`) ascund textul până la răspuns. Notarea rămâne cea din Faza 1.
3. **Propoziții din auz și cu capcane.** `SentenceQuestion` adaugă `decoys` (1 la propozițiile de 3 blocuri, 2 la restul, cuvinte din alte propoziții) și `listen` (jumătate). Răspunsul complet are exact blocurile propoziției; orice capcană îl face greșit.
4. **Potrivire din auz.** Implicit rămâne cu text (și cuvântul italian ales se aude). Comutatorul „🔊 Din auz”, doar pentru runda curentă, înlocuiește coloana italiană cu butoane de audio; cuvântul se vede după potrivire.

Fără schimbări de conținut: propozițiile (2928) și temele rămân cum sunt. Variantele cu text au rămas în aplicație (testele lor opresc „Ascultă întâi”).

## Reguli de lucru

- Fiecare fază: un branch din `main` actualizat, un singur PR la final, fără push sau PR fără acordul meu.
- Conținutul nou (cuvinte, teme, dialoguri, lecții) trece prin `content/drafts/`, `npm run enrich` și `npm run validate`.
- Nivelurile rămân estimate, nu oficiale.
