# Changelog

Formatul urmează [Keep a Changelog](https://keepachangelog.com/ro/1.1.0/), iar versiunile urmează
[versionarea semantică](https://semver.org/lang/ro/). Intrările noi sunt scrise automat de release-please din
commit-urile `feat:` / `fix:` (vezi README, „Versionare și release-uri”).

## [1.6.0](https://github.com/claudiu-mihai/impara-italiano/compare/v1.5.1...v1.6.0) (2026-10-23)


### Funcționalități

* **flashcards:** direcția „Ambele” cu deblocarea cardului RO → IT după 7 zile ([#17](https://github.com/claudiu-mihai/impara-italiano/issues/17)) ([428f6d2](https://github.com/claudiu-mihai/impara-italiano/commit/428f6d2143e60dae307e64be8d7ab009da80fe92))

## [1.5.1](https://github.com/claudiu-mihai/impara-italiano/compare/v1.5.0...v1.5.1) (2026-10-22)


### Corecturi

* **flashcards:** swipe pe ecran tactil (touch-action pan-y pe fețele cardului) ([#15](https://github.com/claudiu-mihai/impara-italiano/issues/15)) ([3351a8d](https://github.com/claudiu-mihai/impara-italiano/commit/3351a8dff234ae2dc4bf444db70ee66a6f267984))

## [1.5.0](https://github.com/claudiu-mihai/impara-italiano/compare/v1.4.0...v1.5.0) (2026-10-22)


### Funcționalități

* **content:** restul cuvintelor B1 (tranșele 22-24, rangurile 1200-2200) ([#13](https://github.com/claudiu-mihai/impara-italiano/issues/13)) ([1ccecf4](https://github.com/claudiu-mihai/impara-italiano/commit/1ccecf4b8708324c4b362cd8da713c182c8c29b2))

## [1.4.0](https://github.com/claudiu-mihai/impara-italiano/compare/v1.3.0...v1.4.0) (2026-10-22)


### Funcționalități

* **flashcards:** setare pentru procentul de substantive printre cuvintele noi ([#11](https://github.com/claudiu-mihai/impara-italiano/issues/11)) ([d2b91a8](https://github.com/claudiu-mihai/impara-italiano/commit/d2b91a88dd49f3a3d6b0110f2ee9475971906b5f))

## [1.3.0](https://github.com/claudiu-mihai/impara-italiano/compare/v1.2.0...v1.3.0) (2026-10-22)


### Funcționalități

* **conjugation:** suport pentru verbele în -rre (porre, trarre, -durre) și 15 verbe noi ([#9](https://github.com/claudiu-mihai/impara-italiano/issues/9)) ([421190d](https://github.com/claudiu-mihai/impara-italiano/commit/421190dcf4f970dc6203230ee0e473693b802b58))

## [1.2.0](https://github.com/claudiu-mihai/impara-italiano/compare/v1.1.0...v1.2.0) (2026-10-22)


### Funcționalități

* **content:** pachetul de cuvinte B2 (tranșele 18-20) ([#7](https://github.com/claudiu-mihai/impara-italiano/issues/7)) ([9823e9a](https://github.com/claudiu-mihai/impara-italiano/commit/9823e9a007ff147ce647828ee500168415a5e78f))

## [1.1.0](https://github.com/claudiu-mihai/impara-italiano/compare/v1.0.1...v1.1.0) (2026-10-21)


### Funcționalități

* **games:** jocuri de gramatică (cartonașe, potrivire, introducere text) ([#5](https://github.com/claudiu-mihai/impara-italiano/issues/5)) ([44a8815](https://github.com/claudiu-mihai/impara-italiano/commit/44a8815de1562e375ff697d67dcf68271af44a50))

## [1.0.1](https://github.com/claudiu-mihai/impara-italiano/compare/v1.0.0...v1.0.1) (2026-10-21)


### Corecturi

* **home:** fără reamintire de backup cât timp progresul e sincronizat cu un cont ([#2](https://github.com/claudiu-mihai/impara-italiano/issues/2)) ([d2bddfb](https://github.com/claudiu-mihai/impara-italiano/commit/d2bddfb322e4a0cbbb613eef39180238a51ea10b))

## 1.0.0 (2026-10-21)

Primul release cu versionare semantică; cuprinde tot ce există până acum.

### Funcționalități

* Aplicație web progresivă (PWA), mobil întâi, care funcționează offline, pentru învățarea italienei de către vorbitori de română.
* Repetiție spațiată FSRS, cu flashcards în ambele direcții, quiz cu 4 variante, reconstruirea propozițiilor și conjugare
  la 7 timpuri (scrisă, flip și tabel).
* Dicționar de peste 1600 de cuvinte, cu niveluri CEFR estimate (A1–C2, alese manual în Setări), căutare fără diacritice
  și „Știu deja”.
* 42 de teme cu fișă și reguli pentru vorbitori de română (zilele, lunile, numerele, ora, poziția obiectelor ș.a.), cu
  exerciții specifice: perechi, ordonare, cifre după auz, ceasul și „Unde e pisica?”.
* Pronunție audio cu vocile din sistem, redare pe rând și „Ascultă tot” la conjugare.
* Statistici, streak și prognoză; export și import de progres; temă luminoasă, întunecată sau automată.
* Conturi opționale cu sincronizare între dispozitive, pe un server PocketBase propriu: creare cont din aplicație,
  progres combinat fără conflicte, funcționare offline, ștergerea contului cu parolă. Fără cont, totul rămâne local.
* Distribuire prin Docker (nginx + PocketBase), cu imagini pentru `linux/amd64` și `linux/arm64`.

### Documentație

* README, arhitectura aplicației și planul de dezvoltare.
