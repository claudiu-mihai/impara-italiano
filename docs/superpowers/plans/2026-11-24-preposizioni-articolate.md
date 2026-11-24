# Plan: „Le preposizioni articolate”: forma și folosirea fiecărei prepoziții

Data: 2026-11-24. Nivel țintă: A1 → B1 (utilizatorul e acum în jur de B1).

**Scop.** O explicație completă a prepozițiilor *di, a, da, in, su, con, per, tra/fra*: cum se contopesc cu articolul,
ce sensuri are fiecare în italiana vorbită de azi, cu nuanțe, exemple și particularități, și cum se împarte totul în
lecții de gramatică pentru aplicație (blocuri de lecție + exemple pentru jocuri).

**Cum e organizat.** Secțiunea 1 e forma. Secțiunea 2 ia prepozițiile pe rând, sens cu sens. Secțiunea 3 adună
contrastele (ce alegi între două prepoziții vecine). Secțiunea 4 strânge particularitățile, adică expresiile care nu
urmează regula „de manual” (inclusiv privitul pe fereastră dinăuntru și din afară). Secțiunea 5 e capcanele pentru un
vorbitor de română. Secțiunile 6–8 sunt ordinea de predare, lecțiile pentru aplicație și pașii de implementare.
Secțiunea 9 e lista punctelor de verificat într-o gramatică de referință.

Regulile clasice rămân baza; particularitățile sunt marcate ca atare, cu registrul (vorbit, scris, regional) acolo
unde contează.

---

## 0. Ce există deja în aplicație

**Lecția 10, `content/grammar/10-preposizioni.json`** (`id: preposizioni`, `order: 10`, A1, titlu „Le preposizioni
articolate” / „Prepozițiile articulate”):

- text: *di, a, da, in, su* se contopesc cu articolul hotărât (*in + il = nel*, *a + la = alla*);
- tabelul complet *di/a/da/in/su* × *il, lo, la, l', i, gli, le*;
- tabelul cu sensul de bază: *di* = de, al (cuiva); *a* = la; *da* = de la, la cineva; *in* = în; *su* = pe;
- text: *con* și *per* nu se contopesc (*con il treno*, *per la mamma*);
- 5 exemple (*Vado al mare*, *Le chiavi sono nel cassetto*, *Vengo dalla stazione*, *Il libro è sul tavolo*,
  *Compro dei pomodori* = niște roșii);
- capcană: orașe cu *a*, țări cu *in*, fără articol; „la doctor” = *dal medico*;
- 4 reguli „De reținut”, 21 de exemple pentru jocuri (`pre-01`…`pre-21`), aproape toate exersează forma
  (*al, sul, nel, dalla…*), plus *a Roma*, *in Italia*, *con*, *per*.

**Alte locuri unde apar prepozițiile:**

- `content/grammar/01-articoli.json` trimite la lecția 10 pentru „niște” (*dei libri*);
- `content/topics/15-pozitia-obiectelor.json` (tema „Poziția obiectelor”, A1): locuțiunile de loc (*davanti a,
  accanto a, dietro, sopra, sotto, tra/fra, di fronte a, in mezzo a*) și diferența *su* / *sopra*. Planul de față nu
  le reia, doar trimite la ele;
- dicționarul are cuvintele-prepoziții (`pre-per`, `pre-in`, `pre-con`, `pre-tra`, `pre-su`…), dar fără legătură spre
  o lecție (`src/domain/grammar/links.ts` leagă azi doar verbele).

**Ce lipsește:** sensurile fiecărei prepoziții dincolo de „la / în / pe”; *da* = „de când”, „de făcut”, „pentru”
(*occhiali da sole*); partitivul explicat (când nu se folosește); timpul (*alle, nel 2020, da tre anni, per due ore,
tra un'ora, tre anni fa*); mijloacele de transport; *con / per / tra* în detaliu; contrastele; nimic peste A1.

**Ce aș corecta în lecția 10** (mic, în același PR cu lecțiile noi):

1. Textul „*con* și *per* nu se contopesc” e prea categoric. Propunere: „În italiana de azi *con* și *per* se scriu
   separat: *con il treno*, *per la mamma*. În vorbire auzi și *col* și *coi* (*col treno*, *coi bambini*); restul
   formelor (*collo, colla, pel, pei…*) sunt vechi.” Plus o propoziție despre *tra/fra*, care nu se contopesc niciodată
   (*tra il bar e la banca*). Regula 2 se schimbă la fel.
2. Exemplul `pre-20` *Vado con il treno.* nu e greșit, dar nu e forma firească: un italian spune *Vado in treno*.
   *Con il treno* apare când trenul e precizat (*con il treno delle otto*). Lecția nouă despre loc predă *in treno*, deci
   exemplul ar contrazice-o. Înlocuire: `{ "it": "Esco con gli amici stasera.", "gap": "con", "ro": "Ies cu prietenii
   diseară.", "note": "con nu se contopește", … }`.
3. Un text scurt cu regula de alegere a formei: aceeași ca a articolului din fața substantivului (*lo zaino → nello
   zaino*, *l'ufficio → dall'ufficio*, *gli amici → degli amici*). Lecția are exemplele, dar nu spune regula.
4. Ultimul bloc poate trimite la lecțiile noi („Sensurile fiecărei prepoziții le găsești în lecțiile 19–26”).

**Ce impune aplicația** (din `src/domain/content/schema.ts`, `scripts/content.ts`, `src/features/grammar/`):

- o lecție are 3–20 blocuri `text`, `table`, `examples`, `trap`, cel puțin un `examples`; 1–4 reguli; minimum 10
  exemple pentru jocuri (o sesiune are 10, deci 15–25 e bine);
- fiecare exemplu: `id`, `it` (propoziția completă), `gap` (cuvântul ascuns), `ro`, opțional `note` + `noteIt` (merg
  împreună). `id`, `it` și `ro` sunt unice în lecție (din cauza jocului „Potrivire”);
- `gap` trebuie să apară **exact o dată, ca un cuvânt întreg**, în `it`, cu majusculele din propoziție (*Sugli*, *Da*);
  formele cu apostrof (*all'*, *dell'*) se lipesc de cuvântul următor și merg;
- jocurile: **Cartonașe** (propoziția cu lacună, întorci și vezi răspunsul, traducerea și nota), **Potrivire** (5
  perechi propoziție italiană ↔ traducere), **Introducere text** (scrii cuvântul lipsă, traducerea română e indiciul;
  corectare strictă, un singur răspuns acceptat; prima rundă la o lecție nouă sau scadentă intră în repetiția FSRS);
- frazele exemplelor au audio pregenerat: `npm run audio:grammar`, apoi `npm run build:data`.

Consecința pentru conținut: la „Introducere text” se acceptă doar `gap`. Exemplele în care două prepoziții sunt la fel
de corecte (*tra/fra*, *a maggio / in maggio*, *uscire di casa / da casa*, *tremare dal freddo / di freddo*) nu sunt
bune ca lacună, decât dacă traducerea sau contextul o exclude pe cealaltă. Vezi și propunerea opțională din secțiunea 8.

---

## 1. Forma

### 1.1 Prepoziție + articol hotărât

| | il | lo | l' | la | i | gli | le |
|---|---|---|---|---|---|---|---|
| **di** | del | dello | dell' | della | dei | degli | delle |
| **a** | al | allo | all' | alla | ai | agli | alle |
| **da** | dal | dallo | dall' | dalla | dai | dagli | dalle |
| **in** | nel | nello | nell' | nella | nei | negli | nelle |
| **su** | sul | sullo | sull' | sulla | sui | sugli | sulle |

**Regula:** forma prepoziției articulate e dată de articolul pe care l-ar avea substantivul singur. Întâi alegi
articolul, apoi lipești prepoziția:

- *il treno* → *sul treno*; *il bar* → *al bar*;
- *lo zaino, lo stadio, lo zucchero, lo psicologo, lo yogurt* → *nello zaino, allo stadio, dello zucchero, dallo
  psicologo, nello yogurt*;
- *l'ufficio, l'amica, l'acqua* → *dall'ufficio, dell'amica, nell'acqua*;
- *la stazione* → *alla stazione*;
- *i libri* → *dei libri*; *gli amici, gli zii, gli studenti* → *degli amici, agli zii, sugli studenti*;
- *le amiche, le otto* → *delle amiche, alle otto*.

Observații:

- *In* își schimbă forma: *ne-* (*nel, nella…*). *Di* devine *de-* (*del, della…*).
- La plural feminin înainte de vocală se scrie întreg: *delle amiche*, *alle undici*. Formele *dell'amiche*, *gl'italiani*
  sunt vechi.
- Articolul hotărât face parte din unele nume de orașe, așa că se contopește și el: *Il Cairo → al Cairo*, *L'Aquila →
  all'Aquila*, *La Spezia → alla Spezia* (se aude și *a La Spezia*, vezi secțiunea 9).
- Fără legătură cu articolul, dar apar alături: *di* simplu se elidează des înainte de vocală (*d'estate, un bicchiere
  d'acqua, d'accordo*); *a* primește un *-d* eufonic mai ales înainte de *a-* (*ad Anna, ad Arezzo, ad andare*).

### 1.2 *Con*

- **col** (*con + il*) și **coi** (*con + i*): există și se folosesc, mai ales în vorbire și în scrisul informal: *Vado
  col treno delle otto*, *Esco coi bambini*. Sunt corecte, dar opționale: *con il, con i* e la fel de bun și e forma
  recomandată în scris.
- **collo, colla, coll', cogli, colle**: vechi sau literare. Nu le folosi (*colla* azi înseamnă „lipici”).
- **Ce folosești:** scrii *con il / con lo / con la / con l' / con i / con gli / con le*; în vorbire poți spune *col* și
  *coi*.

### 1.3 *Per*

- **pel, pei** (*per + il, per + i*), **pello, pella** etc.: arhaice, literare sau poetice, se găsesc doar în texte vechi.
  Azi: *per il, per la, per i…* (*per il compleanno*, *per i bambini*).

### 1.4 *Tra / fra*

- **Nu se contopesc niciodată:** *tra il bar e la banca*, *fra le otto e le nove*, *tra gli amici*.
- *Tra* și *fra* înseamnă exact același lucru. Alegerea ține de sunet: se evită *tra tr-* și *fra fr-*
  (*fra tre giorni*, *tra fratelli*). În rest, după preferință.
- Cu pronume personal se poate pune *di*: *tra noi* sau *tra di noi*.

### 1.5 Alte prepoziții

- *su* + pronume personal cere *di*: *su di me, su di te, su di lui* (*Conto su di te*).
- *sopra, sotto, dentro, dietro, davanti* nu sunt prepoziții simple și nu se contopesc: *sopra il tavolo*, *dentro la
  borsa*, *davanti alla scuola* (aici *alla* vine de la *a* din locuțiunea *davanti a*). Le tratează tema „Poziția
  obiectelor”.

### 1.6 Când rămâne prepoziția simplă

Principiul: prepoziția se articulează exact atunci când substantivul ar avea articol hotărât. Prepoziția rămâne simplă
când substantivul nu are articol:

- **nume de persoane și de orașe:** *di Marco, a Roma, da Luca, a Milano*;
- **țări, regiuni, continente după *in*:** *in Italia, in Toscana, in Europa*, dar cu articol după *di* și *da*:
  *dall'Italia, la capitale della Romania* (vezi 2.4);
- **posesiv + rudă la singular, fără alt adjectiv:** *a mia madre, di tuo fratello, da mia nonna*; dar *ai miei genitori*
  (plural), *alla mia sorellina* (diminutiv), *alla loro madre* (*loro* cere mereu articol). Cu *mamma* și *papà*
  articolul fluctuează (*a mia mamma / alla mia mamma*);
- **pronume:** *a me, da te, con lui, per noi*;
- **expresii fixe** (generice, „tipul” de loc sau de mijloc): *a casa, a scuola, a letto, a teatro, in ufficio, in banca,
  in centro, in montagna, in treno, in macchina, a piedi, di mattina, d'estate, in estate, a mezzogiorno, di solito,
  in ritardo*.

Excepția excepției: când expresia fixă e **precizată**, articolul revine: *in macchina*, dar *nella macchina di Marco*;
*in ufficio*, dar *nell'ufficio del direttore*; *in Italia*, dar *nell'Italia del Nord*; *a scuola*, dar *alla scuola di
mia figlia*; *a Roma*, dar *nella Roma degli anni Sessanta*.

---

## 2. Prepozițiile pe rând

Pentru fiecare sens: când și cum, nuanța față de prepozițiile vecine, exemple (italiană, apoi română) și când rămâne
fără articol. Nivelul estimat (A1/A2/B1) e în paranteză.

### 2.1 DI

**1. Posesie, apartenență: „al cui?” (A1).** Corespunde genitivului românesc (*-ului, -ei, al/a/ai/ale*). Se articulează
cu substantivele comune; rămâne simplă cu nume, pronume și posesiv + rudă la singular.

- *La macchina di Marco è rossa.* Mașina lui Marco e roșie.
- *Il cane dei vicini abbaia tutta la notte.* Câinele vecinilor latră toată noaptea.
- *Dove sono le chiavi della macchina?* Unde sunt cheile de la mașină? (românescul „de la” e aici posesie: *della*,
  nu *dalla*)

**2. Originea, orașul de unde ești: *essere di* (A1).**

- *Sono di Cluj. E tu, di dove sei?* Sunt din Cluj. Tu de unde ești?
- *Mia moglie è di qui.* Soția mea e de aici.

Nuanță: *essere di* merge doar cu orașe (și *qui, lì*). Pentru țară folosești adjectivul sau *venire da* cu articol: *Sono
rumeno*, *Vengo dalla Romania*, nu *Sono di Romania*. *Vengo da Cluj* spune tot originea, dar poate însemna și „vin
acum de la Cluj” (vezi 3.2).

**3. Material (A2).** Simplă, fără articol.

- *Ho comprato una sciarpa di lana.* Mi-am cumpărat un fular de lână.
- *È un anello d'oro.* E un inel de aur.

Nuanță: în magazine și reclame apare des *in*: *borsa in pelle, tavolo in legno*. În vorbire, *di* e mai obișnuit.

**4. Conținut și cantitate (A1).** Simplă: *un bicchiere di vino, un chilo di mele, un po' di zucchero, una bottiglia
d'acqua*.

- *Prendo una bottiglia di acqua frizzante.* Iau o sticlă de apă minerală carbogazoasă.
- *Mi dai un po' di latte?* Îmi dai puțin lapte?

Nuanță față de *da*: *una tazza di tè* (ceașcă plină cu ceai) / *una tazza da tè* (ceașca pentru ceai, vasul); *un
bicchiere di vino* / *un bicchiere da vino*.

**5. Subiect, domeniu, categorie (A1–A2).** *Parlare di*, *un libro di storia*, *il corso d'italiano*, *la professoressa
di matematica*.

- *Di cosa parlate?* Despre ce vorbiți?
- *Parliamo delle vacanze.* Vorbim despre vacanță.
- *È un libro di cucina.* E o carte de bucate.

Nuanță față de *su*: *di* = genul, categoria (*un libro di storia*); *su* = tema precisă (*un libro sulla storia di
Roma*), vezi 2.5.

**6. Momentul zilei, anotimpul, ziua, cu sens de „de obicei” (A1).** Simplă: *di mattina, di pomeriggio, di sera, di
notte, di giorno, d'estate, d'inverno, di domenica*.

- *Di sera esco poco.* Seara ies rar.
- *D'estate andiamo sempre al mare.* Vara mergem mereu la mare.
- *Di domenica dormo fino a tardi.* Duminica dorm până târziu.

Nuanță: se poate spune și cu articol, fără prepoziție: *la sera esco poco*, *la domenica dormo fino a tardi*; sensul e
același. *In estate* = *d'estate*.

**7. Comparația: *più / meno … di* (A2).** *Di* se articulează înaintea substantivelor comune.

- *Roma è più grande di Milano.* Roma e mai mare decât Milano.
- *Il treno è più comodo dell'autobus.* Trenul e mai comod decât autobuzul.
- *Mia sorella è più giovane di me.* Sora mea e mai tânără decât mine.

Nuanță: se folosește *che* în loc de *di* când compari două adjective, două verbe sau două complemente cu prepoziție:
*più bello che utile*, *meglio tardi che mai*, *più a Roma che a Milano*. La B1 ajunge regula simplă; detaliile țin de o
lecție despre comparație.

**8. Partitivul: *del pane, dei biscotti* = „niște, puțin” (A1–A2).** Nu are echivalent în română.

- La singular, cu substantive nenumărabile: „puțin, o cantitate”: *Vuoi del caffè?* Vrei niște cafea? / *Ho comprato
  della frutta.* Am cumpărat niște fructe.
- La plural: „niște, câțiva”: *Ho conosciuto delle ragazze simpatiche.* Am cunoscut niște fete simpatice. / *Abbiamo
  invitato degli amici.* Am invitat niște prieteni.

Când **nu** se pune partitivul:

- în propoziții negative: *Non ho amici qui*, nu *Non ho degli amici qui* (ultima e posibilă, dar marcată);
- în enumerări și cu sens general: *Compro pane e latte*, *Hai fratelli?*;
- de preferat după altă prepoziție: *con alcuni amici* sau *con amici* sună mai bine decât *con degli amici* (care se
  aude totuși în vorbire, vezi secțiunea 9).

Alternative frecvente: *un po' di* (sg.: *un po' di pane*), *qualche* + singular (*qualche amico* = niște prieteni),
*alcuni / alcune* (*alcune domande*).

**9. *Di* + infinitiv, după verbe, adjective și substantive (A2–B1).** Echivalentul lui „să” sau „de a”.

- verbe: *cercare di, finire di, smettere di, decidere di, pensare di, sperare di, dimenticare di, credere di*;
- adjective: *contento di, stanco di, sicuro di*;
- substantive: *avere voglia di, avere paura di, avere bisogno di, è ora di*.
- *Ho deciso di cambiare lavoro.* Am hotărât să-mi schimb serviciul.
- *Sono stanco di aspettare.* M-am săturat să aștept.
- *È ora di andare.* E timpul să plecăm.

Nuanță: *pensare di* + infinitiv = „a avea de gând” (*Penso di partire domani*); *pensare a* = „a se gândi la” (*Penso
a te*). *Cercare di* și *provare a* înseamnă amândouă „a încerca să”, dar cer prepoziții diferite.

**10. *Qualcosa / niente / che cosa* + *di* + adjectiv (A2).**

- *C'è qualcosa di buono da mangiare?* E ceva bun de mâncare?
- *Niente di grave.* Nimic grav.
- *Cosa c'è di nuovo?* Ce mai e nou?

Nuanță: *qualcosa di* + adjectiv, dar *qualcosa da* + infinitiv (*qualcosa da bere*).

**11. Vârstă, măsură, durată ca însușire (A2).** Simplă: *un bambino di tre anni, una gita di due giorni, un
appartamento di 80 metri quadri*.

- *Ho un figlio di sei anni.* Am un fiu de șase ani.

Nuanță față de *da*: *da* pentru valoarea unui obiect (*una banconota da 20 euro*), *di* pentru măsură și vârstă.

**12. Expresii fixe cu *di*, fără articol:** *di solito, di nuovo, di sicuro, di corsa, di fretta, d'accordo, di sopra*
(„sus, la etaj”), *di sotto, di qua, di là* („în cealaltă cameră”), *dire di sì / di no, credo di sì, uscire di casa*
(se aude și *da casa*), *morire di fame / di sete*.

### 2.2 A

**1. Loc, cu verbe de stare și de mișcare (A1).** *A* răspunde și la „unde ești?”, și la „unde mergi?”.

- orașe și insule mici, fără articol: *Abito a Torino*, *Vado a Capri*, *Vivono a Malta*;
- fără articol: *a casa, a scuola, a letto, a teatro, a tavola, a messa*;
- cu articol: *al cinema, al bar, al ristorante, al mare, al lago, al parco, al supermercato, al mercato, alla stazione,
  all'aeroporto, all'università, al lavoro*.
- *Stasera andiamo al cinema.* Diseară mergem la cinema.
- *Ci vediamo alla stazione alle otto.* Ne vedem la gară la opt.
- *Sono a casa, vieni pure.* Sunt acasă, vino liniștit.

Nuanțe: *in* pentru țări, regiuni și multe „tipuri de clădire” (*in banca, in ufficio*), *da* pentru persoane (*dal
medico*), vezi 3.1. *A teatro* fără articol, dar *al cinema*: nu e o regulă, se învață ca atare. *Vado al lavoro* e forma
standard; *vado a lavoro* se aude mult, dar e considerată neîngrijită (vezi secțiunea 9). Posesivul după substantiv:
*a casa mia, a casa tua*.

**2. Destinatarul („cui?”, dativul) (A1).** După *dare, dire, scrivere, mandare, regalare, telefonare, chiedere,
rispondere, piacere, insegnare*.

- *Ho detto tutto a Luca.* I-am spus totul lui Luca.
- *Rispondo al professore.* Îi răspund profesorului.
- *Telefono alla nonna ogni domenica.* O sun pe bunica în fiecare duminică.

Nuanță: unele verbe care în română cer acuzativul („o sun pe”, „o întreb pe”) cer *a* în italiană: *telefonare a,
chiedere a*. Invers, *aiutare, chiamare, aspettare, ascoltare* nu cer prepoziție: *aiuto Marco, chiamo Marco, aspetto
Anna*.

**3. Timp: ora, sărbători, luni, vârstă (A1–A2).**

- ora: *alle otto, alle otto e mezza, all'una, a mezzogiorno, a mezzanotte* (fără articol la ultimele două);
- sărbători: *a Natale, a Pasqua, a Capodanno*;
- luni: *a maggio* sau *in maggio* (amândouă corecte; *a* e mai frecvent în vorbire);
- vârstă: *a vent'anni* („la douăzeci de ani”);
- salutări: *a domani, a presto, a dopo, a lunedì*;
- mese: *a pranzo, a cena, a colazione*.
- *Il film comincia alle nove.* Filmul începe la nouă.
- *A Natale torno in Romania.* De Crăciun mă întorc în România.
- *A diciotto anni ho preso la patente.* La optsprezece ani mi-am luat permisul.

**4. Mod, stil, rețetă (A2).** *A piedi, a mano, a memoria, a voce alta, a caso, a poco a poco*; *alla* + adjectiv =
„în stilul”: *spaghetti alla carbonara, pollo alla griglia, risotto alla milanese*; modele: *a righe, a quadri, a fiori,
a pois*.

- *Andiamo a piedi?* Mergem pe jos?
- *Paghiamo alla romana.* Plătim fiecare partea lui.
- *Mi piace quella camicia a righe.* Îmi place cămașa aia în dungi.

Nuanță: *pizza ai funghi, gelato al cioccolato, spaghetti al pomodoro* (a + articol pentru ingredientul care dă numele
felului) față de *un panino con il prosciutto* (*con*: ce adaugi); de multe ori merg amândouă (*panino al prosciutto*).

**5. Cum funcționează un obiect (A2–B1).** *Una stufa a gas, una barca a vela, un giocattolo a pile, fatto a mano*.

- *Abbiamo il riscaldamento a gas.* Avem încălzire pe gaz.

**6. Frecvență, preț, viteză pe unitate: românescul „pe” (A2).** *Una volta al giorno, due volte alla settimana, tre
euro al chilo, 130 all'ora, mille euro al mese*.

- *Vado in palestra tre volte alla settimana.* Merg la sală de trei ori pe săptămână.
- *Le pesche costano due euro al chilo.* Piersicile costă doi euro kilogramul.

**7. Distanță (A2).** *A* + distanța, *da* + punctul de reper: *a due passi, a dieci chilometri da Roma, a cinque minuti
da qui*.

- *Il mare è a due chilometri.* Marea e la doi kilometri.
- *Abito a dieci minuti dal centro.* Locuiesc la zece minute de centru.

**8. *A* + infinitiv (A2–B1).**

- după verbe de mișcare (scopul): *andare a, venire a, uscire a, passare a*: *Vado a fare la spesa* (mă duc să fac
  cumpărături), *Vieni a trovarmi* (vino să mă vezi);
- după *cominciare a, iniziare a, continuare a, mettersi a, imparare a, insegnare a, riuscire a, aiutare a, provare a*.
- *Hai provato a chiamarlo?* Ai încercat să-l suni?
- *Mi aiuti a portare le borse?* Mă ajuți să duc sacoșele?

**9. Expresii fixe:** *a destra, a sinistra, al sole, all'ombra, all'aperto, al buio, al freddo, al telefono, alla radio,
alla TV* (și *in TV*), *a proposito, a posto, a lungo, al massimo*. Verbe: *pensare a, credere a* (cuiva, la ceva:
*credere ai fantasmi*), *abituarsi a, partecipare a, giocare a* + sport sau joc, fără articol (*giocare a calcio, a carte,
a scacchi*), *essere bravo a* + infinitiv (dar *bravo in matematica*).

### 2.3 DA

**1. Punctul de plecare, proveniența: „de la, din” (A1).** Se articulează cu substantive comune și cu **țări**; rămâne
simplă cu orașe și nume.

- *Torno dal lavoro alle sei.* Mă întorc de la serviciu la șase.
- *A che ora esci dall'ufficio?* La ce oră ieși de la birou?
- *Vengo dalla Romania, da Iași.* Vin din România, din Iași.

Nuanță față de *di* (vezi 3.2): *Sono di Iași* (de acolo sunt), *Vengo da Iași* (de acolo vin). Țara: *in Romania*
fără articol, dar *dalla Romania* cu articol.

**2. „La cineva”, cu stare și cu mișcare (A1).** *Da* + persoană înseamnă „la (casa, cabinetul, magazinul) cuiva”.

- *Stasera vado da Marco.* Diseară merg la Marco.
- *Devo andare dal dentista.* Trebuie să merg la dentist.
- *Domenica mangiamo dai miei.* Duminică mâncăm la ai mei (la părinți).
- *Vieni da me?* Vii la mine?

Particularități: *da noi* = „la noi” (acasă, în țară, la firmă): *Da noi si cena alle sei* (la noi se cinează la șase).
*Da Gino* = restaurantul lui Gino. Același loc are prepoziții diferite după cuvânt: *dal fornaio* (persoana), *in
panetteria* (magazinul în *-ia*). Simplă cu nume, pronume și posesiv + rudă: *da Anna, da te, da mia zia*; cu articol:
*dalla zia, dai nonni*.

**3. Punctul de trecere: „pe, prin” (A2–B1).** Ușa, fereastra, orașul prin care treci.

- *Sono entrati dalla finestra.* Au intrat pe fereastră.
- *Esci dalla porta sul retro.* Ieși pe ușa din spate.
- *Passo da te dopo il lavoro.* Trec pe la tine după serviciu.
- *Il treno passa da Bologna.* Trenul trece prin Bologna (și *per Bologna*).

Pentru privitul pe fereastră dinăuntru și din afară, vezi secțiunea 4.1.

**4. Timp: „de (când)”, „din”, „de la … la” (A2).** Acțiunea a început în trecut și **continuă**: verbul stă la
**prezent** (la trecut, imperfetto).

- *Studio l'italiano da due anni.* Învăț italiana de doi ani.
- *Ti aspetto da un'ora!* Te aștept de o oră!
- *Da lunedì comincio la dieta.* De luni încep dieta.
- *Il negozio è aperto dalle nove alle sette.* Magazinul e deschis de la nouă la șapte.
- *Da bambino abitavo in campagna.* Când eram copil locuiam la țară. (*da piccolo, da giovane*; *da grande* = când
  voi fi mare)

Nuanțe față de *per* și *fa*, vezi 3.3.

**5. Destinația, funcția obiectului: „de, pentru” (A2).** *Occhiali da sole, scarpe da ginnastica, costume da bagno,
camera da letto, sala da pranzo, tazza da tè, abito da sera, cane da caccia*.

- *Ho perso gli occhiali da sole.* Mi-am pierdut ochelarii de soare.
- *Mi serve una tazza da tè, non un bicchiere.* Am nevoie de o ceașcă de ceai, nu de un pahar.

**6. *Da* + infinitiv: „de făcut” (A2–B1).** După *molto, tanto, poco, niente, qualcosa, una cosa*, sau după un
substantiv, cu sens de necesitate sau posibilitate.

- *Ho tante cose da fare oggi.* Am multe de făcut azi.
- *C'è qualcosa da bere?* E ceva de băut?
- *È un film da vedere.* E un film de văzut.

Particularitate: *in vendita* („de vânzare”, *casa in vendita*) e expresia obișnuită pe anunțuri. *Da vendere* apare în
*Ho energia da vendere* (am energie cu carul).

**7. Agentul la pasiv: „de (către)” (B1).**

- *La cena è stata preparata da mio padre.* Cina a fost pregătită de tatăl meu.
- *Siamo stati invitati dai vicini.* Am fost invitați de vecini.

**8. Cauza, mai ales stări fizice și emoții (B1).** Cu articol: *tremare dal freddo, morire dal ridere, saltare dalla
gioia*.

- *Morivo dal ridere.* Muream de râs.
- *Tremava dal freddo.* Tremura de frig.

Particularitate: unele expresii fixe merg cu *di* fără articol: *morire di fame, di sete*; altele cu *da*: *morire dal
ridere, dalla voglia di…*. La unele merg amândouă (*tremare di freddo / dal freddo*). Se învață ca expresii.

**9. Valoarea, prețul unui obiect (A2).** *Una banconota da 50 euro, un francobollo da un euro, una moneta da due euro*.

- *Hai una moneta da un euro?* Ai o monedă de un euro?

**10. „Ca, în calitate de”; „singur” (B1).** *Comportarsi da amico, fare da guida, fare da interprete, da solo / da sola*.

- *Ti parlo da amico.* Îți vorbesc ca prieten.
- *Ha fatto da interprete.* A făcut pe interpretul. / A fost interpret.
- *Ho fatto tutto da sola.* Am făcut totul singură.

**11. Însușiri fizice (registru mai degrabă scris) (B1).** *La ragazza dagli occhi verdi*. În vorbire se spune mai des
*la ragazza con gli occhi verdi*.

**12. Separare, depărtare, dependență (A2–B1).** *Lontano da, diverso da, fuori da, dipendere da*.

- *Dipende da te.* Depinde de tine.
- *Abito lontano dal centro.* Locuiesc departe de centru.

### 2.4 IN

**1. Țări, regiuni, continente, insule mari (A1).** Stare și mișcare, fără articol: *in Italia, in Toscana, in Europa,
in Sicilia, in Sardegna*. Cu articol:

- țări și regiuni cu nume la plural: *negli Stati Uniti, nei Paesi Bassi, nelle Marche*;
- când sunt precizate: *nell'Italia del Nord, nella Romania degli anni Novanta*;
- unele regiuni masculine: *nel Lazio* (aproape mereu), *in Veneto / nel Veneto*, *in Piemonte / nel Piemonte*
  (fluctuează, vezi secțiunea 9).
- *Mia sorella vive in Spagna.* Sora mea locuiește în Spania.
- *Mio cugino lavora negli Stati Uniti.* Vărul meu lucrează în Statele Unite.

**2. Încăperi, clădiri, tipuri de loc, fără articol (A1–A2).** *In cucina, in bagno, in camera, in salotto, in
giardino, in ufficio, in banca, in farmacia, in biblioteca, in palestra, in piscina, in chiesa, in ospedale, in centro,
in città, in periferia, in montagna, in campagna, in vacanza, in piazza, in via…*

- *Mia madre lavora in banca.* Mama lucrează la bancă.
- *D'estate andiamo in montagna.* Vara mergem la munte.
- *Abito in via Garibaldi.* Locuiesc pe strada Garibaldi.

Tendință, nu regulă: magazinele în *-ia* și *-teca* merg cu *in* (*in pizzeria, in libreria, in gelateria, in
biblioteca, in discoteca*), dar *al bar, al supermercato, al mercato*. Străzi și piețe: *in via Roma, in piazza
Navona, in corso Italia*, fără articol (românescul „pe strada”).

**3. Interior, înăuntrul unui lucru anume, cu articol (A1).**

- *Il latte è nel frigo.* Laptele e în frigider.
- *Hai guardato nella borsa?* Te-ai uitat în geantă?

Nuanță: fără articol = locul generic (*in ufficio* = la birou, la serviciu); cu articol = un loc anume (*nell'ufficio del
capo*). La fel *in camera* (în camera mea) / *nella camera degli ospiti*.

**4. Mijloc de transport, fără articol (A1).** *In treno, in macchina, in autobus, in aereo, in bici, in metro, in taxi,
in moto, in traghetto*. Excepții: *a piedi, a cavallo*.

- *Vado a scuola in autobus.* Merg la școală cu autobuzul.
- *Andiamo in macchina o in treno?* Mergem cu mașina sau cu trenul?

Nuanțe: transportul precizat cere *con* + articol: *con la macchina di mio padre, con il treno delle otto* (în vorbire
*col treno*). *Prendere*: *prendo il treno*. Urcatul: *salire in macchina*, dar *salire sul treno / sull'autobus*.
Cine e fizic în vehicul spune *sono in treno* („sunt în tren, călătoresc”); un obiect uitat: *l'ho lasciato sul treno*
(și *in treno*).

**5. Timp (A1–A2).**

- anotimpuri: *in estate, in inverno* (= *d'estate, d'inverno*);
- luni: *in maggio* (= *a maggio*);
- ani și secole, **cu articol**: *nel 2024, negli anni Ottanta, nel Novecento*;
- perioade: *in settimana* (în cursul săptămânii), *nel weekend, in passato, in futuro, in questo momento*;
- timpul necesar pentru a face ceva: *in due ore, in cinque minuti*.
- *Sono nato nel 1990.* M-am născut în 1990.
- *Ho finito il lavoro in due ore.* Am terminat treaba în două ore.

Nuanță: *in un'ora* = „în (decurs de) o oră”; *tra un'ora* = „peste o oră” (vezi 3.3).

**6. Mod, stare, situație, fără articol (A2–B1).** *In silenzio, in fretta, in piedi, in ritardo, in anticipo, in
orario, in pensione, in vacanza, in forma, in ordine, in contanti, in regalo, in affitto, in vendita, in prestito, in
italiano*.

- *Scusa, sono in ritardo.* Scuze, am întârziat.
- *Posso pagare in contanti?* Pot plăti cash?
- *Vivo in affitto.* Stau cu chirie.

**7. Câte persoane sunt (B1).** *Essere in* + număr.

- *Siamo in quattro stasera.* Diseară suntem patru.

**8. Transformare, domeniu (B1).** *Tradurre in, cambiare in, laurea in medicina, esperto in, bravo in, credere in,
sperare in*.

- *Ho una laurea in economia.* Am o diplomă în economie.
- *Credo in te.* Cred în tine.

### 2.5 SU

**1. „Pe”, cu contact, pe o suprafață (A1).** *Sul tavolo, sulla sedia, sul muro, sul divano, sul letto, sulla
spiaggia*.

- *Il libro è sul tavolo.* Cartea e pe masă.
- *C'è un ragno sul muro!* E un păianjen pe perete!

Nuanțe: *su* / *sopra*: vezi tema „Poziția obiectelor” (*sopra* = și „deasupra”, fără contact). *A letto* („în pat,
la culcare”) / *sul letto* („pe pat”) / *nel letto* („în pat, sub pătură”). *Per terra* = „pe jos” (*È caduto per
terra*), nu *sul pavimento* în vorbirea curentă.

**2. Urcatul în mijloace mari de transport (A2).** *Salire sul treno, sull'autobus, sull'aereo*; *essere sul treno*
(fizic, în tren).

- *Sali sull'autobus 64.* Urcă în autobuzul 64.

Nuanță: mașina e *in*: *salire in macchina*.

**3. Surse și media: ziar, internet, rețele (A1–A2).** *Sul giornale, su internet, sul sito, su Instagram, su WhatsApp,
sul telefono* („pe telefon”, ce e salvat în el), *sulla mappa*.

- *L'ho letto sul giornale.* Am citit în ziar.
- *Ho trovato la ricetta su internet.* Am găsit rețeta pe internet.

Nuanță: televizorul și radioul merg altfel: *in TV / alla TV, alla radio, al telefono* („la telefon”, când vorbești).

**4. Tema precisă: „despre” (A2–B1).** *Un libro sulla Sicilia, un documentario sugli squali, una domanda sull'esame,
informazioni sul corso*.

- *Ho visto un documentario sugli squali.* Am văzut un documentar despre rechini.
- *Hai informazioni sull'orario?* Ai informații despre orar?

Nuanță: *di* pentru categorie și după *parlare* (*un libro di storia*, *parliamo del film*); *su* pentru subiectul
precis al unei cărți, al unui film sau al unei discuții (*un film sulla guerra*).

**5. Aproximare: vârstă, preț, cantitate, greutate: „în jur de” (B1).** *Sui trent'anni, sui 50 euro, sui due chili,
sulla sessantina*.

- *Avrà sui quarant'anni.* Cred că are în jur de patruzeci de ani.
- *Costa sui venti euro.* Costă în jur de douăzeci de euro.

Nuanță: pentru oră se spune de obicei *verso le otto* (pe la opt); *sulle otto* se aude în vorbire, dar e mai puțin
sigur (vezi secțiunea 9). Alternative neutre: *circa, più o meno, intorno a*.

**6. Proporție: „din” (A2).** *Su* simplu: *nove su dieci, uno su tre, trenta su trenta*.

- *Nove persone su dieci preferiscono il mare.* Nouă oameni din zece preferă marea.

**7. Direcție, vedere spre (B1).** *La finestra dà sul cortile*, *una camera con vista sul mare*.

- *La mia camera dà sul giardino.* Camera mea dă spre grădină.

**8. *Su di* + pronume; *contare su* (B1).**

- *Posso contare su di te?* Mă pot baza pe tine?

**9. Expresii fixe:** *sul serio, su misura, su richiesta, su appuntamento, sul momento, su e giù, sulla destra* (pe
partea dreaptă), *essere sul punto di* (a fi pe punctul de a), *una casa sul mare / sul lago* (pe malul mării, al
lacului).

### 2.6 CON

**1. Companie (A1).** *Con gli amici, con mia moglie, con te* (= *insieme a*).

- *Esco con gli amici stasera.* Ies cu prietenii diseară.
- *Vivo con due coinquilini.* Locuiesc cu doi colegi de apartament.

**2. Instrument, mijloc (A1–A2).** *Con la forchetta, con il coltello, con la carta*; mijloc de transport precizat.

- *Posso pagare con la carta?* Pot plăti cu cardul?
- *Vengo con la macchina di mio padre.* Vin cu mașina tatălui meu.

Nuanță: *pagare con la carta*, dar *in contanti*; *in treno* (generic), dar *con il treno delle otto*.

**3. Mod, fără articol (A2).** *Con calma, con piacere, con attenzione, con pazienza*.

- *Fallo con calma, non c'è fretta.* Fă-o liniștit, nu e nicio grabă.

**4. Însușire, ce are cineva sau ceva (A1–A2).** *La ragazza con gli occhiali, una camera con bagno, un panino con il
prosciutto*.

- *Chi è la ragazza con gli occhiali?* Cine e fata cu ochelari?

**5. Relație, atitudine (A2–B1).** *Arrabbiato con, gentile con, sposato con, parlare con, litigare con*.

- *Sei arrabbiato con me?* Ești supărat pe mine?

**6. Circumstanță, cauză (B1).** *Con questo caldo, con questo traffico, con la pioggia*.

- *Con questo caldo non si dorme.* Cu căldura asta nu se poate dormi.

Forma: vezi 1.2 (*col, coi* în vorbire, restul vechi).

### 2.7 PER

**1. Scop, beneficiar: „pentru”, „ca să” (A1).** *Per te, per lavoro, per + infinitiv*.

- *Questo regalo è per te.* Cadoul ăsta e pentru tine.
- *Sono a Milano per lavoro.* Sunt la Milano cu serviciul.
- *Studio molto per passare l'esame.* Învăț mult ca să iau examenul.

**2. Destinația, cu *partire*, tren, zbor, bilet (A2).** *Parto per Roma, il treno per Firenze, un biglietto per Napoli*.

- *Domani parto per Londra.* Mâine plec la Londra.

Nuanță: *andare a Roma*, dar *partire per Roma*. *Andare per Roma* înseamnă „a umbla prin Roma”.

**3. Spațiu străbătut: „prin, pe” (A2).** *Passare per il centro, fare un giro per la città, per strada, andare per
negozi* (a merge prin magazine).

- *Facciamo un giro per il centro?* Facem o tură prin centru?
- *L'ho incontrato per strada.* L-am întâlnit pe stradă.

**4. Durată încheiată: „timp de” (A2).** De multe ori se omite.

- *Ho vissuto a Roma per due anni.* Am locuit la Roma timp de doi ani. (și *Ho vissuto a Roma due anni.*)
- *Ha piovuto per tutta la notte.* A plouat toată noaptea.

Nuanță față de *da*, vezi 3.3.

**5. Termen: „pentru, până”, cu un moment (A2).** *Per domani, per lunedì, per Natale*.

- *Mi serve per domani.* Îmi trebuie pentru mâine.

**6. Cauza: „din cauza”, „pentru” (A2–B1).** *Per il traffico, per la pioggia, grazie per, scusa per, per fortuna, per
caso, per colpa di*.

- *Siamo arrivati tardi per il traffico.* Am ajuns târziu din cauza traficului.
- *Grazie per l'aiuto.* Mulțumesc pentru ajutor.

**7. Mijloc de comunicare (A2).** *Per email, per telefono, per posta*.

- *Ti mando il file per email.* Îți trimit fișierul pe email.

**8. Opinie: „după mine” (A2).** *Per me, per noi* (= *secondo me*).

- *Per me ha ragione lei.* După mine, ea are dreptate.

**9. Distribuție, înmulțire, procent (A2).** *Uno per volta, uno per uno, due per tre, il dieci per cento, un tavolo per
due*.

- *Entrate uno per volta.* Intrați câte unul.

**10. *Stare per* + infinitiv: „a fi pe punctul de a” (B1).**

- *Sto per uscire, ti richiamo.* Tocmai ies, te sun eu înapoi.

### 2.8 TRA / FRA

**1. Spațiu: „între” (A1).**

- *La farmacia è tra la banca e il bar.* Farmacia e între bancă și bar.

**2. Timp viitor: „peste” (A1–A2).** *Tra dieci minuti, fra una settimana, tra poco*. Și „între” două momente: *tra
le otto e le nove*.

- *Il treno arriva tra dieci minuti.* Trenul vine peste zece minute.

**3. Distanță până la un punct, pe drum: „peste” (A2).**

- *Tra 200 metri girate a destra.* Peste 200 de metri faceți la dreapta. (formula GPS-ului)

**4. Între, printre (un grup, o relație) (A2–B1).** *Tra amici, tra colleghi, tra di noi, il migliore tra tutti, tra
l'altro* (printre altele).

- *Detto tra noi, non mi convince.* Între noi fie vorba, nu mă convinge.

Forma: vezi 1.4 (nu se contopesc; *tra* = *fra*).

---

## 3. Contraste: ce alegi între prepoziții vecine

### 3.1 Loc: *a*, *in* sau *da*?

| Ce urmează | Prepoziția | Exemple |
|---|---|---|
| oraș, insulă mică | *a* (fără articol) | *a Roma, a Capri* |
| țară, regiune, continent, insulă mare | *in* (fără articol) | *in Francia, in Toscana, in Sicilia* |
| țară cu nume la plural sau precizată | *in* + articol | *negli Stati Uniti, nell'Italia del Sud* |
| persoană (nume, meserie, pronume) | *da* | *da Marco, dal medico, da me* |
| încăpere, clădire, „tip” de loc | de obicei *in* | *in cucina, in banca, in ufficio, in farmacia* |
| locuri de memorat cu *a* | *a* / *al* | *a casa, a scuola, a teatro; al bar, al cinema, al mare, alla stazione* |
| stradă, piață | *in* (fără articol) | *in via Dante, in piazza* |

Plecarea: *da* + articol pentru țări și locuri (*dalla Francia, dall'ufficio*), fără articol pentru orașe (*da Parigi*).

### 3.2 Originea: *di* sau *da*?

- *Sono di Napoli.* Sunt din Napoli. (orașul tău; doar *essere di* + oraș)
- *Vengo da Napoli.* Vin din Napoli. (originea sau drumul de acum)
- *Vengo dalla Romania.* Vin din România. (țara: *da* + articol; nu *sono di Romania*)
- *Esco di casa / da casa.* Plec de acasă. (ambele; *di casa* e expresia tradițională)

### 3.3 Timpul: *da*, *per*, *fa*, *tra* sau *in*?

| Româna | Italiana | Când |
|---|---|---|
| învăț italiana **de** doi ani | *studio l'italiano **da** due anni* | acțiunea continuă (verb la prezent) |
| am învățat italiana **timp de** doi ani | *ho studiato l'italiano **per** due anni* | perioadă încheiată |
| am început **acum** doi ani | *ho cominciato due anni **fa*** | momentul din trecut; *fa* stă după |
| vin **peste** o oră | *arrivo **tra** un'ora* | momentul din viitor |
| o termin **într-o** oră | *lo finisco **in** un'ora* | cât durează |

### 3.4 Containere și obiecte: *di* sau *da*?

- *una tazza di caffè* (ceașcă plină) / *una tazza da caffè* (ceașca pentru cafea);
- *un bambino di cinque anni* (vârsta) / *una banconota da cinque euro* (valoarea);
- *qualcosa di buono* (+ adjectiv) / *qualcosa da mangiare* (+ infinitiv).

### 3.5 Tema: *di* sau *su*?

- *un libro di storia* (categoria) / *un libro sulla storia di Roma* (subiectul precis);
- *parlare di qualcosa* (verbul cere *di*) / *un articolo su qualcosa* (substantivul primește *su*).

### 3.6 Transport: *in*, *con* sau *a*?

- *in treno, in macchina* (generic) / *con il treno delle otto, con la macchina di Marco* (precizat) / *a piedi, a
  cavallo*.

### 3.7 Destinația: *a* sau *per*?

- *Vado a Roma* (mă duc) / *Parto per Roma* (plec spre) / *il treno per Roma* (cu destinația) / *il treno da Roma*
  (care vine de la).

### 3.8 Oameni: *a* sau *da*?

- *Scrivo a Marco* (cui: dativ) / *Vado da Marco* (la el acasă);
- *Vado al bar* (locul) / *Vado da Mario* (barul sau casa lui Mario).

---

## 4. Particularități: ce nu urmează regula „de manual”

### 4.1 Privitul pe fereastră: dinăuntru spre afară și din afară spre înăuntru

Regula: **fereastra, ușa, gaura cheii sunt punctul de trecere, deci primesc *da* + articol în ambele direcții.** Direcția
nu o dă prepoziția, ci adverbul (*fuori* = afară, *dentro* = înăuntru) sau un complement cu *in* (*nella stanza*).
Românescul „pe fereastră” devine *dalla finestra*.

**Dinăuntru spre afară:**

- *Guardo fuori dalla finestra.* Mă uit afară pe fereastră.
- *Dalla finestra della mia camera si vede il mare.* De la fereastra camerei mele se vede marea.
- *Non sporgerti dal finestrino!* Nu te apleca pe geam! (în tren, în mașină; *finestrino* = geamul vehiculului)
- *Mi sono affacciato alla finestra.* M-am uitat pe fereastră. / Am ieșit la fereastră. (*affacciarsi alla finestra* =
  a apărea la fereastră; se aude și *dalla finestra*, cu ideea de „a se apleca în afară”, vezi secțiunea 9)

**Din afară spre înăuntru:**

- *Ho guardato dentro dalla finestra, ma non c'era nessuno.* M-am uitat înăuntru pe fereastră, dar nu era nimeni.
- *Dalla strada si vede tutto quello che succede in casa.* Din stradă se vede tot ce se întâmplă în casă.
- *Ha sbirciato nella stanza dal buco della serratura.* S-a uitat pe furiș în cameră pe gaura cheii.

**Alte verbe cu același tipar:** *entrare dalla porta* (a intra pe ușă), *uscire dalla finestra* (a ieși pe fereastră),
*buttare qualcosa dalla finestra* (a arunca ceva pe fereastră), *passare dalla cucina* (a trece prin bucătărie).

**Ce schimbă sensul:**

- *guardare dalla finestra* (prin fereastră, spre ceva) / *guardare la finestra* (te uiți la fereastră ca obiect) /
  *guardare attraverso il vetro* (prin geam, accentul pe transparență);
- *stare alla finestra* (a sta la fereastră) / *davanti alla finestra* (în fața ferestrei);
- *la finestra dà sul cortile* (fereastra dă spre curte).

### 4.2 Interior și exterior: aceeași idee, altă prepoziție

- *all'angolo della strada* (la colțul străzii, colț exterior) / *nell'angolo della stanza* (în colțul camerei, colț
  interior);
- *a casa* (acasă, nu la serviciu) / *in casa* (în casă, înăuntru, nu în curte) / *fuori casa* (în afara casei; *mangiare
  fuori casa* = a mânca în oraș) / *da me* (la mine);
- *al mare* (la mare, în stațiune) / *in mare* (în apă: *facciamo il bagno in mare*) / *sul mare* (pe malul mării: *una
  casa sul mare*);
- *al lago* (la lac) / *nel lago* (în apă) / *sul lago* (pe malul lacului: *Bellagio è sul lago di Como*);
- *a letto* (la culcare) / *nel letto* (în pat, sub pătură) / *sul letto* (pe pat);
- *in strada* (în stradă: *i bambini giocano in strada*) / *per strada* (pe stradă, pe drum: *l'ho incontrato per
  strada*) / *sulla strada per Roma* (pe drumul spre Roma);
- *in macchina* (cu mașina; în mașină) / *sulla macchina* (pe mașină, deasupra: *il gatto dorme sulla macchina*);
- *fuori città* (în afara orașului, fără prepoziție) / *fuori dalla città* (afară din oraș, cu mișcare).

### 4.3 Particularități de loc

- *al primo piano* (la etajul întâi), *al piano terra*, *in fondo al corridoio* (la capătul holului), *in cima alla
  collina* (în vârful dealului), *in mezzo alla piazza* (în mijlocul pieței);
- *di qua / di là*: *Vieni di qua!* (Vino încoace!), *È di là* (E în cealaltă cameră);
- *al sole, all'ombra, al buio, al freddo, sotto la pioggia*: română: la soare, la umbră, pe întuneric, în frig, în
  ploaie;
- *in spiaggia / sulla spiaggia*, *in balcone / sul balcone*: ambele se folosesc;
- același loc, prepoziții diferite după cuvânt: *dal fornaio / in panetteria*, *dal macellaio / in macelleria*, *dal
  giornalaio / in edicola*;
- orașe cu articol în nume: *al Cairo, all'Aquila, alla Spezia*.

### 4.4 Particularități de timp

- **zilele săptămânii fără prepoziție:** *Ci vediamo lunedì* (luni, lunea asta) / *Il lunedì vado in piscina* (lunea, în
  fiecare luni);
- **data fără prepoziție:** *Sono nato il 5 maggio* (pe 5 mai);
- *in tempo* (la timp, nu prea târziu) / *per tempo* (din timp, devreme) / *in orario* (la ora programată) / *a tempo
  pieno* (cu normă întreagă);
- *fra poco* (în curând) / *poco fa* (adineauri);
- *a giorni* (zilele astea, în curând), *da un momento all'altro* (dintr-o clipă în alta), *di tanto in tanto* (din când
  în când).

### 4.5 Particularități de mod și diverse

- *in vendita* (de vânzare), *in affitto* (de închiriat; *vivo in affitto* = stau cu chirie), *in regalo* (cadou: *l'ho
  avuto in regalo*), *in prestito* (împrumut), *a rate* (în rate);
- *per caso* (din întâmplare) / *apposta, di proposito* (intenționat);
- *a me piace* (dativ, la *piacere*) / *per me* (după mine, opinie);
- *pizza ai funghi* (pe meniu) / *una pizza con i funghi* (în conversație), amândouă corecte;
- *alla mano* (o persoană simplă, deschisă), *a posto* (în ordine), *da parte* (deoparte), *da parte di* (din partea).

---

## 5. Capcane pentru un vorbitor de română

Fiecare capcană are o pereche greșit / corect. Ultima coloană spune regula pe scurt.

### 5.1 Românescul „la” are trei corespondente (și uneori niciunul)

| Greșit | Corect | De ce |
|---|---|---|
| *Lavoro a banca.* | *Lavoro in banca.* | clădiri, „tipuri” de loc: *in* |
| *Vado al dottore.* / *Vado a Maria.* | *Vado dal dottore.* / *Vado da Maria.* | la cineva: *da* |
| *Sono in Roma.* | *Sono a Roma.* | oraș: *a* |
| *Vado al casa.* | *Vado a casa.* | *a casa* fără articol |
| *Ci vediamo a otto.* | *Ci vediamo alle otto.* | ora: *a* + articol (*le otto*) |
| *Sono nato a 5 maggio.* | *Sono nato il 5 maggio.* | data: fără prepoziție |
| *Guardo a TV.* | *Guardo la TV.* | *guardare* nu cere prepoziție |

### 5.2 „De la” și „din”

| Greșit | Corect | De ce |
|---|---|---|
| *Torno di lavoro.* | *Torno dal lavoro.* | punct de plecare: *da* |
| *Le chiavi dalla macchina.* | *Le chiavi della macchina.* | „cheile de la mașină” = posesie: *di* |
| *Sono da Bucarest.* / *Sono di Romania.* | *Sono di Bucarest.* / *Vengo dalla Romania.* | *essere di* + oraș; țara: *venire da* + articol |
| *Vengo da Italia.* | *Vengo dall'Italia.* | după *da*, țara primește articol |
| *Nove di dieci.* | *Nove su dieci.* | proporția: *su* |
| *Dalle nove a cinque.* | *Dalle nove alle cinque.* | ambele capete cu articol |

### 5.3 „De” are cinci corespondente

| Greșit | Corect | De ce |
|---|---|---|
| *Occhiali di sole.* | *Occhiali da sole.* | la ce folosește: *da* |
| *Studio italiano di tre anni.* | *Studio italiano da tre anni.* | de când: *da* |
| *Ci vediamo di Natale.* | *Ci vediamo a Natale.* | sărbători: *a* |
| *L'ho scritto di mano.* | *L'ho scritto a mano.* | mod: *a mano* |
| *Una banconota di venti euro.* | *Una banconota da venti euro.* | valoarea: *da* |
| *Una tazza da caffè caldo.* | *Una tazza di caffè caldo.* | conținutul: *di* |

### 5.4 „Pe” nu e mereu *su*

| Greșit | Corect | De ce |
|---|---|---|
| *Andiamo su piedi.* | *Andiamo a piedi.* | pe jos: *a piedi* |
| *Una volta su giorno.* | *Una volta al giorno.* | frecvența: *a* + articol |
| *Per domani!* | *A domani!* | salut: „pe mâine” |
| *Gira su destra.* | *Gira a destra.* | direcție: *a destra* |
| *L'ho buttato sulla finestra.* | *L'ho buttato dalla finestra.* | punct de trecere: *da* |
| *Passo su da te.* | *Passo da te.* | „trec pe la tine” |
| *L'ho incontrato sulla strada.* | *L'ho incontrato per strada.* | „pe stradă” = *per strada* |
| *Abito sulla via Roma.* | *Abito in via Roma.* | „pe strada X” = *in via X* |
| *Te lo mando su email.* | *Te lo mando per email.* | mijloc de comunicare: *per* |
| *Vedo a Marco.* / *Aspetto per Anna.* | *Vedo Marco.* / *Aspetto Anna.* | „pe” din acuzativ dispare |
| *Arrivo su lunedì.* | *Arrivo lunedì.* | zilele: fără prepoziție |
| *Sei arrabbiato su di me?* | *Sei arrabbiato con me?* | „supărat pe” = *arrabbiato con* |

Corect cu *su*: *sul tavolo, su internet, su Instagram, contare su di te*.

### 5.5 „În”

| Greșit | Corect | De ce |
|---|---|---|
| *Abito in Milano.* | *Abito a Milano.* | oraș: *a* |
| *Sono nato in 1990.* | *Sono nato nel 1990.* | anul cere articol |
| *Vivo in Stati Uniti.* | *Vivo negli Stati Uniti.* | țară cu nume la plural |
| *Arrivo in un'ora* (când vrei „peste”) | *Arrivo tra un'ora.* | „peste” = *tra*; *in un'ora* = în decurs de |
| *Cammino nella pioggia.* | *Cammino sotto la pioggia.* | „în ploaie” = *sotto la pioggia* |

### 5.6 „Cu” și „pentru”

| Greșit | Corect | De ce |
|---|---|---|
| *Vado con treno.* | *Vado in treno.* (sau *con il treno delle otto*) | transport generic: *in* |
| *Pago con contanti.* | *Pago in contanti.* | dar *con la carta* |
| *Sono qui con il lavoro.* | *Sono qui per lavoro.* | „cu serviciul” = *per lavoro* |
| *Vado per Roma domani.* | *Vado a Roma domani.* / *Parto per Roma domani.* | *per* + destinație doar cu *partire*, tren, bilet |
| *Abito qui per tre anni* (dacă încă locuiești) | *Abito qui da tre anni.* | continuă: *da* |

### 5.7 Contopirea și articolul

| Greșit | Corect | De ce |
|---|---|---|
| *di il libro, a il mare, in la borsa* | *del libro, al mare, nella borsa* | contopirea e obligatorie |
| *dei amici, ai studenti* | *degli amici, agli studenti* | articolul *gli* (vocală, s + consoană) |
| *alla mia madre* | *a mia madre* | posesiv + rudă la singular: fără articol |
| *a loro madre* | *alla loro madre* | *loro* cere mereu articol |

### 5.8 Partitivul

| Greșit | Corect | De ce |
|---|---|---|
| *Compro di pane.* | *Compro del pane.* / *Compro un po' di pane.* / *Compro pane.* | partitivul = *di* + articol |
| *Non ho dei soldi.* (nefiresc) | *Non ho soldi.* | la negație nu se pune |
| *Ho qualche amici.* | *Ho qualche amico.* / *Ho degli amici.* | *qualche* + singular |

### 5.9 Verbe cu regim diferit

| Româna | Greșit | Corect |
|---|---|---|
| a se gândi la | *penso di te* | *penso a te* |
| a depinde de | *dipende di te* | *dipende da te* |
| a vorbi despre | *parlare su* + persoană | *parlare di* |
| a se îndrăgosti de | *innamorarsi da* | *innamorarsi di* |
| a avea nevoie de | *avere bisogno da* | *avere bisogno di* |
| a se uita la | *guardare a* | *guardare* (fără prepoziție) |
| a asculta (pe cineva) | *ascoltare a* | *ascoltare* |
| a suna pe cineva | *chiamare a Marco* | *chiamare Marco* / *telefonare a Marco* |
| a întreba pe cineva | *chiedere Marco* | *chiedere a Marco* |
| a ajuta pe cineva să | *aiutare a Marco di* | *aiutare Marco a* |
| a juca fotbal | *giocare calcio* | *giocare a calcio* |
| a încerca să | *provare di* | *provare a* / *cercare di* |
| a fi supărat pe | *arrabbiato su* | *arrabbiato con* |

---

## 6. Ordinea de predare

Lecția 10 rămâne lecția de formă (A1). Sensurile se predau în opt lecții noi, mai mici. Două sunt de contrast (loc,
timp), pentru că alegerea între *a / in / da* sau *da / per / fa / tra* se învață mai bine comparând. Patru iau
prepozițiile pe rând pentru sensurile rămase. Ultima recapitulează capcanele și particularitățile.

Lecțiile existente au ordinea 1–18 (1–12 A1, 13–18 A2). Lecțiile noi se pun la coada listei, A2 întâi, apoi B1. Nu
trebuie renumerotat nimic: progresul și repetiția sunt legate de `id`, nu de `order` (`grammarCardId(topicId)`,
`saveGameScore(db, topicId, …)`).

| Ordine | id | Titlu (it / ro) | Nivel | Cere înainte |
|---|---|---|---|---|
| 10 | `preposizioni` (există) | Le preposizioni articolate / Prepozițiile articulate | A1 | 1 articolele |
| 19 | `preposizioni-luogo` | A, in o da? Dove sei, dove vai / A, in sau da? Unde ești, unde mergi | A2 | 10, 11 posesivele |
| 20 | `preposizioni-tempo` | Le preposizioni del tempo / Prepozițiile de timp | A2 | 10, 13 passato prossimo, 16 imperfetto |
| 21 | `preposizione-di` | La preposizione di / Prepoziția di | A2 | 10, 19 |
| 22 | `preposizione-a` | La preposizione a / Prepoziția a | A2 | 10, 12 mi piace, 19 |
| 23 | `preposizione-da` | La preposizione da / Prepoziția da | B1 | 19, 20 |
| 24 | `preposizioni-in-su` | In e su, oltre il luogo / In și su, dincolo de loc | B1 | 19, 20 |
| 25 | `preposizioni-con-per-tra` | Con, per, tra e fra / Con, per, tra și fra | B1 | 10, 20 |
| 26 | `preposizioni-trappole` | Preposizioni: trappole e casi particolari / Prepozițiile: capcane și cazuri speciale | B1 | 19–25 |

Nivelurile sunt estimate, nu oficiale (ca restul aplicației); se pot verifica în *Profilo della lingua italiana*
(secțiunea 9). Pasivul (*da* agent, lecția 23) nu are încă o lecție proprie; exemplele folosesc doar forma *è stato
fatto da*, ușor de recunoscut.

---

## 7. Lecțiile în aplicație

Pentru fiecare lecție: fișierul, blocurile (în ordine), regulile „De reținut” și un eșantion de exemple pentru jocuri.
Ținta e 18–25 de exemple pe lecție. Fiecare exemplu primește la implementare și `noteIt` (nota în italiană), obligatoriu
alături de `note`. Textele blocurilor `text` și `trap` se scriu în ambele limbi (`ro`, `it`), cu marcajele `[it]…[/it]`
și `[b]…[/b]`.

Toate lacunele din eșantioane au fost alese să apară o singură dată ca un cuvânt întreg și să aibă un singur răspuns
firesc, date fiind traducerea și contextul.

### 7.0 Lecția 10 (există): modificări

Vezi secțiunea 0, „Ce aș corecta”: textul despre *con/per* nuanțat + *tra/fra*; regula 2; `pre-20` înlocuit cu *Esco con
gli amici stasera.*; un `text` nou cu regula de alegere a formei; trimitere la lecțiile 19–26. Numărul de blocuri
rămâne sub 20.

### 7.1 Lecția 19: `19-preposizioni-luogo.json` (A2)

**Blocuri:**

1. `text`: „Unde ești?” și „Unde mergi?” au de obicei aceeași prepoziție. Alegerea depinde de ce urmează: oraș, țară,
   clădire sau persoană.
2. `table` „Unde?”: tabelul din 3.1 (ce urmează / prepoziția / exemple).
3. `examples`: *Abito a Torino*, *Vado in Spagna*, *Lavoro in banca*, *Vado dal medico*, *Stasera vado da Marco*,
   *Ci vediamo al bar*.
4. `text`: articolul apare când locul e precizat sau numele e la plural: *in Italia / nell'Italia del Nord*, *negli
   Stati Uniti*, *in macchina / nella macchina di Marco*.
5. `table` „Locuri de memorat”: *a casa, a scuola, a teatro, a letto* / *al bar, al cinema, al mare, alla stazione,
   all'università* / *in ufficio, in banca, in farmacia, in centro, in montagna*.
6. `text`: de unde vii: *da* + oraș (fără articol), *da* + țară (cu articol): *da Roma, dalla Romania*.
7. `table` „Cum mergi?”: *in treno, in macchina, in autobus, in bici* / *a piedi* / *con il treno delle otto, con la
   macchina di Marco*.
8. `examples`: *Andiamo a piedi*, *Vado a scuola in autobus*, *Sali sul treno* (urcatul), *Abito in via Garibaldi*.
9. `trap`: „la” = *a / in / da*; „pe strada X” = *in via X*; *in Milano* e greșit.

**Reguli (4):**

- Oraș: *a Roma*. Țară, regiune: *in Italia* (cu articol la plural sau când e precizată: *negli Stati Uniti*).
- La cineva: *da* (*da Marco, dal medico, da me*).
- Clădiri: de obicei *in* (*in banca, in ufficio*); de memorat: *a casa, a scuola, al bar, al cinema, al mare*.
- Transport: *in treno, in macchina*, dar *a piedi*; trenul sau mașina precizată: *con il / con la*.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| plu-01 | Domani vado a Firenze. | a | Mâine merg la Florența. | oraș: a, fără articol |
| plu-02 | Mia sorella vive in Spagna. | in | Sora mea locuiește în Spania. | țară: in, fără articol |
| plu-03 | Mio cugino lavora negli Stati Uniti. | negli | Vărul meu lucrează în Statele Unite. | țară cu nume la plural: in + gli |
| plu-04 | Siamo stati nell'Italia del Sud. | nell' | Am fost în sudul Italiei. | țară precizată: cu articol |
| plu-05 | Torno dalla Romania domenica. | dalla | Mă întorc din România duminică. | da + țară: cu articol (dar in Romania) |
| plu-06 | Stasera vado da Marco. | da | Diseară merg la Marco. | la cineva: da |
| plu-07 | Devo andare dal dentista. | dal | Trebuie să merg la dentist. | la cineva (meserie): da + il |
| plu-08 | Mia madre lavora in banca. | in | Mama lucrează la bancă. | in banca, in ufficio: fără articol |
| plu-09 | Ci vediamo al bar alle sei. | al | Ne vedem la bar la șase. | al bar, al cinema, al mare |
| plu-10 | Stasera resto a casa. | a | Diseară rămân acasă. | a casa = acasă |
| plu-11 | Vado a scuola in autobus. | in | Merg la școală cu autobuzul. | transport: in, fără articol |
| plu-12 | Oggi vengo con la macchina di mio padre. | con | Azi vin cu mașina tatălui meu. | mașina e precizată: con + articol |
| plu-13 | Andiamo a piedi, è vicino. | a | Mergem pe jos, e aproape. | pe jos = a piedi |
| plu-14 | D'estate andiamo in montagna. | in | Vara mergem la munte. | in montagna, dar al mare |
| plu-15 | Abito in via Garibaldi. | in | Locuiesc pe strada Garibaldi. | strada X = in via X |
| plu-16 | Sono andata all'aeroporto in taxi. | all' | Am mers la aeroport cu taxiul. | aeroporto, stazione: a + articol |
| plu-17 | Vivono a Malta da anni. | a | Locuiesc în Malta de ani buni. | insulă mică: a, ca la oraș |
| plu-18 | Passiamo il weekend in Sicilia. | in | Ne petrecem weekendul în Sicilia. | insulă mare: in, ca la regiune |
| plu-19 | Domenica mangiamo dai nonni. | dai | Duminică mâncăm la bunici. | la cineva: da + i |
| plu-20 | Ci vediamo alla stazione. | alla | Ne vedem la gară. | a + la stazione |

### 7.2 Lecția 20: `20-preposizioni-tempo.json` (A2)

**Blocuri:**

1. `text`: ora, ziua, anul și durata au fiecare prepoziția lor; româna folosește „la, în, de, peste” altfel.
2. `table` „Când?”: *alle otto, a mezzogiorno, a Natale* / *nel 2020, in estate, a/in maggio* / *di mattina, di sera* /
   *lunedì, il 5 maggio* (fără prepoziție).
3. `examples`: *Il film comincia alle nove*, *Sono nato nel 1990*, *A Natale torno a casa*, *Di sera esco poco*.
4. `table` „Cât timp?”: tabelul din 3.3 (*da, per, fa, tra, in*).
5. `examples`: *Studio l'italiano da due anni*, *Ho vissuto a Roma per due anni*, *Sono arrivato tre anni fa*, *Arrivo
   tra un'ora*, *Lo finisco in un'ora*.
6. `text`: *da* + prezent pentru ce continuă; *da bambino* = când eram copil; *dalle nove alle cinque*.
7. `trap`: „de trei ani” = *da tre anni* (nu *per*); „acum trei ani” = *tre anni fa*; „pe 5 mai” = *il 5 maggio*; „în
   1990” = *nel 1990*.

**Reguli (4):**

- Ora: *alle otto, all'una*, dar *a mezzogiorno*. Anul: *nel 2020*.
- *Da* + prezent = de când (încă): *studio da due anni*.
- *Per* = timp de (încheiat); *fa* = acum (în trecut), după durată.
- *Tra / fra* = peste (viitor); *in* = cât îți ia.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| ptm-01 | La lezione comincia alle nove. | alle | Lecția începe la nouă. | ora: a + le |
| ptm-02 | Ci vediamo all'una. | all' | Ne vedem la unu. | all'una (l'una) |
| ptm-03 | Mangiamo a mezzogiorno. | a | Mâncăm la ora douăsprezece. | mezzogiorno: fără articol |
| ptm-04 | Sono nato nel 1990. | nel | M-am născut în 1990. | anul: in + il |
| ptm-05 | In estate fa molto caldo. | In | Vara e foarte cald. | anotimp: in estate (sau d'estate) |
| ptm-06 | Preferisco studiare di sera. | di | Prefer să învăț seara. | momentul zilei: di sera |
| ptm-07 | Studio l'italiano da tre anni. | da | Învăț italiana de trei ani. | încă învăț: da + prezent |
| ptm-08 | Ho vissuto a Roma per due anni. | per | Am locuit la Roma timp de doi ani. | perioadă încheiată: per |
| ptm-09 | Il treno arriva tra dieci minuti. | tra | Trenul vine peste zece minute. | peste: tra (sau fra) |
| ptm-10 | Ho finito il lavoro in due ore. | in | Am terminat treaba în două ore. | cât ți-a luat: in |
| ptm-11 | Sono arrivato in Italia tre anni fa. | fa | Am venit în Italia acum trei ani. | acum … = … fa |
| ptm-12 | Il negozio è aperto dalle nove alle sette. | dalle | Magazinul e deschis de la nouă la șapte. | de la … la …: dalle … alle |
| ptm-13 | Da bambino giocavo sempre a calcio. | Da | Când eram copil, jucam mereu fotbal. | da bambino = când eram copil |
| ptm-14 | Ci sentiamo a Natale. | a | Ne auzim de Crăciun. | sărbători: a |
| ptm-15 | Lavoro dal lunedì al venerdì. | dal | Lucrez de luni până vineri. | dal … al … |
| ptm-16 | Ti aspetto da mezz'ora! | da | Te aștept de o jumătate de oră! | durează încă: da |

Fără lacună la lună (*a / in maggio*, ambele corecte); luna apare doar în tabel și în exemplele lecției.

### 7.3 Lecția 21: `21-preposizione-di.json` (A2)

**Blocuri:**

1. `text`: *di* = „de, al” în română, dar are mai multe sensuri; cele mai frecvente: posesie, origine, conținut,
   comparație, partitiv.
2. `table` „Sensurile lui *di*”: posesie (*la bici di Anna*), origine (*sono di Roma*), material (*di lana*), conținut
   (*una bottiglia di vino*), temă (*parlare di*), timp (*di sera*), comparație (*più alto di*), vârstă (*un bambino di
   tre anni*).
3. `examples`: câte un exemplu pe sens, cu articol unde e cazul (*il cane dei vicini, le chiavi della macchina*).
4. `text`: partitivul: *del pane* = niște pâine, *dei biscotti* = niște biscuiți; alternative *un po' di, qualche,
   alcuni*.
5. `examples`: *Vuoi del caffè?*, *Ho comprato della frutta*, *Abbiamo invitato degli amici*, *Non ho amici qui* (fără
   partitiv).
6. `text`: *di* + infinitiv după *decidere, finire, smettere, cercare*, *avere voglia / paura / bisogno*.
7. `examples`: *Ho deciso di partire*, *È ora di andare*, *C'è qualcosa di buono?*.
8. `trap`: *Sono di Bucarest* dar *Vengo dalla Romania*; *le chiavi della macchina* („de la mașină”); *Compro di pane*
   e greșit; *pensare a* / *pensare di*.

**Reguli (4):**

- Posesie, material, conținut: *la bici di Anna, una sciarpa di lana, un bicchiere d'acqua*.
- Orașul tău: *sono di Roma*; comparația: *più alto di*.
- Partitivul *del, della, dei, degli, delle* = niște (nu la negație).
- *Di* + infinitiv: *decido di, smetto di, ho voglia di*.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| pdi-01 | È la bici di mio fratello. | di | E bicicleta fratelui meu. | posesiv + rudă: fără articol |
| pdi-02 | Questa è la camera dei bambini. | dei | Asta e camera copiilor. | posesie: di + i |
| pdi-03 | Dove sono le chiavi della macchina? | della | Unde sunt cheile de la mașină? | „de la mașină” = posesie |
| pdi-04 | Sono di Bucarest, e tu? | di | Sunt din București, tu? | orașul tău: essere di |
| pdi-05 | Prendo una bottiglia di vino rosso. | di | Iau o sticlă de vin roșu. | conținut: di |
| pdi-06 | Ho comprato una sciarpa di lana. | di | Mi-am cumpărat un fular de lână. | material: di |
| pdi-07 | Parliamo del viaggio di domani? | del | Vorbim despre excursia de mâine? | parlare di = a vorbi despre |
| pdi-08 | Marco è più alto di suo padre. | di | Marco e mai înalt decât tatăl lui. | comparație: più … di |
| pdi-09 | Mi passi del pane, per favore? | del | Îmi dai niște pâine, te rog? | partitiv: del pane |
| pdi-10 | Abbiamo invitato degli amici a cena. | degli | Am invitat niște prieteni la cină. | niște: di + gli |
| pdi-11 | Ho deciso di cambiare lavoro. | di | Am hotărât să-mi schimb serviciul. | decidere di + infinitiv |
| pdi-12 | Hai voglia di uscire stasera? | di | Ai chef să ieși diseară? | avere voglia di |
| pdi-13 | C'è qualcosa di buono da mangiare? | di | E ceva bun de mâncare? | qualcosa di + adjectiv |
| pdi-14 | Ho bisogno di un consiglio. | di | Am nevoie de un sfat. | avere bisogno di |
| pdi-15 | Di solito ceno alle otto. | Di | De obicei cinez la opt. | expresie fixă: di solito |
| pdi-16 | Ho un figlio di sei anni. | di | Am un fiu de șase ani. | vârstă: di |
| pdi-17 | Smetti di urlare! | di | Nu mai țipa! | smettere di |

### 7.4 Lecția 22: `22-preposizione-a.json` (A2)

**Blocuri:**

1. `text`: în afară de loc și oră (lecțiile 19–20), *a* arată cui îi dai ceva, cum faci ceva și de câte ori.
2. `table` „Sensurile lui *a*”: cui (*a Marco, alla mamma*), mod (*a piedi, alla romana, a righe*), frecvență și preț
   (*al giorno, al chilo*), distanță (*a due passi*), *a* + infinitiv (*vado a mangiare*).
3. `examples`: *Ho detto tutto a Luca*, *Telefono alla nonna*, *Paghiamo alla romana*, *Due volte al giorno*, *Il mare è
   a due chilometri*.
4. `text`: verbe urmate de *a* + infinitiv: *andare, venire, cominciare, imparare, riuscire, aiutare, provare*.
5. `examples`: *Vado a fare la spesa*, *Hai provato a chiamarlo?*, *Mi aiuti a portare le borse?*.
6. `trap`: „o sun pe mama” = *telefono a mia madre*, dar „îl sun pe Marco” = *chiamo Marco*; „de două ori pe zi” = *due
   volte al giorno*; *pensare a* (la cineva) / *pensare di* (a avea de gând).

**Reguli (4):**

- Cui? *A*: *Scrivo a Marco, telefono alla nonna*.
- Mod și rețetă: *a piedi, a mano, alla carbonara, a righe*.
- „Pe” la frecvență și preț: *una volta al giorno, due euro al chilo*.
- *A* + infinitiv după verbe de mișcare și *cominciare, imparare, riuscire, aiutare*.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| pa-01 | Ho regalato un libro a Giulia. | a | I-am făcut cadou o carte Giuliei. | cui? a |
| pa-02 | Scrivo un messaggio alla mamma. | alla | Îi scriu un mesaj mamei. | cui? a + la |
| pa-03 | Telefono a mia madre ogni sera. | a | O sun pe mama în fiecare seară. | telefonare a; posesiv + rudă: fără articol |
| pa-04 | Vado in palestra tre volte alla settimana. | alla | Merg la sală de trei ori pe săptămână. | frecvență: alla settimana |
| pa-05 | Le mele costano due euro al chilo. | al | Merele costă doi euro kilogramul. | preț pe unitate: al |
| pa-06 | Vorrei gli spaghetti alla carbonara. | alla | Aș vrea spaghete carbonara. | rețetă: alla |
| pa-07 | Ti sta bene la camicia a righe. | a | Îți stă bine cămașa în dungi. | model: a righe |
| pa-08 | La stazione è a cinque minuti da qui. | a | Gara e la cinci minute de aici. | distanță: a |
| pa-09 | Vado a prendere il pane. | a | Mă duc să iau pâine. | mișcare + a + infinitiv |
| pa-10 | Non riesco a dormire. | a | Nu reușesc să dorm. | riuscire a |
| pa-11 | Penso sempre a te. | a | Mă gândesc mereu la tine. | pensare a = a se gândi la |
| pa-12 | Giochi a tennis? | a | Joci tenis? | giocare a + sport |
| pa-13 | A domani! | A | Pe mâine! | salut: a domani |
| pa-14 | Gira a destra dopo il semaforo. | a | Fă la dreapta după semafor. | a destra |
| pa-15 | Paghiamo alla romana? | alla | Plătim fiecare partea lui? | alla romana |
| pa-16 | L'ho scritto a mano. | a | L-am scris de mână. | mod: a mano |
| pa-17 | Mi aiuti a portare le borse? | a | Mă ajuți să duc sacoșele? | aiutare qualcuno a |

### 7.5 Lecția 23: `23-preposizione-da.json` (B1)

**Blocuri:**

1. `text`: *da* e prepoziția cu cele mai multe sensuri care nu seamănă cu româna: de unde, la cine, de când, pentru ce
   e un obiect, ce e de făcut.
2. `table` „Sensurile lui *da*”: de unde (*dal lavoro*), la cine (*da Marco*), pe unde (*dalla finestra*), de când (*da
   due anni*), pentru ce (*occhiali da sole*), de făcut (*da fare*), de către (*scritto da*), valoare (*da 20 euro*),
   ca (*da amico, da solo*).
3. `examples`: câte unul pe sens (*Torno dal lavoro*, *Vieni da me?*, *Studio da due anni*, *Ho tanto da fare*).
4. `text`: punctul de trecere: fereastra și ușa primesc *da* în ambele direcții; direcția o dau *fuori* și *dentro*
   (secțiunea 4.1).
5. `examples`: *Guardo fuori dalla finestra*, *Ho guardato dentro dalla finestra*, *Sono entrati dalla finestra*, *Non
   sporgerti dal finestrino*.
6. `table` „*Di* sau *da*?”: *tazza di tè / tazza da tè*, *sono di Roma / vengo da Roma*, *un bambino di 5 anni / una
   banconota da 5 euro*, *qualcosa di buono / qualcosa da bere*.
7. `trap`: „pe fereastră” = *dalla finestra*; „de trei ani” = *da tre anni*; „ochelari de soare” = *occhiali da sole*.

**Reguli (4):**

- De unde și la cine: *torno dal lavoro, vado da Marco*.
- De când (încă): *da* + prezent: *abito qui da tre anni*.
- Pentru ce e obiectul și ce e de făcut: *occhiali da sole, ho tanto da fare*.
- Pe unde treci: *dalla finestra, dalla porta*, în ambele direcții.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| pda-01 | Vengo da Torino, ma vivo a Bologna. | da | Vin din Torino, dar locuiesc la Bologna. | de unde: da |
| pda-02 | A che ora esci dall'ufficio? | dall' | La ce oră ieși de la birou? | de la + loc: da |
| pda-03 | Stasera mangiamo dai miei. | dai | Diseară mâncăm la ai mei. | la părinți: dai miei |
| pda-04 | Vieni da me sabato? | da | Vii la mine sâmbătă? | da me = la mine |
| pda-05 | Sono entrati dalla finestra. | dalla | Au intrat pe fereastră. | pe unde: da |
| pda-06 | Guardo fuori dalla finestra. | dalla | Mă uit afară pe fereastră. | dinăuntru spre afară: fuori dalla |
| pda-07 | Da piccola abitavo in campagna. | Da | Când eram mică locuiam la țară. | da piccola = când eram mică |
| pda-08 | Ho perso gli occhiali da sole. | da | Mi-am pierdut ochelarii de soare. | la ce folosește: da |
| pda-09 | Mi serve una tazza da tè, non un bicchiere. | da | Am nevoie de o ceașcă de ceai, nu de un pahar. | vasul: da; plină: di |
| pda-10 | Ho tante cose da fare oggi. | da | Am multe de făcut azi. | de făcut: da + infinitiv |
| pda-11 | Il quadro è stato dipinto da un artista locale. | da | Tabloul a fost pictat de un artist local. | pasiv: da |
| pda-12 | Hai una moneta da un euro? | da | Ai o monedă de un euro? | valoare: da |
| pda-13 | Ho fatto tutto da sola. | da | Am făcut totul singură. | da sola = singură |
| pda-14 | Morivo dal ridere. | dal | Muream de râs. | expresie: morire dal ridere |
| pda-15 | Dipende da te. | da | Depinde de tine. | dipendere da |
| pda-16 | Ti parlo da amico. | da | Îți vorbesc ca prieten. | în calitate de: da |
| pda-17 | Passo da te dopo il lavoro. | da | Trec pe la tine după serviciu. | trec pe la: passare da |
| pda-18 | Ho guardato dentro dalla finestra, ma non c'era nessuno. | dalla | M-am uitat înăuntru pe fereastră, dar nu era nimeni. | din afară spre înăuntru: tot dalla |

### 7.6 Lecția 24: `24-preposizioni-in-su.json` (B1)

**Blocuri:**

1. `text`: *in* și *su* nu înseamnă doar „în” și „pe”: *in* arată și starea și modul, *su* tema, aproximarea și sursa.
2. `table` „*In*, dincolo de loc”: mod și stare (*in ritardo, in piedi, in pensione, in contanti, in affitto*), limba
   (*in italiano*), câți suntem (*siamo in quattro*), domeniul (*laurea in economia*).
3. `examples`: *Scusa, sono in ritardo*, *Posso pagare in contanti?*, *Siamo in quattro*, *Vivo in affitto*.
4. `table` „*Su*, dincolo de loc”: temă (*un documentario sugli squali*), surse (*sul giornale, su internet*),
   aproximare (*sui quarant'anni*), proporție (*nove su dieci*), vedere (*vista sul mare*), expresii (*sul serio*).
5. `examples`: *L'ho letto sul giornale*, *Avrà sui quarant'anni*, *Nove su dieci*, *Dici sul serio?*.
6. `text`: *al mare / in mare / sul mare*; *a letto / nel letto / sul letto* (secțiunea 4.2).
7. `trap`: „în ziar” = *sul giornale*, „pe internet” = *su internet*, dar „la televizor” = *in TV*; „pe strada X” = *in
   via X*; „din zece” = *su dieci*.

**Reguli (4):**

- *In* + stare, mod, limbă, fără articol: *in ritardo, in contanti, in italiano*.
- *Su* + tema precisă: *un film sulla guerra* (dar *un libro di storia*).
- *Su* + surse: *sul giornale, su internet, su Instagram*.
- Aproximare și proporție: *sui trent'anni, nove su dieci*.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| pis-01 | Siamo in quattro stasera. | in | Diseară suntem patru. | essere in + număr |
| pis-02 | Posso pagare in contanti? | in | Pot plăti cash? | in contanti (dar con la carta) |
| pis-03 | Parliamo in italiano, per favore. | in | Hai să vorbim în italiană, te rog. | limba: in |
| pis-04 | Scusa, sono in ritardo. | in | Scuze, am întârziat. | in ritardo |
| pis-05 | Sono rimasto in piedi tutto il viaggio. | in | Am stat în picioare tot drumul. | in piedi |
| pis-06 | Mio nonno è in pensione. | in | Bunicul meu e pensionar. | in pensione |
| pis-07 | Vivo in affitto. | in | Stau cu chirie. | in affitto |
| pis-08 | Ho visto un documentario sugli squali. | sugli | Am văzut un documentar despre rechini. | temă: su + articol |
| pis-09 | L'ho letto sul giornale. | sul | Am citit în ziar. | sul giornale |
| pis-10 | Ho trovato la ricetta su internet. | su | Am găsit rețeta pe internet. | su internet |
| pis-11 | Avrà sui quarant'anni. | sui | Cred că are în jur de patruzeci de ani. | aproximare: su + articol |
| pis-12 | Nove persone su dieci preferiscono il mare. | su | Nouă oameni din zece preferă marea. | proporție: su |
| pis-13 | Dici sul serio? | sul | Vorbești serios? | sul serio |
| pis-14 | La camera ha vista sul mare. | sul | Camera are vedere la mare. | vedere spre: su |
| pis-15 | Sali sull'autobus 64. | sull' | Urcă în autobuzul 64. | salire su (dar in macchina) |
| pis-16 | Posso contare su di te? | su | Mă pot baza pe tine? | su di + pronume |
| pis-17 | Facciamo il bagno in mare? | in | Facem baie în mare? | in mare = în apă |
| pis-18 | Hanno una casa sul mare. | sul | Au o casă pe malul mării. | sul mare = pe mal |

### 7.7 Lecția 25: `25-preposizioni-con-per-tra.json` (B1)

**Blocuri:**

1. `text`: forma: *con* și *per* se scriu separat (*col, coi* în vorbire), *tra* și *fra* nu se contopesc niciodată și
   înseamnă același lucru.
2. `table` „*Con*”: companie, instrument, mod, însușire, atitudine (*arrabbiato con*).
3. `examples`: *Esco con gli amici*, *Pago con la carta*, *Fallo con calma*, *La ragazza con gli occhiali*.
4. `table` „*Per*”: scop (*per te, per + infinitiv*), destinație (*parto per Roma*), prin (*per il centro, per strada*),
   timp de (*per due anni*), termen (*per domani*), cauză (*per il traffico*), mijloc (*per email*), opinie (*per me*),
   *stare per*.
5. `examples`: *Studio per passare l'esame*, *Parto per Londra*, *Facciamo un giro per il centro*, *Per me ha ragione*.
6. `table` „*Tra / fra*”: între (spațiu), peste (timp, distanță), printre (*tra amici, tra di noi*).
7. `examples`: *Tra la banca e il bar*, *Tra dieci minuti*, *Tra 200 metri girate a destra*.
8. `trap`: „cu trenul” = *in treno*, „cu serviciul” = *per lavoro*, „supărat pe” = *arrabbiato con*; *vado a Roma*, dar
   *parto per Roma*.

**Reguli (4):**

- *Con*: cu cine, cu ce, cum (*con calma*); *col, coi* doar în vorbire.
- *Per*: pentru, ca să, prin, din cauza; destinație doar cu *partire* (*parto per Roma*).
- *Tra / fra* = între sau peste (*tra un'ora*); nu se contopesc.
- „Cu trenul” = *in treno*; „pe email” = *per email*.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| pcp-01 | Vivo con due coinquilini. | con | Locuiesc cu doi colegi de apartament. | companie: con |
| pcp-02 | Posso pagare con la carta? | con | Pot plăti cu cardul? | instrument: con |
| pcp-03 | Chi è la ragazza con gli occhiali? | con | Cine e fata cu ochelari? | însușire: con |
| pcp-04 | Fallo con calma, non c'è fretta. | con | Fă-o liniștit, nu e nicio grabă. | mod: con calma |
| pcp-05 | Sei arrabbiato con me? | con | Ești supărat pe mine? | supărat pe = arrabbiato con |
| pcp-06 | Questo regalo è per te. | per | Cadoul ăsta e pentru tine. | beneficiar: per |
| pcp-07 | Sono a Milano per lavoro. | per | Sunt la Milano cu serviciul. | motiv: per lavoro |
| pcp-08 | Studio molto per passare l'esame. | per | Învăț mult ca să iau examenul. | ca să: per + infinitiv |
| pcp-09 | Domani parto per Londra. | per | Mâine plec la Londra. | partire per + destinație |
| pcp-10 | Siamo arrivati tardi per il traffico. | per | Am ajuns târziu din cauza traficului. | cauză: per |
| pcp-11 | Ti mando il file per email. | per | Îți trimit fișierul pe email. | mijloc: per email |
| pcp-12 | Per me ha ragione lei. | Per | După mine, are ea dreptate. | opinie: per me |
| pcp-13 | Facciamo un giro per il centro? | per | Facem o tură prin centru? | prin: per |
| pcp-14 | Sto per uscire, ti richiamo. | per | Tocmai ies, te sun eu înapoi. | stare per + infinitiv |
| pcp-15 | La farmacia è tra la banca e il bar. | tra | Farmacia e între bancă și bar. | între: tra |
| pcp-16 | Ci vediamo tra un'ora. | tra | Ne vedem peste o oră. | peste: tra |
| pcp-17 | Detto tra noi, non mi convince. | tra | Între noi fie vorba, nu mă convinge. | tra noi |
| pcp-18 | Tra 200 metri girate a destra. | Tra | Peste 200 de metri faceți la dreapta. | distanță: tra |

Lacunele *tra* acceptă azi doar *tra*. Lecția spune explicit „în exerciții scriem *tra*”, până la extensia opțională din
secțiunea 8.

### 7.8 Lecția 26: `26-preposizioni-trappole.json` (B1)

**Blocuri:**

1. `text`: recapitulare: aceleași cuvinte românești (*la, de, de la, pe, în*) au mai multe corespondente în italiană.
2. `table` „«La» în italiană”: *a Roma / in banca / dal medico / alle otto / a Marco* (dativ).
3. `table` „«Pe» în italiană”: *sul tavolo / a piedi / al giorno / dalla finestra / per strada / in via Roma / per
   email / — (vedo Marco, lunedì, il 5 maggio)*.
4. `table` „«De» și «de la»”: *di vino / da sole / da tre anni / a Natale / a mano / dal lavoro / della macchina*.
5. `examples`: perechi din secțiunea 5, câte una pe capcană.
6. `trap`: „pe” din acuzativ dispare: *vedo Marco, aspetto Anna, chiamo Marco*; zilele și data fără prepoziție: *lunedì,
   il 5 maggio*. (Aceste cazuri nu au lacună: nu există prepoziție de ascuns.)
7. `text`: particularități: interior și exterior (*all'angolo / nell'angolo*, *a casa / in casa*, *al mare / in mare /
   sul mare*).
8. `examples`: *Ci vediamo all'angolo della strada*, *La pianta è nell'angolo della stanza*, *Facciamo il bagno in mare*,
   *Una casa sul mare*.
9. `trap`: verbe cu regim diferit (tabelul din 5.9, primele 6 rânduri).

**Reguli (4):**

- „La” = *a* (oraș, oră, cui), *in* (clădire), *da* (la cineva).
- „Pe” = *su* (pe masă), dar *a piedi, al giorno, dalla finestra, per strada, in via X*.
- „De” = *di* (conținut), *da* (pentru ce, de când), *a* (de Crăciun, de mână).
- „Pe” din „îl văd pe Marco” și din „pe 5 mai” dispare.

**Exemple (eșantion):**

| id | it | gap | ro | note |
|---|---|---|---|---|
| ptr-01 | Vado dal parrucchiere. | dal | Merg la coafor. | la + persoană: da |
| ptr-02 | Mia madre lavora in farmacia. | in | Mama lucrează la farmacie. | la + farmacie, bancă: in |
| ptr-03 | Do le chiavi a Luca. | a | Îi dau cheile lui Luca. | „lui Luca” (dativ) = a Luca |
| ptr-04 | Torno dal lavoro alle sei. | dal | Mă întorc de la serviciu la șase. | de la + loc: da |
| ptr-05 | Sono in Italia da un anno. | da | Sunt în Italia de un an. | de (încă) = da |
| ptr-06 | Vado al lavoro in bici. | in | Merg la serviciu cu bicicleta. | cu bicicleta = in bici |
| ptr-07 | L'ho buttato dalla finestra. | dalla | L-am aruncat pe fereastră. | pe fereastră = dalla finestra |
| ptr-08 | L'ho incontrato per strada. | per | L-am întâlnit pe stradă. | pe stradă = per strada |
| ptr-09 | Prendo la medicina due volte al giorno. | al | Iau medicamentul de două ori pe zi. | pe zi = al giorno |
| ptr-10 | Ho comprato degli occhiali nuovi. | degli | Mi-am cumpărat niște ochelari noi. | niște = di + gli |
| ptr-11 | Ci vediamo a Pasqua. | a | Ne vedem de Paști. | de + sărbătoare = a |
| ptr-12 | Abito in via Roma. | in | Locuiesc pe strada Roma. | pe strada X = in via X |
| ptr-13 | Penso spesso alla mia infanzia. | alla | Mă gândesc des la copilăria mea. | a se gândi la = pensare a |
| ptr-14 | Ho scoperto il ristorante su Instagram. | su | Am descoperit restaurantul pe Instagram. | pe Instagram = su |
| ptr-15 | Ho comprato un costume da bagno. | da | Mi-am cumpărat un costum de baie. | de (pentru ce) = da |
| ptr-16 | Ho risposto bene a otto domande su dieci. | su | Am răspuns corect la opt întrebări din zece. | din zece = su dieci |
| ptr-17 | Abito a Bucarest. | a | Locuiesc în București. | în + oraș = a |
| ptr-18 | Ci vediamo all'angolo della strada. | all' | Ne vedem la colțul străzii. | colț exterior: a |
| ptr-19 | Ho messo la pianta nell'angolo della stanza. | nell' | Am pus planta în colțul camerei. | colț interior: in |
| ptr-20 | Sei arrabbiata con tua sorella? | con | Ești supărată pe sora ta? | supărat pe = arrabbiato con |

Contrastul *Siamo in casa, non in giardino* (suntem înăuntru) / *Siamo a casa* (suntem acasă) rămâne doar în blocul
`examples`: propoziția are *in* de două ori, deci nu poate fi lacună.

---

## 8. Implementare

Un singur branch pentru toată funcționalitatea (de exemplu `feat/preposizioni`), din `main` actualizat, cu un singur PR la
final. Fără push sau PR fără acord.

1. **Lecția 10:** modificările din 7.0. `npm run validate`.
2. **Lecțiile 19–26:** câte un fișier în `content/grammar/`, după schema `grammarTopicSchema`; `noteIt` pentru fiecare
   exemplu; texte `ro` + `it` pentru fiecare bloc `text` / `trap`; tabele cu `captionIt` / `headIt` / `rowsIt` unde
   celulele descriptive trebuie traduse. După fiecare fișier: `npm run validate` (verifică lacunele, unicitatea `it` /
   `ro`, marcajele, numărul de blocuri și de reguli).
3. **Audio:** `npm run audio:grammar` (Francesco, Qwen3-TTS local), ascultat ce raportează scriptul ca suspect; apoi
   `npm run build:data`.
4. **Teste:** testul E2E de gramatică verifică doar primele 3 titluri, deci nu se schimbă; `npx tsc --noEmit`, testele
   unitare și E2E trebuie să treacă. Verificat în aplicație că lecțiile 19–26 apar în listă, cu nivelul corect, și că
   cele trei jocuri merg.
5. **Revizuire:** textele italiene revizuite de un vorbitor nativ (ca la celelalte lecții); punctele din secțiunea 9
   verificate întâi.

**Opțional, cod (PR separat sau în același, de hotărât):**

- **Răspunsuri alternative la lacune.** Câmp opțional `accept: string[]` în `grammarItemSchema`, folosit de `gradeGap`
  (`compareAnswer(input, [item.gap, ...item.accept])`). Ar rezolva *tra / fra*, *a / in maggio*, *in treno / sul treno*
  (obiect uitat) fără să mai excludem exemple bune. Validarea de build ar verifica doar că fiecare alternativă e un singur
  cuvânt.
- **Legături cuvânt → lecție.** În `src/domain/grammar/links.ts`, `lessonForWord` ar putea trimite cuvintele-prepoziții
  la lecția lor (`pre-di` → `preposizione-di`, `pre-da` → `preposizione-da`, `pre-in` / `pre-su` →
  `preposizioni-in-su`, `pre-con` / `pre-per` / `pre-tra` → `preposizioni-con-per-tra`, `pre-a` → `preposizione-a`).
  Id-urile exacte ale cuvintelor (`pre-a`, `pre-di`, `pre-da`, `pre-fra`) trebuie confirmate în `content/words/`.

**Efort estimat:** conținutul (8 lecții × ~20 de exemple, texte în două limbi) 2–3 zile; modificările la lecția 10 și
audio-ul câteva ore; extensia `accept` și legăturile câte o jumătate de zi.

---

## 9. Surse și puncte de verificat

**Referințe recomandate:**

- Luca Serianni, *Grammatica italiana. Italiano comune e lingua letteraria* (UTET), capitolul despre prepoziții și
  preposizioni articolate;
- Treccani: *Enciclopedia dell'italiano* (intrările pe fiecare prepoziție) și rubrica *Lingua italiana / Dubbi
  linguistici*;
- Accademia della Crusca, *Consulenza linguistica* (răspunsuri pe *a lavoro*, *col / coi*, regiunile cu articol etc.);
- Susanna Nocchi, *Grammatica pratica della lingua italiana* (Alma Edizioni), pentru ordinea și nivelul predării;
- Barbara Spinelli, Francesca Parizzi, *Profilo della lingua italiana* (La Nuova Italia), pentru nivelurile CEFR ale
  fiecărui sens.

**Puncte nesigure sau variabile (de verificat înainte de implementare):**

1. **Regiunile masculine cu articol:** *nel Lazio* pare aproape obligatoriu; *in Veneto / nel Veneto*, *in Piemonte /
   nel Piemonte* fluctuează. Nu le pun ca lacună.
2. **Ora aproximativă cu *su*:** *sulle otto* se aude, dar nu sunt sigur cât de răspândit e și dacă e regional;
   predau *verso le otto*. *Sui trent'anni, sui 50 euro* sunt sigure.
3. ***Al lavoro* / *a lavoro*:** *al lavoro* e standard; *a lavoro* e foarte răspândit în vorbire și pare criticat de
   gramatici. De confirmat cu Crusca.
4. ***Dallo psicologo* / *dal psicologo*:** *lo* înainte de *ps-* e normativ; în vorbire se aude des *il / dal*.
5. ***Mia mamma* / *la mia mamma*:** cu *mamma* și *papà* articolul fluctuează (diferențe regionale nord / sud). De
   evitat ca lacună.
6. ***Affacciarsi alla finestra* / *dalla finestra*:** ambele se folosesc; diferența (a apărea la / a se apleca peste)
   e descrierea mea, de verificat.
7. ***Uscire di casa* / *da casa*, *fuori di casa* / *fuori dalla città*:** ambele variante există; regula exactă pentru
   *fuori di / fuori da* trebuie confirmată.
8. ***Tremare dal freddo* / *di freddo*, *piangere dalla gioia* / *di gioia*:** ambele circulă; păstrez ca lacună doar
   *morire dal ridere*.
9. ***In ospedale* / *all'ospedale*, *alla posta* / *in posta*, *in spiaggia* / *sulla spiaggia*, *per terra* / *a
   terra*, *in balcone* / *sul balcone*:** variații regionale sau de nuanță; nu le pun ca lacună.
10. **Partitivul după prepoziție** (*con degli amici*): admis în vorbire, evitat în scrisul îngrijit; de confirmat
    formularea.
11. **Orașe cu articol în nume:** *alla Spezia* / *a La Spezia*; ambele circulă.
12. ***Giocare a calcio* / *al calcio*:** *a calcio* e forma de azi; *al calcio* e mai veche.
13. ***Col / coi* în scris:** le prezint ca acceptate dar opționale; de confirmat cât de neutre sunt în scrisul de azi.
14. ***In treno* / *sul treno* pentru un obiect uitat:** ambele se aud; nu le pun ca lacună fără extensia `accept`.
15. **Tema „Poziția obiectelor”** (`content/topics/15-pozitia-obiectelor.json`) spune „*su* = pe (în contact), *sopra* =
    deasupra”. În vorbire *sopra* se folosește des și cu contact (*il libro è sopra il tavolo*). Nu ține de planul de
    față, dar merită revăzută formularea.
16. **Nivelurile A1 / A2 / B1** din tabel și de la fiecare sens sunt estimate; de comparat cu *Profilo della lingua
    italiana*.
17. **Traducerile românești** pentru expresii fără echivalent direct (*alla romana* = „fiecare plătește partea lui”,
    *da amico* = „ca prieten”, *in affitto* = „cu chirie”) trebuie citite încă o dată de un vorbitor nativ.
