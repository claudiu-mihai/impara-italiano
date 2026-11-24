# Modi di dire: idiomuri italiene în dicționar, într-o temă și în Flux

## Problema

Aplicația are 68 de expresii în dicționar și 25 de itemi `espressione` în pachetul Fluxului. Aproape toate sunt formule funcționale („sono le tre”, „a destra”) sau interjecții („Boh!”, „Figurati!”), care se înțeleg cuvânt cu cuvânt. Idiomuri propriu-zise, al căror sens nu reiese din cuvinte, există doar unul: „In bocca al lupo”. Utilizatorul a ajuns cu vocabularul la B1–B2, nivelul la care idiomurile apar în vorbire.

## Decizii

1. **Dicționar.** Fiecare idiom e o intrare `pos: "expression"`, cu id `e-<it cu _ în loc de spații>`, eticheta `idiom` și nivelul dat în `content/levels.json` (B1 sau B2; două idiomuri deja populare sunt A2). Așa primește automat cartonașe FSRS, căutare, pagină proprie, propoziții pentru „Reconstruire propoziție” și audio. `note` are forma `Literal: «<literal>». În română: «<echivalent>».`, iar partea a doua lipsește când nu există echivalent.
2. **Temă.** `content/topics/43-modi-di-dire.json`, cu id `modi-di-dire`, grupul `conversatie`, nivelul `B2` și exercițiul `match`. Nivelul temei e cel mai mare nivel al cuvintelor ei (regula din `loadTopics`), iar în interfață e doar o insignă. Subgrupurile sunt cele șase grupuri din tabel. Regulile (`rules`) explică ce e un „modo di dire”, iar `contrast.ro` explică cele trei categorii de potrivire cu româna.
3. **Flux.** Un tip nou de item în pachet, `modo-di-dire` (prefix de id `modo-`, fișier `content/feed/modi-di-dire.json`), pentru fiecare idiom din tabel, mai puțin cele două care au deja card `espressione` („in bocca al lupo”, „non vedere l'ora”). Față de ceilalți itemi simpli, are în plus:
   - `literal`: traducerea cuvânt cu cuvânt în română;
   - `roEquivalent` (opțional): idiomul românesc corespunzător;
   - `match`: categoria de potrivire cu româna.

   Fiecare item are obligatoriu un test (`quiz`) despre sens și `wordIds` cu intrarea din dicționar. Itemii `modo-di-dire` pot fi B2, ceilalți itemi ai pachetului rămân A1–B1.
4. **Categoriile de potrivire (`match`):**
   - `same`: aceeași imagine ca în română (*rompere il ghiaccio* = a sparge gheața);
   - `twist`: aceeași imagine, alt detaliu, deci o capcană (*essere al settimo cielo* = a fi în al **nouălea** cer);
   - `different`: altă imagine (*essere al verde* = a fi lefter).

   La `same` și `twist`, echivalentul e obligatoriu. La `different` poate lipsi.
5. **Cardul din Flux** arată, în plus față de un item simplu:
   - „Cuvânt cu cuvânt: «…»” / „Alla lettera: «…»”;
   - o insignă cu categoria;
   - „În română: «…»” / „In rumeno: «…»”, doar când există echivalent.

   Eticheta cardului: „Expresie idiomatică” / „Modo di dire”.
6. **Audio:** vocea lui Francesco, local (Qwen3-TTS), cu generatoarele existente. Intrările din dicționar intră în audio-ul cuvintelor (`WORD_AUDIO_LEVELS` include deja A1–B2), iar itemii din Flux în audio-ul pachetului (`it` și `example`).
7. **Fără** secțiunea „Expresii cu acest cuvânt” pe pagina cuvintelor din idiom (ex. *occhio*); se poate adăuga ulterior.

## Conținutul

Textele de mai jos se folosesc exact cum sunt scrise. Exemplele, explicațiile și testele se scriu la implementare. Echivalentele românești trebuie verificate de un vorbitor nativ înainte de merge.

Grupuri: **corpo** (Corpo / Corpul), **cibo** (Cibo / Mâncare), **animali** (Animali / Animale), **soldi** (Soldi e lavoro / Bani și muncă), **tempo** (Tempo e natura / Vreme și natură), **stati** (Stati d'animo e rapporti / Stări și relații).

| # | it (forma din dicționar) | sens (`ro`) | literal | echivalent RO | match | nivel | grup |
|---|---|---|---|---|---|---|---|
| 1 | costare un occhio della testa | a costa foarte mult | a costa un ochi din cap | a costa ochii din cap | twist | B1 | corpo |
| 2 | in gamba | priceput, descurcăreț | în picior | — | different | B1 | corpo |
| 3 | avere le mani bucate | a cheltui banii ușor | a avea mâinile găurite | a fi mână spartă | twist | B2 | corpo |
| 4 | non avere peli sulla lingua | a spune lucrurilor pe față | a nu avea peri pe limbă | a spune verde în față | different | B2 | corpo |
| 5 | a occhio e croce | cam, cu aproximație | din ochi și cruce | din ochi | twist | B2 | corpo |
| 6 | mettere le mani avanti | a se acoperi dinainte | a pune mâinile înainte | — | different | B2 | corpo |
| 7 | avere la testa fra le nuvole | a fi distrat, visător | a avea capul printre nori | a fi cu capul în nori | same | B1 | corpo |
| 8 | perdere la testa | a-și pierde controlul (sau a se îndrăgosti nebunește) | a pierde capul | a-și pierde capul | same | B1 | corpo |
| 9 | a bocca aperta | uimit | cu gura deschisă | cu gura căscată | same | B1 | corpo |
| 10 | acqua in bocca | să nu spui nimănui | apă în gură | gura mută! | twist | B1 | corpo |
| 11 | prendere in giro | a lua peste picior | a lua în tur | a lua peste picior | different | B1 | corpo |
| 12 | a quattr'occhi | între patru ochi | la patru ochi | între patru ochi | same | B1 | corpo |
| 13 | essere tutto orecchi | a asculta cu mare atenție | a fi numai urechi | a fi numai urechi | same | B1 | corpo |
| 14 | essere una buona forchetta | a mânca mult și cu poftă | a fi o furculiță bună | — | different | B1 | cibo |
| 15 | fare la scarpetta | a șterge sosul din farfurie cu pâine | a face pantofiorul | — | different | B1 | cibo |
| 16 | essere come il cacio sui maccheroni | a veni exact când trebuie | a fi ca brânza pe macaroane | a pica la fix | different | B2 | cibo |
| 17 | tutto fa brodo | orice ajută | totul face supă | — | different | B2 | cibo |
| 18 | avere le mani in pasta | a fi implicat într-o afacere | a avea mâinile în aluat | — | different | B2 | cibo |
| 19 | non è pane per i miei denti | e prea greu pentru mine | nu e pâine pentru dinții mei | nu e de nasul meu | twist | B2 | cibo |
| 20 | dire pane al pane e vino al vino | a vorbi direct, fără ocolișuri | a spune pâinii pâine și vinului vin | a spune lucrurilor pe nume | twist | B2 | cibo |
| 21 | andare liscio come l'olio | a merge fără probleme | a merge neted ca uleiul | a merge ca uns | twist | B2 | cibo |
| 22 | essere un pezzo di pane | a fi foarte bun la suflet | a fi o bucată de pâine | a fi bun ca pâinea caldă | twist | B1 | cibo |
| 23 | in bocca al lupo | baftă (se răspunde «crepi!») | în gura lupului | baftă! | different | A2 | animali |
| 24 | avere una fame da lupi | a fi lihnit | a avea o foame de lupi | a-i fi foame ca unui lup | same | B1 | animali |
| 25 | essere un pesce fuor d'acqua | a nu se simți la locul lui | a fi un pește afară din apă | a fi ca peștele pe uscat | same | B1 | animali |
| 26 | prendere due piccioni con una fava | a rezolva două lucruri deodată | a prinde doi porumbei cu un bob | a împușca doi iepuri dintr-o lovitură | twist | B2 | animali |
| 27 | chi dorme non piglia pesci | cine nu se mișcă nu obține nimic | cine doarme nu prinde pești | cine se scoală de dimineață departe ajunge | different | B2 | animali |
| 28 | avere la pelle d'oca | a se înfiora | a avea piele de gâscă | a avea pielea de găină | twist | B1 | animali |
| 29 | piangere lacrime di coccodrillo | a regreta prefăcut | a plânge lacrimi de crocodil | a plânge cu lacrimi de crocodil | same | B1 | animali |
| 30 | essere testardo come un mulo | a fi foarte încăpățânat | a fi încăpățânat ca un catâr | a fi încăpățânat ca un catâr | same | B1 | animali |
| 31 | dormire come un ghiro | a dormi adânc | a dormi ca un pârș | a dormi ca un buștean | twist | B1 | animali |
| 32 | cane non mangia cane | cei de-o teapă nu se atacă între ei | câine nu mănâncă câine | corb la corb nu-și scoate ochii | twist | B2 | animali |
| 33 | menare il can per l'aia | a o lungi, a amâna | a mâna câinele prin arie | a trage de timp | different | B2 | animali |
| 34 | essere come cane e gatto | a se certa mereu | a fi ca câinele și pisica | a fi ca câinele cu pisica | same | B1 | animali |
| 35 | essere al verde | a nu avea bani | a fi la verde | a fi lefter | different | B1 | soldi |
| 36 | fare il ponte | a lua liber între o sărbătoare și weekend | a face podul | a face punte | same | B1 | soldi |
| 37 | tirare la cinghia | a economisi strict | a trage cureaua | a strânge cureaua | twist | B2 | soldi |
| 38 | non avere un soldo | a nu avea niciun ban | a nu avea un ban | a nu avea un sfanț | same | B1 | soldi |
| 39 | fare le ore piccole | a sta treaz până târziu | a face orele mici | a sta până la ore mici | twist | B1 | soldi |
| 40 | tagliare la corda | a o șterge | a tăia frânghia | a o lua la sănătoasa | different | B2 | soldi |
| 41 | stare con le mani in mano | a sta degeaba | a sta cu mâinile în mână | a sta cu mâinile în sân | twist | B2 | soldi |
| 42 | piove a catinelle | plouă foarte tare | plouă cu ligheanele | plouă cu găleata | twist | B1 | tempo |
| 43 | cadere dalle nuvole | a fi luat prin surprindere | a cădea din nori | a pica din lună | twist | B2 | tempo |
| 44 | essere al settimo cielo | a fi foarte fericit | a fi în al șaptelea cer | a fi în al nouălea cer | twist | B1 | tempo |
| 45 | fare un buco nell'acqua | a încerca degeaba | a face o gaură în apă | a căra apă cu ciurul | twist | B2 | tempo |
| 46 | dopo la pioggia viene il sereno | după necazuri vine și binele | după ploaie vine senin | după ploaie vine și soare | same | B1 | tempo |
| 47 | toccare ferro | a se feri de ghinion | a atinge fier | a bate în lemn | twist | B1 | tempo |
| 48 | rompere il ghiaccio | a începe o conversație | a sparge gheața | a sparge gheața | same | B1 | tempo |
| 49 | non vedere l'ora | a abia aștepta | a nu vedea ora | abia aștept | different | A2 | stati |
| 50 | avere un diavolo per capello | a fi foarte furios | a avea un drac pe fiecare fir de păr | a-i sări muștarul | different | B2 | stati |
| 51 | farsi in quattro | a face tot posibilul | a se face în patru | a se rupe în patru | twist | B2 | stati |
| 52 | avere un chiodo fisso | a avea o obsesie | a avea un cui fix | a avea o idee fixă | twist | B2 | stati |
| 53 | essere giù di morale | a fi abătut | a fi jos de moral | a avea moralul la pământ | twist | B1 | stati |
| 54 | fare una figuraccia | a se face de râs | a face o figură urâtă | a se face de râs | different | B1 | stati |
| 55 | trattare con i guanti | a trata cu delicatețe | a trata cu mănușile | a trata cu mănuși | same | B2 | stati |
| 56 | vedere tutto rosa | a fi optimist | a vedea totul roz | a vedea totul în roz | same | B1 | stati |
| 57 | mettersi nei panni di qualcuno | a se pune în locul cuiva | a se pune în hainele cuiva | a se pune în pielea cuiva | twist | B1 | stati |
| 58 | essere sulla stessa barca | a fi în aceeași situație | a fi în aceeași barcă | a fi în aceeași barcă | same | B1 | stati |
| 59 | fare finta di niente | a se preface că nu știe | a se preface de nimic | a se face că plouă | different | B1 | stati |
| 60 | rompere le scatole | a sâcâi | a sparge cutiile | a călca pe nervi | different | B1 | stati |

Itemii 23 și 49 intră doar în dicționar și în temă. Cardurile lor `espressione` existente (`espr-in-bocca-al-lupo`, `espr-non-vedo-lora`) primesc la începutul listei `wordIds` și intrarea nouă din dicționar, păstrând cuvintele pe care le au deja.

## Criterii de acceptare

- Cele 60 de idiomuri sunt în dicționar (nivelurile din tabel), în tema „Modi di dire” (cu potrivire) și, mai puțin 23 și 49, în Flux, cu literal, categorie și echivalent.
- `npm run validate` respinge un item `modo-di-dire` fără test, fără `wordIds`, cu `match` `same`/`twist` fără echivalent sau cu nivel C1–C2.
- Un utilizator B1 nu vede în Flux idiomuri B2.
- Toate intrările noi și toți itemii noi din Flux au audio.
