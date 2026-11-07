# Secțiunea Gramatică: lecții de teorie + exerciții

Data: 2026-11-07 · Stare: propus, în așteptarea aprobării

## 1. Scop

Aplicația are acum 3 teme de gramatică (articole, *essere*, *avere*) în **Învață → Jocuri**. Teoria se reduce la 1–4 reguli
scurte, ascunse în caseta „De reținut”. Vrem teorie adevărată, folosită în două feluri:

1. **Lecții în traseul de învățare**: citești o lecție scurtă, apoi exersezi pe loc.
2. **Referință din alte ecrane**: din fișa unui cuvânt sau din conjugare ajungi direct la regula potrivită.

**Criterii de reușită**

- Toate temele A1 (12) au lecție + exerciții.
- Lista arată, pentru fiecare temă, dacă lecția a fost citită și cel mai bun scor; progresul se sincronizează în cont.
- Din fișa cuvântului (substantiv, adjectiv, verb) și din conjugare (prezent) există link către lecția potrivită.

**Presupuneri (confirmate în discuție)**

- Lecțiile sunt în română, indiferent de limba interfeței, la fel ca temele de gramatică de acum.
- Accent pe italiana vorbită: explicații scurte, multe exemple cu audio, terminologie minimă.
- A2 (passato prossimo, reflexive, pronume complement, imperfetto, viitor, *ci*/*ne*, comparativ) este un pas
  separat, în afara acestei specificații.

## 2. Navigare și ecrane

- Plăcuța **„Jocuri”** din *Învață* devine **„📘 Gramatică”**.
- `/learn/grammar`: lista temelor în ordinea de învățare, cu număr, titlu, badge de nivel, **✓** dacă lecția e citită
  și cel mai bun scor (cel mai mare dintre jocurile cu scor).
- `/learn/grammar/:id`: pagina temei, de sus în jos:
  1. titlu + badge de nivel;
  2. **lecția** (blocurile din §3);
  3. **„De reținut”**: regulile scurte existente, ca rezumat (deschise implicit pe această pagină);
  4. buton **„Am citit”** (devine „✓ Citită”; se poate apăsa din nou fără efect);
  5. **exercițiile**: cele 3 jocuri existente, cu cel mai bun scor afișat lângă Potrivire și Scriere.
- `/learn/grammar/:id/cards|match|type`: jocurile existente, mutate.
- **Redirecționări**: `/learn/games` → `/learn/grammar`, `/learn/games/:id` → `/learn/grammar/:id`,
  `/learn/games/:id/:game` → `/learn/grammar/:id/:game` (semnele de carte vechi continuă să meargă).
- Folderul `src/features/games/` se redenumește `src/features/grammar/`. Cheile i18n existente `games.*` rămân
  neschimbate; textele noi primesc chei `grammar.*`, în ambele limbi (ro, it).
- **Înapoi** din lecție: dacă ai venit dintr-un link din alt ecran, butonul te întoarce acolo (istoria browserului);
  dacă ai deschis pagina direct, duce la `/learn/grammar`.

## 3. Formatul conținutului

Fiecare temă rămâne un fișier în `content/grammar/NN-id.json`. Se adaugă câmpul **`lesson`**, o listă de blocuri:

| Tip        | Câmpuri                                            | Afișare                                                         |
|------------|----------------------------------------------------|-----------------------------------------------------------------|
| `text`     | `ro`                                               | paragraf scurt                                                   |
| `table`    | `caption?`, `head: string[]`, `rows: string[][]`   | tabel; celulele italiene au `lang="it"` și se pot asculta       |
| `examples` | `items: { it, ro, note? }[]`                       | listă italiană → română, buton de ascultare pe fiecare exemplu  |
| `trap`     | `ro`                                               | casetă „Capcană pentru români”                                  |

**Italiana în text**: în `text`, `trap` și `note`, fragmentele italiene se scriu între `[it]…[/it]`. La afișare devin
`<span lang="it">`, ca să fie citite cu voce italiană de cititoarele de ecran și să apară în italic. Celulele de tabel
au un câmp `itColumns?: number[]` care spune ce coloane sunt în italiană (implicit: toate, mai puțin prima).

Exemplu (prescurtat):

```json
{
  "id": "articoli",
  "order": 1,
  "title": "Articolul hotărât și nehotărât",
  "level": "A1",
  "lesson": [
    { "type": "text", "ro": "În italiană, articolul stă [b]înaintea[/b] substantivului: [it]il libro[/it] = cartea." },
    {
      "type": "table",
      "caption": "Articolul hotărât",
      "head": ["", "singular", "plural"],
      "rows": [["masculin", "il / lo / l'", "i / gli"], ["feminin", "la / l'", "le"]]
    },
    { "type": "examples", "items": [{ "it": "lo studente", "ro": "studentul", "note": "[it]lo[/it] înaintea s + consoană" }] },
    { "type": "trap", "ro": "În română articolul se lipește la final („cartea”); în italiană stă separat, în față." }
  ],
  "rules": ["…"],
  "items": ["…"]
}
```

Notă: `[b]…[/b]` (bold) este singurul alt marcaj permis. Nu se folosește Markdown, ca să nu adăugăm o dependență.

**Validare (zod, în `schema.ts`)**

- `lesson` este obligatoriu, cu 3–20 de blocuri, și conține cel puțin un bloc `examples`.
- `table`: fiecare rând are tot atâtea celule cât `head`.
- Marcajele `[it]`/`[b]` trebuie să fie închise corect (validare la build, cu mesaj clar).
- `rules` și `items` rămân ca acum (1–4 reguli, minim 10 exerciții).

## 4. Temele A1

| # | id                     | Titlu                                   | Notă                         |
|---|------------------------|-----------------------------------------|------------------------------|
| 1 | `articoli`             | Articolul hotărât și nehotărât          | există; se adaugă lecția     |
| 2 | `genere-plurale`       | Genul și pluralul substantivelor        | nou                          |
| 3 | `aggettivi`            | Acordul adjectivului                    | nou                          |
| 4 | `essere`               | Pronumele subiect și *essere*           | există; se adaugă lecția     |
| 5 | `avere`                | *Avere*                                 | există; se adaugă lecția     |
| 6 | `presente-regolare`    | Prezentul verbelor regulate             | nou                          |
| 7 | `presente-irregolare`  | Verbe neregulate frecvente la prezent   | nou                          |
| 8 | `negazione-domande`    | Negația și întrebarea                   | nou                          |
| 9 | `ce-ci-sono`           | *C'è* și *ci sono*                      | nou                          |
|10 | `preposizioni`         | Prepozițiile articulate                 | nou                          |
|11 | `possessivi`           | Posesivele                              | nou                          |
|12 | `piacere`              | *Mi piace* și *mi piacciono*            | nou                          |

Ordinea fișierelor (`order`) se renumerotează după tabel. Id-urile existente nu se schimbă, ca să nu se piardă
progresul.

**Exercițiile** folosesc formatul existent (propoziție + cuvântul ascuns). Pentru temele unde un singur cuvânt ar fi
mereu răspunsul (de exemplu negația cu *non*), exercițiile ascund altă parte a propoziției (cuvântul de întrebare,
verbul), ca jocul să rămână o alegere.

**Corectitudine**: textele italiene noi se scriu în `content/drafts/` și le verifici tu înainte să ajungă în
`content/grammar/`.

## 5. Progresul

**Date locale (Dexie, versiunea 3)**: tabel nou `grammarProgress`, cheie `topicId`:

```ts
interface GrammarProgressRow {
  topicId: string;
  readAt?: number;                              // ms; prima dată când a fost marcată citită
  best: { match?: number; type?: number };      // procente 0–100
  updatedAt: number;
  dirty?: 1;
}
```

**Scorul (procent)**

- Scriere: `corecte / total × 100`.
- Potrivire: `perechi / (perechi + greșeli) × 100`.
- Cărți: fără scor.
- Se salvează la finalul unei sesiuni doar dacă depășește valoarea existentă.

**Sincronizare**

- Colecție nouă pe server: `grammar_progress` (migrație PocketBase nouă, aceleași reguli „doar ale mele” ca celelalte),
  cheia = `topicId`.
- Combinarea local + server este o funcție pură în `src/domain/sync/merge.ts`: `readAt` = cea mai mică valoare
  definită; `best.match` / `best.type` = maximul. Rezultatul nu depinde de ordine, deci nu există conflicte.
  Dacă rezultatul diferă de server, rândul se marchează `dirty` și se retrimite.
- Se adaugă la `PULL_ORDER`, la trimitere și la `deleteAll` (resetare / import cu cont).

**Backup**: exportul JSON include `grammarProgress`; importul îl acceptă și lipsa lui (backup-uri vechi).

## 6. Linkuri din alte ecrane

Toate legăturile stau într-un singur fișier, `src/domain/grammar/links.ts`:

```ts
export const GRAMMAR_LINKS = {
  verbRegular: "presente-regolare",
  verbIrregular: "presente-irregolare",
  tense: { presente: "presente-regolare" } as Partial<Record<Tense, string>>,
} as const;
```

- **Fișa cuvântului** (`WordDetailPage`): doar la verbele **regulate la prezent**, în secțiunea verb, apare un link mic
  „📘 Regula: Prezentul verbelor regulate”. Verbele neregulate la prezent, substantivele și adjectivele nu au link
  (decizie a utilizatorului, după prima versiune).
- **Lista verbelor neregulate la prezent** se generează la build (`presenteIrregular.json`): verbele din
  `irregular.json` care diferă de regulă (nu doar printr-un „i” la scris) plus verbele contrase în -rre.
- **Lecția „Verbe neregulate frecvente la prezent”** are linkul „📖 Vezi și alte verbe neregulate” către Dicționar,
  filtrat pe verbele neregulate la prezent din grupa A (`/browse?irregular=presente&cefr=A`). În Dicționar, filtrul
  apare ca un chip care se poate închide.
- **Conjugare**: pe cartonaș, dacă timpul are lecție în `GRAMMAR_LINKS.tense`, apare link către ea. Pentru verbele
  neregulate la prezent, linkul duce la `presente-irregolare`.
- **Înapoi** din lecție (deschisă dintr-un link) se întoarce în istoric la ecranul de plecare, inclusiv după un joc.
- Validarea conținutului verifică faptul că fiecare id din `GRAMMAR_LINKS` există în `content/grammar/`.

## 7. Testare

- **Unitare (vitest)**: schema lecției (blocuri valide/invalide, marcaje nebalansate, tabel cu rânduri inegale);
  `mergeGrammarProgress` (comutativitate, maxim, cel mai mic `readAt`); calculul procentelor; repository-ul
  (scorul se salvează doar dacă e mai mare); backup export → import cu și fără `grammarProgress`; motorul de
  sincronizare cu `fakeRemote` pentru noua colecție.
- **E2E (Playwright)**: Învață → Gramatică → lecție → „Am citit” → Scriere → la întoarcere apar ✓ și scorul;
  redirecționarea `/learn/games/articoli` → `/learn/grammar/articoli`; link din fișa unui substantiv către lecție și
  înapoi; `games.spec.ts` se actualizează pe noile rute.
- **Accesibilitate**: pagina lecției se adaugă în `a11y.spec.ts` (axe).
- **Conținut**: `npm run validate` trece pentru toate cele 12 teme.

## 8. Livrare (3 PR-uri)

1. **Structura**: secțiunea Gramatică, rute și redirecționări, formatul `lesson`, progres + sincronizare + backup, cele
   3 teme existente cu lecție.
2. **Conținut**: cele 9 lecții A1 noi (verificate de tine în `content/drafts/` înainte de mutare).
3. **Linkuri**: fișa cuvântului și conjugarea.

## 9. În afara acestei specificații

- Lecțiile A2 și B1.
- Repetiție spațiată (FSRS) pentru exercițiile de gramatică.
- Traducerea lecțiilor în italiană pentru interfața italiană.
- Exerciții de tip nou (rămân cele 3 jocuri existente).
