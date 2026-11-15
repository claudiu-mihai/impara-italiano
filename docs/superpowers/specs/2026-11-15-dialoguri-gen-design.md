# Design: genul personajului în dialoguri

## De ce

În italiană (și în română) genul celui care vorbește schimbă forma cuvintelor: *sono stanco / stanca*, *sei sposato / sposata*, *benvenuto / benvenuta*, „încântat / încântată”. După revizuirea Fazei 6, replicile cursantului au devenit neutre ca să nu exerseze forme greșite, dar asta ascunde exact regula. Cursantul își alege genul personajului și vede (și aude) formele potrivite.

## Ce se construiește

- **Marcaj în conținut:** `{masculin|feminin}` în textul replicilor, italian și român, oriunde în cuvânt: `Sei sposat{o|a}?`, `Ești căsătorit{|ă}?`, `{domnule|doamnă}`, `student{e|essa}`. Una dintre variante poate fi goală.
- **Validare la build:** acolade echilibrate, exact un `|` în fiecare marcaj, fără imbricare; titlul și reperul „pot să…” fără marcaj. Testul de conținut cere cel puțin un marcaj în fiecare dialog.
- **Dialogurile:** fiecare din cele 10 primește 1–2 replici cu gen, firești (cursantul despre el: *mi sono perso/a*, *sono arrivato/a*, *sono pieno/a*; celălalt către el: *benvenuto/a*, *signore/signora*, *sei sposato/a?*).
- **Setare** `learnerGender: "m" | "f"`, implicit `"m"`, în Setări („În dialoguri joc ca: Bărbat / Femeie”); intră în backup și sincronizare.
- **Pagina dialogului:** comutator „Joci ca: ♂ Bărbat / ♀ Femeie”, pornit din setare, valabil pentru vizita curentă (nu schimbă setarea), ca să exersezi ambele forme.
- **Afișare:** cuvântul care se schimbă după gen e evidențiat (subliniat), ca regula să se vadă; vocea citește textul ales.
- **Repetarea nu se schimbă:** același dialog, același card.

## Abordări

- **Marcaj în text (ales):** o singură replică, variantele lângă cuvânt; ușor de scris și de revizuit.
- Variante întregi pe replică (`itF`, `roF`): duplică textul, se desincronizează ușor.

## Deciziile mele

- Implicit „Bărbat” pentru setările existente și noi (comutatorul de pe pagină face alegerea vizibilă la fiecare dialog).
- Comutatorul de pe pagină nu salvează setarea.
- Evidențierea marchează tot cuvântul care conține marcajul.

## Gata când

Testele unitare și E2E trec, `npx tsc --noEmit` și `npm run validate` trec, iar același dialog jucat ca femeie arată și redă *sposata*, iar ca bărbat *sposato*.
