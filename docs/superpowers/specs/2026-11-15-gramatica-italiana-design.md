# Design: lecțiile de gramatică și în italiană

## De ce

Cu interfața în italiană, temele de gramatică rămân în română (titlu, lecție, „De reținut”, explicațiile din jocuri). Cursantul care a trecut interfața în italiană vrea să citească și gramatica în italiană.

## Ce se construiește

- **Titlul** devine `{ it, ro }`, afișat ca la Teme (`BilingualLabel`: italiana, cu traducerea dedesubt dacă „Traducere în limba maternă” e pornită), peste tot: lista de lecții, pagina lecției, Acasă, Învață → Continuă, linkurile „Regula”.
- **„De reținut”** devine `{ it, ro }[]`, afișat cu caseta cu două fețe de la Teme (`TopicRulesBox`).
- **Lecția** (explicații, capcane, tabele, exemple) are ambele limbi; se afișează în **limba interfeței**:
  - blocurile `text` și `trap`: `ro` + `it`;
  - tabelele: `caption` + `captionIt`, `head` + `headIt`; celulele rămân (coloanele italiene sunt italiană, celelalte sunt traduceri în română, ca exemplele); opțional `rowsIt` pentru tabelele cu celule descriptive;
  - exemplele: `note` + `noteIt` (traducerea `ro` rămâne în română);
  - titlul casetei „Capcană pentru români” trece în i18n („Trappola per chi parla rumeno”).
- **Explicațiile din jocuri** (`items[].note`): `note` + `noteIt`, după limba interfeței.
- **Validare la build:** fiecare câmp explicativ în română are perechea italiană; marcajele `[it]`/`[b]` se verifică și în textele italiene; `headIt`/`rowsIt` au aceeași formă ca `head`/`rows`.

## Ce nu se schimbă

Traducerile (`ro` din exemple și din itemii jocurilor, coloanele „română” din tabele) rămân în română: sunt limba maternă a cursantului, nu explicații.

## Decizii

- Explicațiile urmează limba interfeței (nu o setare separată).
- Titlul și regulile urmează modelul Temelor (italiana întâi, în ambele interfețe).
- Textele italiene sunt scrise de mine și trebuie revizuite de un vorbitor nativ.

## Gata când

Testele unitare și E2E trec, `npm run validate` trece, iar cu interfața în italiană lecția „Articoli” arată explicațiile în italiană, iar cu interfața în română, în română.
