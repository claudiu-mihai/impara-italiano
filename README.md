# Impara l'Italiano

Aplicație web (PWA) pentru învățarea limbii italiene de către vorbitori de română: carduri cu repetiție spațiată
(FSRS), quiz, conjugare, reconstruire de propoziții, dicționar și statistici. Funcționează offline; progresul rămâne pe
dispozitiv.

Planul și deciziile sunt în [app-plan.md](app-plan.md), iar structura aplicației în [architecture.md](architecture.md).

## Comenzi

```
npm run dev            # server de dezvoltare (generează întâi datele din content/)
npm run build          # build de producție cu service worker
npm test               # teste unitare (Vitest)
npm run test:e2e       # teste end-to-end, accesibilitate (axe) și LCP (Playwright)
npm run validate       # validează conținutul cu scheme Zod
npm run pocketbase      # server de sincronizare local, curat (portul 8090); vezi „Conturi și sincronizare”
```

## Conținut: cum se adaugă cuvinte noi

Toate datele din aplicație sunt generate la build din `content/` (nu există backend). Fluxul pentru o tranșă nouă:

1. **Alegi cuvintele.** `npm run frequency:candidates -- 200 400` listează lemele frecvente (rangul 200–400) care nu sunt
   încă în dicționar, cu categoria și sensul din Wiktionary.
2. **Scrii ciorna** în `content/drafts/tranche-NN.json`: doar ce nu poate fi dedus, adică categoria (`pos`), traducerea
   în română (`ro`), 2 exemple, eventual `note` și `falseFriend` (prieteni falși cu româna).
3. **Completezi automat** cu `npm run enrich -- tranche-NN`. Scriptul ia din Wiktionary genul, pluralul, formele
   adjectivelor, participiul și auxiliarul, calculează articolele și scrie `content/words/tranche-NN.json`. Se oprește cu
   mesaje clare dacă ceva nu se potrivește (cuvânt inexistent, formă absentă etc.).
4. **Verbele neregulate:** `npm run irregular` compară regulile de conjugare cu Wiktionary și adaugă în
   `content/verbs/irregular.json` doar excepțiile.
5. **Verifici:** `npm run validate` și `npm run verify:wiktionary` (compară toate formele conjugate cu Wiktionary).
6. **Rangul și nivelul CEFR** ale fiecărui cuvânt se calculează la build (rangul din frecvența lemei, nivelul din benzile din `content/levels.json`); nu se scriu de mână. Pentru un cuvânt care nu este de nivelul frecvenței lui sau care nu are rang de frecvență (ex. culori, zilele săptămânii), adaugă-l în `overrides` din `content/levels.json`, altfel `npm run validate` dă eroare.

### Teme

Temele (fișe cu reguli și exerciții) sunt în `content/topics/NN-<id>.json`: titlu, grup, reguli scurte, subgrupe de cuvinte
(după `id`), exerciții. Cuvintele lipsă se adaugă prin fluxul de mai sus; expresiile din mai multe cuvinte au `"pos": "expression"`
și, dacă nu există în Wiktionary, `"unverifiedPos": true`. `npm run validate` verifică temele (id-uri existente, nivelul temei
≥ nivelul cuvintelor, secvențe coerente).

### Sursele de date (`content/sources/`, ignorate de git)

Fișierele mari nu sunt în repo. Pentru a rula pașii 1, 3, 4 și 5 trebuie descărcate o dată:

| Fișier | De unde | Folosit pentru |
| --- | --- | --- |
| `kaikki-italian.jsonl` (~770 MB) | https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl | gen, plural, forme, verificare |
| `it_50k.txt` | FrequencyWords, `content/2018/it/it_50k.txt` | frecvența în italiana vorbită |
| `leipzig/` | `ita_news_2023_100K.tar.gz` de la downloads.wortschatz-leipzig.de/corpora | frecvența în italiana scrisă |

După descărcare: `npm run frequency:lexicon` extrage datele din kaikki. Lista de lemele frecvente
(`content/frequency/it-lemmas.json`) este în git; se regenerează doar dacă se schimbă sursele, cu
`scripts/frequency/build_lemmas.py` (necesită `pip install simplemma`).

## Conturi și sincronizare (opțional)

Aplicația merge complet fără cont. Cu cont, progresul se sincronizează cu un server propriu **PocketBase** (SQLite),
pe care îl pornește `docker compose` lângă aplicație. Detalii de arhitectură: [architecture.md](architecture.md), §14.

**Dezvoltare.** `npm run pocketbase` descarcă binarul oficial (o singură dată, cu suma de control verificată), pornește
un server curat pe `127.0.0.1:8090` și un administrator de test (`admin@test.local` / `adminpass123`); `npm run dev`
trimite `/api/` către el. Testele E2E îl pornesc singure. Limitele de cereri sunt oprite în dezvoltare
(`POCKETBASE_RATE_LIMITS=on npm run pocketbase` le păstrează).

**Producție.**

```
docker compose up -d --build        # pornește și pocketbase; datele stau în volumul pb_data

# administratorul (o singură dată):
docker compose exec pocketbase pocketbase superuser upsert EMAIL PAROLA --dir /pb/pb_data --migrationsDir /pb/pb_migrations

# panoul de administrare nu e public; se deschide printr-un tunel SSH:
ssh -L 8090:127.0.0.1:48090 utilizator@server      # apoi http://localhost:8090/_/
```

* **Conturile** se creează **din aplicație** (Setări → Cont → „Cont nou”: email și parolă) sau din panou (Collections →
  users → New record). Înregistrarea este liberă pentru oricine are adresa; singura protecție este o limită de **5
  conturi pe oră de pe aceeași adresă IP** (migrarea `1792540900_open_registration.js`; administratorul nu e limitat). Dacă
  nu vrei înregistrare liberă, rulează `users.createRule = null` printr-o migrare nouă sau din panou (Collections → users
  → API rules → Create rule → „Set superusers only”).
* **Parola uitată** nu se poate reseta din aplicație (nu există email configurat): o schimbă administratorul din panou,
  pe înregistrarea utilizatorului. Emailul se salvează cu litere mici.
* **Ștergerea contului** o face utilizatorul însuși din Setări → Cont → „Șterge contul” (cere parola); se șterg contul și
  toate datele lui de pe server.
* **Traefik** rămâne neschimbat: trimite tot domeniul la containerul `web`, iar nginx duce `/api/` la PocketBase pe
  rețeaua internă. Portul publicat de `web` trebuie să fie cel din routerul Traefik.
* **Backup:** din panou, Settings → Backups, sau o copie a volumului `pb_data` cu serverul oprit. Backup-ul JSON din
  aplicație rămâne valabil în ambele moduri.
* **Actualizarea PocketBase:** se schimbă versiunea și sumele de control în `pocketbase/Dockerfile` și în
  `scripts/pocketbase/dev.ts` (sumele sunt în `checksums.txt` din pagina release-ului), apoi se rulează testele.
* **Imaginile publicate:** workflow-ul construiește `ghcr.io/<repo>` (aplicația) și `ghcr.io/<repo>-pocketbase`.
* **Limite de cereri** pe adresa clientului (vezi migrarea): autentificarea 8 cereri / 10 s. Adresa reală vine din
  `X-Forwarded-For` de la Traefik; nginx ia ultima adresă care nu e privată.
* **HTTPS este obligatoriu** pentru sincronizare (aplicația folosește `crypto.subtle`, disponibil doar în context
  securizat); pe `http://localhost` merge și fără.

## Licențe ale datelor

Listele de frecvență vin de la FrequencyWords (CC BY-SA 4.0) și Leipzig Corpora Collection (CC BY 4.0), iar datele
gramaticale de la Wiktionary (CC BY-SA 4.0), prin kaikki.org. Atribuirea apare în ecranul „Despre” al aplicației.
Lista derivată de cuvinte și ranguri se distribuie tot sub CC BY-SA 4.0.

## Docker

```
docker compose up -d --build                      # build local, http://localhost:8080
docker pull ghcr.io/claudiu-mihai/impara-italiano:latest
```

La fiecare push pe `main` (și la tag-uri `v*`), workflow-ul [docker-publish.yml](.github/workflows/docker-publish.yml)
construiește imaginea pentru `linux/amd64` și `linux/arm64` și o publică în GitHub Container Registry.
