## Specificații și Plan de Dezvoltare: Aplicație Web „Impara l'Italiano”

Aplicație pentru **învățarea limbii italiene de către vorbitori nativi de limba română**, concepută ca **Progressive Web App (PWA)** mobile-first: rulează în browser pe telefon sau desktop, se poate instala pe ecranul principal și funcționează offline.

**Interfața aplicației este în limba română.**

---

### 0. Decizii cheie

| Subiect | Decizie |
| --- | --- |
| Algoritm SRS | **FSRS** prin biblioteca `ts-fsrs` (MIT), retenție țintă implicită 90% |
| Framework | **React + Vite** (aplicație client-only, fără SSR) |
| Persistență | **Dexie.js (IndexedDB)**; dicționarul ca JSON static versionat, separat de progres |
| PWA | `vite-plugin-pwa` din Faza 1 (offline-first este cerință de bază) |
| Conținut | Dicționar, exemple și conjugări **pre-generate** și incluse în aplicație; nicio cerere de rețea pentru date |
| Surse de frecvență | **FrequencyWords** (sursă principală, italiană vorbită) + **Leipzig Corpora Collection** (italiană scrisă) + **Wiktionary** (verificare); vezi §4 |
| Audio | Web Speech API (`it-IT`) cu vocile din sistem (macOS, iOS, Android, Windows); vocile de rețea doar online (vezi FR4) |
| Versionare | **Semantică** (SemVer, `MAJOR.MINOR.PATCH`), pornită de la 1.0.0; release-uri automate cu **release-please** din commit-urile conventional (`feat:`, `fix:`, `!`); CHANGELOG generat; versiunea apare în ecranul „Despre”; vezi README |
| Backend / sincronizare | **Opțional** (Faza 6): cont pe un server propriu **PocketBase** (SQLite), în spatele nginx și Traefik; fără cont, totul rămâne local, ca în versiunea 1. Backup prin export/import JSON în ambele moduri |

---

### 0.1 Niveluri CEFR (decis)

* **Scop:** italiana vorbită și înțeleasă în viața de zi cu zi; aplicație personală (fără constrângeri de publicare a listelor).
* **Șase niveluri** în date (A1, A2, B1, B2, C1, C2); conținutul se scrie **întâi pentru A1 și A2**, apoi B1.
* **Nivelul cuvintelor este estimat, nu oficial:** vine din banda în care cade rangul lemei în lista de frecvență (`content/levels.json`: A1 ≤ 500, A2 ≤ 1200, B1 ≤ 2200, B2 ≤ 3000), cu corecturi manuale (`overrides`) pentru cuvinte care nu sunt de nivelul frecvenței lor (ex. *scegliere* → A2) sau pentru cuvinte de topic cu frecvență mică (culori, zilele săptămânii). Un cuvânt fără rang de frecvență trebuie să aibă obligatoriu un override.
* **Nivelul timpurilor:** presente, passato prossimo și imperativo = A1; imperfetto, futuro, condizionale = A2; congiuntivo presente = B1. Un card de conjugare apare când nivelul lui (maximul dintre nivelul verbului și al timpului) nu depășește nivelul curent și timpul anterior este învățat (stabilitate ≥ 7 zile).
* **Nivelul curent se alege manual** în Setări. Cuvintele și timpurile noi apar doar până la el; repetițiile continuă. Când ai început toate cuvintele nivelului curent, Acasă **sugerează** (nu schimbă automat) nivelul următor.
* **Ordinea cuvintelor noi:** nivelurile mai ușoare întâi, apoi frecvența, cu câte un cuvânt gramatical (pronume, prepoziție, conjuncție) la fiecare 3 cuvinte de conținut.

---

### 1. Cerințe Funcționale (Functional Requirements)

#### **FR1. Baza de Date de Cuvinte**

* **Set de date:** 1000 de cuvinte de frecvență ridicată, livrate în tranșe (prima tranșă: 50 de verbe uzuale, lista definită în `data/verbs-50.json`).
* **Surse:** liste de frecvență pentru italiana vorbită și scrisă, combinate, aduse la forma de dicționar și filtrate (vezi §4). Traducerile și exemplele în română trec prin generare, revizuire și validare automată.
* **Categorii gramaticale:** Verb, Substantiv, Adjectiv, Adverb, Pronume, Prepoziție, Conjuncție, Numeral, Interjecție, Expresie (vezi FR2.5).
* **Tag-uri tematice** (separat de categorie): ex. `expresii`, `mâncare`, `călătorie`, `timp`.
* **Câmpuri comune ale unui card de cuvânt:**
  * `id` stabil (ex. `n-casa`) — de el depinde progresul salvat; nu se schimbă niciodată
  * Termen în italiană (*ex. parlare*)
  * Traducere în română (*ex. a vorbi*)
  * Categorie gramaticală și tag-uri
  * Rang de frecvență
  * 1–2 exemple de propoziții IT + RO
  * `falseFriend` (opțional): avertisment pentru prieteni falși cu româna (vezi mai jos)
  * `note` (opțional): observație scurtă pentru vorbitori de română
* **Câmpuri specifice pe categorie:**
  * **Substantiv:** gen (m/f), articol hotărât (*il / lo / la / l' / i / gli / le*), plural (cu marcaj pentru plural neregulat, ex. *l'uovo → le uova*)
  * **Adjectiv:** forme m/f și singular/plural
  * **Verb:** vezi FR2.4 (grupă, auxiliar, participiu, forme conjugate)
* **Nivel de stăpânire** (calculat din starea FSRS, nu setat manual):
  * *Nou* — cardul nu a fost văzut niciodată
  * *În învățare* — stabilitate < 21 zile
  * *Stăpânit* — stabilitate ≥ 21 zile
* **Specific pentru vorbitori de română:**
  * **Prieteni falși** marcați vizibil pe card: *parenti* = rude (nu părinți), *salire* = a urca (nu a sări), *fermare* = a opri, *morbido* = moale, *burro* = unt.
  * **Articolul:** în română articolul este enclitic (*casa* = „casa aceea”), în italiană este antepus (*la casa*). Substantivele se afișează **întotdeauna cu articolul**.
  * **Auxiliarul:** în română perfectul compus folosește doar „a avea” (*am mers*); în italiană se alege între *avere* / *essere* (*sono andato*). Verbele cu *essere* sunt marcate distinct.
* **Browse & căutare:** listă filtrabilă (categorie, tag, nivel) și căutare IT/RO, cu acțiune „Știu deja” pentru marcarea rapidă a cuvintelor cunoscute.

#### **FR2. Module de Învățare**

1. **Flashcards Vocabular:**
   * Două direcții, configurabile: **IT → RO** (recunoaștere) și **RO → IT** (producție).
   * La tap, cardul se rotește și arată traducerea, exemplul și eventualul avertisment de prieten fals.
   * După rotire, 4 butoane de evaluare (FSRS): **Din nou** / **Greu** / **Bine** / **Ușor**.
   * Gesturi: *swipe left* = Din nou, *swipe right* = Bine. Butoanele rămân mereu disponibile ca alternativă.

2. **Quiz / Grilă:**
   * 1 cuvânt și 4 opțiuni de răspuns, în ambele direcții.
   * Distractorii sunt aleși din **aceeași categorie gramaticală**, excluzând sinonimele și traducerile identice cu răspunsul corect.
   * Feedback vizual și sonor (sunetul poate fi dezactivat din Setări).

3. **Reconstruire Propoziție:**
   * Ordonarea cuvintelor dintr-o propoziție de exemplu (tap pe blocuri; drag-and-drop opțional).
   * Fiecare propoziție poate avea **mai multe ordini corecte** (`acceptedOrders`), deoarece ordinea cuvintelor în italiană este flexibilă și subiectul poate lipsi.
   * Punctuația este fixă (nu face parte din blocuri); comparația ignoră majusculele.

4. **Flashcards Conjugare Verbe:**
   * **Timpuri**, în ordinea utilității: presente → passato prossimo → imperativo → imperfetto → futuro semplice → condizionale presente → congiuntivo presente. Un timp se deblochează după ce cel anterior e stăpânit pentru verbul respectiv.
   * **Persoane:** io, tu, lui/lei, noi, voi, loro (cu echivalentul românesc: eu, tu, el/ea, noi, voi, ei/ele).
   * **Card:**
     ```
     Față:   parlare (a vorbi) · Passato prossimo · noi
     Spate:  abbiamo parlato      [🔊]
     ```
   * **Variante:**
     * *Flip* — autoevaluare cu cele 4 butoane FSRS; pe față: verbul, timpul și o persoană, pe spate forma (cu 🔊 normal și rar); tastele Space/Enter răstoarnă, 1–4 notează.
     * *Scrie răspunsul* (recomandat) — evaluare automată.
     * *Tabel* — completarea tuturor persoanelor deodată (6; 5 la imperativ); Enter trece la câmpul următor; după verificare fiecare rând e marcat și se arată forma corectă. Nota: toate corecte → Bine, cel puțin 2/3 → Greu, mai puțin → Din nou (o greșeală doar de accent limitează nota la Greu).
     * Varianta se alege pe ecranul de conjugare (Scrie / Flip / Tabel) sau în Setări și se păstrează; cardurile și programul de repetare sunt aceleași în toate variantele.
   * **Unitate SRS = verb × timp** (nu verb × timp × persoană, care ar genera 2100 de carduri doar pentru 50 de verbe). La fiecare repetiție se cer 3 persoane aleatorii; nota se calculează automat: 3/3 → Bine, 2/3 → Greu, ≤1/3 → Din nou.
   * **Reguli de corectare:**
     * Accentele contează (*parlerò*, *è*); o greșeală doar de accent apare ca „aproape corect” și primește nota Greu.
     * La passato prossimo cu *essere* se acceptă ambele forme de acord (*sono andato/andata*, *siamo andati/andate*).
     * Verbele reflexive includ pronumele (*mi alzo*).
   * **Ajutoare vizuale:** terminația evidențiată color; marcaj distinct pentru formele neregulate; etichetă „essere” pentru verbele cu acest auxiliar.
   * **Legătura cu vocabularul:** cardurile de conjugare ale unui verb apar abia după ce verbul a fost învățat în Flashcards Vocabular.
   * **Audio** (doar la cerere, fără redare automată):
     * **Ce se rostește:** forma cu pronumele, ca legătura persoană–formă să se fixeze și auditiv:

       | Caz | Pe ecran | Se rostește |
       | --- | --- | --- |
       | Timpuri obișnuite | noi · abbiamo parlato | *noi abbiamo parlato* |
       | lui/lei | lui/lei · parla | *lui parla* |
       | Congiuntivo | io · parli | *che io parli* |
       | Imperativo | tu · parla | *Parla!* (fără pronume) |
       | Mai multe forme acceptate | va' / vai · sono andato/andata | prima formă fără apostrof (*vai*) · prima formă (*sono andato*) |
       | Reflexive | io · mi alzo | *io mi alzo* |

     * **Sesiunea de conjugare:** 🔊 lângă infinitiv pe fața cardului; după „Verifică”, 🔊 pentru forma corectă (indiferent de răspuns) și 🐢 pentru aceeași formă rostită mai încet (viteză 0,6).
     * **Tabelele din pagina verbului:** tap pe un rând redă forma lui (tot rândul e zona de atingere, minim 48px); **▶ Ascultă tot** pe fiecare timp citește toate persoanele în ordine, cu rândul curent evidențiat; în timpul redării butonul devine **■ Oprește**.
     * **Variantele Flip și Tabel:** 🔊 pe spatele cardului la Flip; ▶ Ascultă tot după verificare la Tabel.
     * Fără voce italiană sau fără internet, butoanele se comportă ca în FR4.

5. **Teme (vocabular grupat):**
   * Liste de cuvinte uzuale **alcătuite și ordonate manual** (luni → duminică, nu după frecvență), spre deosebire de tag-urile din Dicționar, care sunt doar etichete.
   * **Acces:** card „Teme” în pagina Învață (`/learn/topics`) și link „Vezi tema” pe pagina cuvântului.
   * **O temă are:**
     * **Fișa temei** — cuvintele pe subgrupe, cu 🔊, și 2–4 reguli scurte pentru vorbitori de română (ex. *lunedì* = luni, dar *il lunedì* = lunea; *il primo maggio*, dar *il due maggio*; *sono le tre*, dar *è l'una*; *fa caldo*, nu *è caldo*; *sul tavolo*, *davanti **a***).
     * **Studiază tema** — Flashcards și Quiz doar cu cuvintele temei (scadente + noi), pe aceleași carduri FSRS ca restul aplicației: progresul este comun.
     * **Exerciții specifice**, după tipul temei.
   * **Lista de teme:**

     | Grup | Teme | Nivel |
     | --- | --- | --- |
     | **Timp** | ★ Zilele săptămânii · ★ Lunile anului · ★ Anotimpurile · ★ Momentele zilei (*mattina, pomeriggio, stasera, stanotte, mezzogiorno*) · ★ Cum ne referim la zile (*oggi, dopodomani, l'altro ieri, due giorni fa, fra una settimana, la settimana scorsa/prossima*) · ★ Ora · Data și anul · Frecvența (*di solito, a volte, una volta alla settimana*) | A1–A2 |
     | **Numere** | ★ Cardinale 0–20 · ★ 21–100 · 100–1.000.000 · ★ Ordinale (*primo… decimo, -esimo*) · Fracții și cantități (*mezzo, metà, un paio, una dozzina, un etto, un chilo*) · Prețuri și bani | A1–A2 |
     | **Spațiu** | ★ Poziția obiectelor (*davanti a, dietro, sopra/su, sotto, dentro, fuori, accanto a, tra, di fronte a, in mezzo a, in fondo*) · ★ Direcții (*a destra, dritto, gira, all'angolo, il semaforo*) · Aici/acolo (*qui, qua, lì, là*) | A1 |
     | **Oameni** | Familia · Corpul · Stări și emoții · Descrierea unei persoane · Profesii · Țări și naționalități | A1–A2 |
     | **Zi de zi** | Casa (camere, mobilă) · Rutina zilnică (verbe reflexive) · Haine · ★ Culorile · Vremea (*fa caldo, piove, c'è il sole*) · Mesele zilei · La bar · La piață / supermarket | A1–A2 |
     | **Oraș și călătorii** | Locuri în oraș · Transport · La gară / aeroport · La hotel · La medic / farmacie · Urgențe | A1–A2 |
     | **Conversație** | ★ Saluturi și politețe (inclusiv *tu / Lei*) · ★ Cuvinte de întrebare (*chi, che cosa, dove, quale, quanto/a/i/e*) · Expresii din italiana vorbită (*dai, boh, magari, figurati, ecco, insomma, mi raccomando*) · Conectori (*però, quindi, invece, comunque, anzi*) · Contrarii (*grande ↔ piccolo*) | A1–A2 |

     ★ = prima etapă (vezi Faza 4).
   * **Exerciții:**

     | Exercițiu | Pentru | Descriere |
     | --- | --- | --- |
     | **Potrivește perechi** | orice temă | 5 perechi IT ↔ RO o dată, tap pe un cuvânt din fiecare coloană |
     | **Ordonează** | zile, luni, anotimpuri, ordinale | aranjarea elementelor în ordine + întrebări „Ce urmează după *martedì*?” |
     | **Ascultă și scrie cifrele** | numere, prețuri | TTS spune *trecentoquarantadue* → se scrie 342; invers: 342 → se scrie numărul în litere |
     | **Ceasul** | ora | cadran SVG → se scrie ora (*sono le sette meno un quarto*); invers: ora în litere → se alege cadranul corect |
     | **Unde e pisica?** | poziția obiectelor | scenă SVG (o cutie, o masă și o pisică în ~12 poziții) → se alege sau se scrie prepoziția (*sotto il tavolo*, *dentro la scatola*) |

   * **Itemi generați (numere, ora):** nu se scriu de mână, ci se generează din reguli (inclusiv *ventuno, ventotto, trentatré, duemila, è l'una, mezzogiorno*). **Unitatea SRS este abilitatea** (ex. „numere 0–20”, „numere 21–100”, „ora”), nu fiecare număr, după același model ca verb × timp: la fiecare repetiție 3–5 itemi aleatorii, notă automată (toți corecți → Bine, unul greșit → Greu, mai mulți → Din nou).
   * **Expresii:** expresiile din mai multe cuvinte (*che ore sono, fa caldo, due giorni fa*) se adaugă în dicționar cu categoria nouă **Expresie**.

#### **FR3. Repetiție Spațiată (SRS) — FSRS**

* Algoritm **FSRS** prin `ts-fsrs`, cu parametrii impliciți și **retenție țintă 90%** (configurabilă în Setări, interval 80–95%).
* Fiecare card stochează: `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `lastReview`.
* Fiecare evaluare se salvează într-un **jurnal de repetiții** (`reviewLog`), pentru statistici și pentru optimizarea ulterioară a parametrilor FSRS pe baza datelor proprii (după ~1000 de repetiții).
* **Ce actualizează SRS:**
  * Flashcards Vocabular și Flashcards Conjugare — da.
  * Quiz — da: răspuns corect → Bine, greșit → Din nou.
  * Reconstruire Propoziție — nu (exercițiu de consolidare).
  * Teme: Studiază tema — da (aceleași carduri ca Flashcards și Quiz); Ascultă și scrie cifrele și Ceasul — da, pe unitatea „abilitate” (FR2.5); Potrivește perechi, Ordonează și Unde e pisica? — nu (consolidare).
* **Sesiunea zilnică:**
  * Cardurile scadente (`due ≤ acum`) + **cuvinte noi pe zi** (implicit 10, configurabil).
  * **Limită zilnică de repetiții** (implicit 100, configurabilă); cardurile restante peste limită se reportează în zilele următoare, cele mai întârziate primele.
  * Ziua de studiu începe la **04:00 ora locală**.
* Se activează `fuzz` (variație mică a intervalelor) pentru a evita aglomerarea cardurilor în aceeași zi.

#### **FR4. Pronunție Audio**

* **Web Speech API** (`speechSynthesis`) cu limba `it-IT`, viteză configurabilă.
* **Vocile din sistemul de operare au prioritate.** Pe macOS (Safari și Chrome), iOS, Android și Windows, `speechSynthesis` expune vocile instalate în sistem; ele funcționează și **fără internet**. Vocile de rețea (ex. „Google italiano” din Chrome) se folosesc doar online.
* **Alegerea vocii:** automat se ia vocea locală italiană de calitatea cea mai bună (cele „Enhanced”/„Premium” de pe macOS primele); utilizatorul poate alege altă voce în Setări, cu buton de test. Pe Mac se pot instala voci mai bune din Setări de sistem → Accesibilitate → Conținut vorbit → Voce de sistem → Gestionează vocile.
* **Detecția vocilor:** lista se obține prin `getVoices()` + evenimentul `voiceschanged`; se alege prima voce `it-IT` disponibilă.
* **Redare în serie:** mai multe fraze se pot citi una după alta (ex. un tabel de conjugare), cu posibilitatea de oprire; o redare nouă o oprește pe cea în curs.
* **Fără redare automată:** audio pornește doar când utilizatorul apasă un buton (excepție: exercițiul „Ascultă și scrie cifrele”, unde audio este chiar întrebarea).
* **Fără conexiune și fără voce italiană locală:** butonul 🔊 devine inactiv, cu indicația „Audio necesită internet”.
* **Fără voce italiană** pe dispozitiv: butonul 🔊 se ascunde și apare o singură dată un mesaj cu instrucțiuni de instalare a vocii (Android: setări TTS; iOS: Setări → Accesibilitate → Conținut vorbit).

#### **FR5. Progres și Statistici**

* **Streak:** zile consecutive în care s-au făcut **minim 10 repetiții** (ziua începe la 04:00).
* **Progres total:** procentaj stăpânit din cele 1000 de cuvinte și separat pentru conjugări (verb × timp).
* **Grafic zilnic** (ultimele 7 / 30 de zile): număr de repetiții, cuvinte noi învățate, rată de răspunsuri corecte.
* **Prognoză:** câte carduri devin scadente în următoarele 7 zile.

#### **FR6. Setări și Date**

* Cuvinte noi pe zi, limită zilnică de repetiții, retenție țintă FSRS.
* Direcția implicită a cardurilor (IT → RO, RO → IT, mixt).
* Viteza TTS, sunete activate / dezactivate.
* Temă: automat (sistem) / luminos / întunecat.
* **Export / import progres** (fișier JSON) ca backup și pentru mutarea pe alt dispozitiv.
* **Resetare progres** (cu confirmare).

#### **FR6.1. Cont și sincronizare (opțional)**

* **Două moduri:** **fără cont** (implicit, ca până acum: totul local) și **autentificat** (progresul se sincronizează cu serverul). Aplicația nu cere niciodată autentificarea; butonul „Autentifică-te” este doar în Setări.
* **Fiecare utilizator pe telefonul lui;** nu există mai multe profiluri pe același dispozitiv.
* **Conturile** se creează **din aplicație** (Setări → Cont → „Cont nou”: email, parolă, confirmare) sau de administrator din panoul PocketBase. **Înregistrarea este liberă**; singura protecție este o limită de 5 conturi pe oră de pe aceeași adresă IP. Emailul se salvează cu litere mici; parola are 8–71 de caractere. **Parola uitată se resetează doar de administrator** (resetarea prin email ar cere un server SMTP). Cine nu vrea înregistrare liberă o poate închide din panou.
* **Ce se sincronizează:** cardurile (inclusiv abilitățile din Teme), jurnalul de repetiții, setările (**fără vocea aleasă**, care diferă de la un dispozitiv la altul) și semnalările de greșeli. Conținutul (cuvinte, teme) nu se sincronizează: vine cu aplicația.
* **Când:** la pornire, la revenirea conexiunii, la sfârșitul fiecărei sesiuni și la „Sincronizează acum”. Aplicația funcționează offline ca înainte; modificările așteaptă într-o coadă locală.
* **Prima autentificare pe un dispozitiv:**
  * progres doar local → se urcă automat în cont;
  * progres doar în cont → se descarcă;
  * progres în ambele → o singură întrebare: **„Combină cu contul”** sau **„Folosește doar progresul din cont”** (protejează contul când te autentifici pe telefonul altcuiva).
* **Deconectare:** se verifică întâi că nu există modificări netrimise (altfel avertisment, cu opțiunea de a sincroniza întâi); apoi datele de pe telefon se șterg și aplicația revine la modul fără cont, curată.
* **Sesiune expirată sau server indisponibil:** studiul continuă local; în Setări apare „Autentifică-te din nou”, fără pierderea modificărilor din coadă.
* **Import de backup când ești autentificat:** înlocuiește progresul și în cont, după o confirmare explicită. **Resetarea progresului** șterge și datele din cont. Celelalte dispozitive deja sincronizate primesc cardurile modificate, dar nu și ștergerea istoricului (jurnalul este doar-adăugare); pentru o curățare completă, un dispozitiv se deconectează și se reconectează cu „Folosește doar progresul din cont”.
* **Ștergerea contului:** buton în Setări care **cere parola**; șterge contul și toate datele lui de pe server, iar telefonul revine la modul fără cont. Merge și cu sesiunea expirată (parola reautentifică).
* **În Setări, secțiunea „Cont”:** starea („Sincronizat acum 2 minute”, „3 modificări în așteptare”, „Offline”), „Sincronizează acum”, „Deconectează-te”, „Șterge contul”.
---

### 2. Cerințe Non-Funcționale & UI/UX Mobile-First

* **Design Mobile-First Responsive:** operare cu o singură mână (acțiunile principale în partea de jos a ecranului), zone de atingere de minim 48×48px.
* **Gesturi Mobile:** swipe în Flashcards, cu zonă de start departe de marginile ecranului, pentru a nu intra în conflict cu gestul „back” din iOS / Android.
* **Offline-First:**
  * Service worker (`vite-plugin-pwa`) care pune în cache aplicația și dicționarul; aplicația funcționează complet fără internet; audio funcționează offline dacă există o voce italiană locală (FR4).
  * La o versiune nouă se afișează mesajul „Versiune nouă disponibilă — Reîncarcă”.
* **Persistența datelor:**
  * Dicționarul este un JSON static versionat (`dataVersion`), inclus în build.
  * Progresul este stocat în IndexedDB (Dexie), indexat după `id`-ul cuvântului; la actualizarea dicționarului progresul existent se păstrează.
  * Se cere `navigator.storage.persist()` la prima utilizare.
  * **Risc:** Safari iOS poate șterge datele site-urilor nefolosite 7 zile dacă aplicația nu este instalată pe ecranul principal → aplicația recomandă instalarea și amintește periodic de export. Cu cont (FR6.1), riscul dispare: progresul este și pe server.
* **Dark Mode:** automat după setarea sistemului, cu posibilitate de suprascriere manuală.
* **Accesibilitate:** respectarea `prefers-reduced-motion` (fără animația de rotire), etichete ARIA pe butoane, contrast WCAG AA.
* **Performanță:** LCP < 1.5s pe un telefon Android de gamă medie, pe 4G; animațiile folosesc doar `transform` / `opacity` pentru 60 FPS.
* **Confidențialitate:** fără tracking; **contul este opțional**. Fără cont, toate datele rămân pe dispozitiv și aplicația nu face nicio cerere către server. Cu cont, progresul se sincronizează doar cu serverul propriu (PocketBase), nu cu servicii terțe.

---

### 3. Arhitectură Tehnologică

| Componentă | Tehnologie | Motiv |
| --- | --- | --- |
| **Framework Frontend** | React + Vite + TypeScript | Aplicație client-only; SSR-ul nu aduce beneficii pentru o aplicație offline. |
| **PWA** | `vite-plugin-pwa` (Workbox) | Manifest, service worker și flux de actualizare cu configurare minimă. |
| **Styling & UI** | Tailwind CSS + shadcn/ui | Interfețe responsive mobile-first, componente accesibile. |
| **Routing** | React Router | Navigare între module; rutele grele se încarcă lazy. |
| **Validare date** | Zod | Aceleași scheme validează conținutul la build și backup-ul la import. |
| **Persistență** | Dexie.js (IndexedDB) + `dexie-react-hooks` | Interogări reactive (`useLiveQuery`) direct din baza de date locală. |
| **Stare UI** | Zustand | Doar pentru starea sesiunii curente (ex. cardul afișat); datele persistente stau în Dexie. |
| **SRS** | `ts-fsrs` | Implementare FSRS testată, TypeScript, rulează în browser. |
| **Animații & Gesturi** | Motion (fost Framer Motion) | Rotirea cardurilor și swipe cu suport pentru gesturi. |
| **Grafice** | Grafic cu bare propriu (`ui/BarChart.tsx`) | Statisticile cer doar bare simple; evită o dependență de ~100 KB. |
| **Audio** | Browser SpeechSynthesis API | Fără costuri de hosting audio. |
| **Testare** | Vitest + Playwright | Teste unitare pentru SRS / corectare / conjugări; E2E pentru fluxurile principale. |
| **Hosting** | Cloudflare Pages / Netlify / Vercel | Gratuit, deploy automat din Git, CDN global. |

Detalii de arhitectură (straturi, structura de directoare, modelul de date, fluxuri): [architecture.md](architecture.md).

---

### 4. Flux de Conținut (paralel cu dezvoltarea)

Conținutul este partea cea mai costisitoare a proiectului și se tratează ca flux separat, livrat în tranșe. Întreaga bază de date este construită înainte de build și inclusă în aplicație ca fișiere JSON.

* **Surse de frecvență:**

  | Sursă | Conținut | Licență | Rol |
  | --- | --- | --- | --- |
  | [FrequencyWords](https://github.com/hermitdave/FrequencyWords) `it_50k` | 50.000 de forme, din subtitrări (OpenSubtitles 2018) | CC BY-SA 4.0 | **Principală** — italiana vorbită, de zi cu zi |
  | [Leipzig Corpora Collection](https://wortschatz.uni-leipzig.de/en/download/ita) | Liste de frecvență și propoziții din știri, web și Wikipedia | CC BY 4.0 | **Complementară** — italiana scrisă; echilibrează lista principală |
  | [Wiktionary: Frequency lists/Italian](https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Italian) | Top 1000 și top 50.000 din subtitrări | CC BY-SA | **Verificare** — aceeași origine ca FrequencyWords; folosită pentru controlul încrucișat |
  | [frequencylists.blogspot.com — verbe](https://frequencylists.blogspot.com/2015/05/300-most-frequently-used-italian-verbs.html) | 50 de verbe cu exemple și traduceri în engleză | Fără licență declarată | **Doar orientativ** pentru lista de verbe; conținutul nu se copiază |

  Observații:
  * Lista de pe blog nu indică un corpus, iar ordinea pare preluată dintr-o listă engleză (*ottenere* „get” pe locul 6, *desiderare* „want” pe locul 9). Ranguri nu se preiau de aici.
  * Toate listele numără **forme**, nu leme (*è, sono, era* apar separat), deci lematizarea este obligatorie.

* **Selecția celor 1000 de cuvinte:**
  1. **Lematizare:** formele flexionare se reduc la forma de dicționar (*è, sono, era → essere*; *ho, hai → avere*), iar frecvențele se însumează, separat pentru fiecare sursă.
  2. **Filtrare:** se elimină nume proprii, interjecții, cuvinte vulgare și resturi de subtitrare.
  3. **Scor combinat:** media ponderată a rangurilor — **70% FrequencyWords** (vorbit) + **30% Leipzig** (scris). Lemele bine plasate în ambele surse urcă; cele frecvente doar în texte formale coboară.
  4. **Control încrucișat:** cuvintele din top 1000 Wiktionary care lipsesc din selecție sunt revizuite manual.
  5. Se păstrează primele 1000 de leme, cu categorie gramaticală și rang de frecvență.
* **Licențe și atribuire:**
  * Ecranul „Despre” menționează FrequencyWords (CC BY-SA 4.0), Leipzig Corpora Collection (CC BY 4.0) și Wiktionary (CC BY-SA).
  * Lista derivată de cuvinte și ranguri se publică sub **CC BY-SA 4.0** (condiția ShareAlike).
  * Propozițiile din corpusul Leipzig nu se copiază ca exemple; exemplele din aplicație sunt scrise separat.
* **Tranșe:** 50 de verbe → apoi câte ~200 de cuvinte, ordonate după frecvență.
* **Conjugări:** generate printr-un script, nu scrise manual:
  * verbele regulate (-are / -ere / -ire / -ire cu -isc-) — generate din reguli;
  * verbele neregulate — scrise explicit, apoi comparate automat cu o sursă de referință (ex. Wiktionary prin exporturile kaikki.org, licență CC BY-SA, cu atribuire în aplicație).
* **Script de validare** (rulează în CI):
  * `id`-uri unice și stabile;
  * câmpuri obligatorii completate per categorie (gen și articol la substantive, auxiliar și participiu la verbe);
  * categorie și tag-uri din lista permisă;
  * toate formele de conjugare prezente pentru timpurile declarate;
  * conjugările generate comparate cu sursa de referință;
  * fiecare id de cuvânt referit de o temă există în dicționar, iar nivelul temei nu e mai mic decât al cuvintelor ei.
* **Teme:** fișiere `content/topics/*.json` (`id`, titlu, grup, nivel, reguli, subgrupe ordonate de id-uri de cuvinte). Temele refolosesc cuvintele existente (multe au deja tag-uri tematice: zilele săptămânii, lunile anului, numere, loc, culori); cuvintele și expresiile lipsă (*dopodomani, stamattina, accanto, che ore sono*) trec prin același flux (drafts → `enrich` → validare), cu override de nivel. Regulile de pe fișe trec prin aceeași revizuire ca traducerile.
* **Revizuirea traducerilor:** fiecare tranșă trece printr-o a doua trecere de revizuire, separată de generare, axată pe:
  * sensul principal al cuvântului (cel mai frecvent, nu cel din dicționar);
  * exemple naturale, scurte, care folosesc doar cuvinte din tranșele deja învățate, acolo unde e posibil;
  * prieteni falși și note pentru vorbitori de română.
* **Raportare erori în aplicație:** buton „Semnalează o greșeală” pe card; semnalările se salvează local și apar în exportul JSON, pentru corectare în tranșa următoare.

---

### 5. Faze de Implementare (Roadmap)

```
[Faza 1: Fundație]        [Faza 2: SRS & Conjugare]     [Faza 3: Exerciții & Polish]    [Faza 4: Teme]
• Setup + PWA offline      • FSRS + teste                • Reconstruire propoziție        • Fișe + Studiază tema
• Model de date + Dexie    • Quiz 4 opțiuni              • Conjugare: timpuri extra       • Perechi, Ordonează
• Flashcards vocabular     • Conjugare (pres. + p.p.)    • Browse, căutare, „Știu deja”   • Cifre (TTS), Ceasul
• Audio cu fallback        • Statistici, streak          • Setări complete                • Unde e pisica?
• 50 verbe                 • Export / import             • Accesibilitate, performanță    • 14 teme ★
```

* **Faza 1 — Fundație (3–4 zile):** setup React + Vite + TypeScript, PWA cu service worker, modelul de date cu `id` stabil, Dexie, Flashcards vocabular (IT → RO și RO → IT) cu evaluare în 4 trepte, audio cu detecție și fallback, primele 50 de verbe.
  * **Gata când:** aplicația se instalează pe telefon, funcționează în modul avion, iar progresul rămâne după închiderea aplicației.
* **Faza 2 — SRS & Conjugare (5–6 zile):** integrare FSRS cu sesiune zilnică, limite și jurnal de repetiții; Quiz; Flashcards Conjugare (presente și passato prossimo pentru cele 50 de verbe); statistici și streak; export / import.
  * **Gata când:** testele unitare pentru planificare, notare automată și corectare trec; o sesiune zilnică afișează corect cardurile scadente și cele noi; un backup exportat se poate reimporta.
  * **Stare:** implementat — FSRS cu sesiune zilnică și limite, Quiz, Flashcards Conjugare în varianta „Scrie răspunsul” (presente și passato prossimo), statistici cu streak și prognoză, export/import, setări de bază. Variantele „Flip” și „Tabel”, tema manuală luminos/întunecat și celelalte timpuri s-au făcut în Faza 3.
* **Faza 3 — Exerciții & Polish (4–5 zile):** Reconstruire Propoziție, timpurile de conjugare rămase, browse / căutare / „Știu deja”, setări complete, accesibilitate și optimizări de performanță.
  * **Gata când:** testele E2E pentru fluxurile principale trec, iar LCP < 1.5s pe dispozitivul de referință.
  * **Stare:** implementat — Reconstruire propoziție (2928 de propoziții, generate din exemplele cuvintelor plus cele scrise manual; 16 cu mai multe ordini acceptate), conjugare la imperfetto, futuro, condizionale, imperativo (5 persoane) și congiuntivo, Dicționar cu căutare IT/RO fără diacritice, filtre, pagină de cuvânt cu tabele de conjugare și „Știu deja”, temă manuală, verificare automată de accesibilitate (axe, WCAG 2.1 AA, luminos și întunecat) și rute încărcate la cerere. LCP măsurat în emulare (procesor 4× mai lent): 0,9 s la prima încărcare pe 4G, 0,1 s la încărcările repetate, 1,3–1,4 s pe „Slow 4G”, inclusiv la un dicționar de 1000 de cuvinte (lista de bază e separată de detalii).  Variantele „Flip” și „Tabel” la conjugare sunt implementate.
* **Faza 4 — Teme (5–6 zile):** secțiunea Teme (FR2.5) cu cele 14 teme marcate ★: fișa temei, Studiază tema, Potrivește perechi, Ordonează, Ascultă și scrie cifrele, Ceasul și Unde e pisica?; generatorul de numere și ore cu teste unitare; categoria Expresie; validarea temelor în CI.
  * **Gata când:** toate temele ★ au fișă și exerciții; generatorul produce corect numerele 0–1.000.000 și orele (verificat cu teste, inclusiv cazurile *ventuno, ventotto, trentatré, è l'una, mezzogiorno, mezzanotte*); abilitățile „numere” și „ora” apar în sesiunea zilnică; testele E2E pentru o temă trec.
  * **Stare:** etapa ★ implementată — cele 14 teme (zilele, lunile, anotimpurile, momentele zilei, cum ne referim la zile, ora, numerele 0–20 și 21–100, ordinalele, poziția obiectelor, direcțiile, culorile, saluturile și cuvintele de întrebare) cu fișă și reguli, Studiază tema (Flashcards și Quiz cu aceleași carduri FSRS), Potrivește perechi, Ordonează (cu „Ce urmează după…?”), Ascultă și scrie cifrele, Ceasul (scris și „alege cadranul”) și Unde e pisica? (12 poziții). Numerele (0–999.999.999) și orele se generează din reguli, cu teste; abilitățile „numere 0–20”, „numere 21–100” și „ora” au carduri proprii și apar pe Acasă când sunt scadente. Categoria Expresie există (66 de expresii). Temele se validează la `npm run validate`. Teste: unitare pentru generatoare, exerciții și sesiune; E2E pentru fiecare exercițiu; axe pe ecranele noi.
  * **Etapa a doua (implementată):** cele 28 de teme rămase — data și anul, frecvența, numerele 100–1.000.000 (cu abilitatea „numere mari”, 101–1.000.000, cifre cu punct la mii), fracții și cantități, prețuri și bani, aici și acolo, familia, corpul, stări și emoții, descrierea unei persoane, profesii, țări și naționalități, casa, rutina zilnică, haine, vremea, mesele zilei, la bar, la piață și supermarket, locuri în oraș, transport, la gară și aeroport, la hotel, la medic și farmacie, urgențe, expresii din italiana vorbită, conectori și contrarii. Au fișă, Studiază tema și Potrivește perechi; rutina zilnică și frecvența au și „Ordonează”. În total **42 de teme**.
* **Faza 5 — Audio la conjugare (~1 zi):** textul rostit pentru fiecare persoană și timp (FR2.4), 🔊 și 🐢 în sesiunea de conjugare, redare pe rând și „Ascultă tot” în tabelele din pagina verbului, redare în serie cu oprire în serviciul TTS.
  * **Gata când:** testele unitare pentru textul rostit acoperă toate cazurile din tabelul din FR2.4; testele E2E verifică ce primește vocea (după „Verifică” se rostește *noi abbiamo parlato*; „Ascultă tot” rostește formele în ordine; fără apăsare nu se rostește nimic); verificarea axe trece pe ecranele modificate.
  * **Stare:** implementat — `spokenConjugation` (7 teste unitare, toate cazurile din FR2.4), 🔊 pe infinitiv și 🔊 / 🐢 după „Verifică” în sesiunea de conjugare, tabelele din pagina verbului cu tap pe rând și „▶ Ascultă tot / ■ Oprește” (rândul citit evidențiat; seria se oprește la părăsirea paginii). Teste E2E în `tests/e2e/conjugation-audio.spec.ts`, cu o voce simulată care redă frazele în ordine; axe trece pe pagina verbului și pe sesiunea de conjugare.
* **Flux de conținut (paralel):** tranșe de ~100–200 de cuvinte până la 1000, fiecare trecută prin scriptul de validare.
  * **Stare:** **1665 de cuvinte** în 17 tranșe: 367 de verbe, 734 de substantive, 275 de adjective, 116 de adverbe, 68 de expresii și 105 cuvinte funcționale (23 de pronume, 22 de prepoziții, 17 conjuncții, 31 de numerale, 12 interjecții). Nivel estimat: 616 A1, 568 A2, 481 B1 (tranșele 15–17 acoperă cuvintele cotidiene din rangurile 1200–2200; au fost sărite intenționat cele despre violență, justiție și politică). Rangurile sunt calculate din listele de frecvență (FrequencyWords 70% + Leipzig 30%), nu estimate. Genul, pluralul, formele adjectivelor, participiile și auxiliarele provin din Wiktionary. Conjugările acoperă cele 367 de verbe la toate cele 7 timpuri (imperativo la 364, fără modale); verificarea față de Wiktionary compară 12845 forme cu **0 erori** (cele 587 de avertismente sunt variante alternative din Wiktionary pe care aplicația nu le acceptă încă). Toate cuvintele au tag-uri tematice, folosite ca punct de plecare pentru Teme (Faza 4). **Rămân:** restul cuvintelor B1 (rangurile 1200–2200 încă neacoperite) și tranșele B2.
* **Faza 6 — Conturi și sincronizare (3–4 zile):** serviciul PocketBase în `docker-compose`, accesibil prin nginx pe `/api/` (Traefik rămâne neschimbat), panoul de administrare doar prin tunel SSH; autentificare opțională din Setări; sincronizarea progresului (FR6.1) cu coadă locală, combinare fără conflicte și ștergeri marcate; alegerea la prima autentificare când există progres în ambele locuri; deconectare sigură; ștergerea contului.
  * **Gata când:** fără cont aplicația nu face nicio cerere de rețea (verificat în E2E); două dispozitive (două contexte de browser) cu același cont ajung la același progres după repetiții făcute offline pe ambele; statisticile și streak-ul sunt identice pe ambele; deconectarea cu modificări netrimise avertizează; ștergerea contului elimină datele de pe server; testele unitare pentru combinare trec.
  * **Stare:** implementat și testat — cont opțional din Setări (**creare cont din aplicație**, autentificare, alegerea combinării la prima autentificare, deconectare cu avertisment, ștergerea contului **cu parolă**, „Sesiune expirată” cu reautentificare doar cu parola), sincronizare automată (la pornire, la reconectare, la 20 s după modificări, la trecerea în fundal) și manuală, PocketBase 0.40.5 în `docker-compose` în spatele nginx, migrări în git, limite de cereri și IP real al clientului. Dexie v2 (`updatedAt`, `uid`, marcaje `dirty`, `tombstones`) cu migrare testată. Teste: 21 de integrare cu două „dispozitive” (server în memorie), 15 + 11 unitare (combinare; mesaje și validări de cont), 22 E2E cu PocketBase real (două contexte de browser = două telefoane, inclusiv offline, sesiune expirată, izolare între utilizatori și axe în ambele teme). Fără cont nu se încarcă niciun cod de sincronizare (verificat în E2E), iar pachetul principal nu a crescut. **Neverificat pe un server real cu Traefik:** stiva a fost testată prin nginx într-un compose izolat, nu în spatele Traefik-ului tău, iar workflow-ul GitHub care publică și imaginea PocketBase nu a rulat.
* **Ulterior (opțional):** optimizarea parametrilor FSRS pe datele proprii.
