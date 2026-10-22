# Changelog

Formatul urmează [Keep a Changelog](https://keepachangelog.com/ro/1.1.0/), iar versiunile urmează
[versionarea semantică](https://semver.org/lang/ro/). Intrările noi sunt scrise automat de release-please din
commit-urile `feat:` / `fix:` (vezi README, „Versionare și release-uri”).

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
