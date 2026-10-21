#!/usr/bin/env python3
"""
Verifică dacă exemplele unui cuvânt folosesc doar vocabular potrivit nivelului lui: o frază de A1 nu ar trebui
să conțină cuvinte rare. Fiecare cuvânt din exemple este adus la lemă (simplemma) și i se caută rangul în lista de
frecvență (content/frequency/it-lemmas.json). Se semnalează lemele mai rare decât limita nivelului.

Limita este banda NIVELULUI URMĂTOR: exemplele pentru un cuvânt de A1 pot folosi vocabular până la A2 (substantive de
zi cu zi ca „tavolo”, „ristorante” sunt acceptabile), dar nu mai greu.

Rezultatul este informativ (cod de ieșire 0), ca autorul să decidă; cu --strict ieșirea este 1 dacă există semnalări.

Rulare (necesită datele generate: npm run build:data, și simplemma în .venv):
  .venv/bin/python scripts/frequency/lint_examples.py [--strict] [--level A1]
"""
import json
import re
import sys
from pathlib import Path

import simplemma

ROOT = Path(__file__).resolve().parents[2]
LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

TOKEN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")

# nume proprii și cuvinte care apar în exemple dar nu sunt vocabular de învățat
PROPER = {"roma", "torino", "milano", "bologna", "napoli", "italia", "romania", "marco", "anna", "ion", "euro"}
# fragmente rezultate din elisiuni (c'è, dov'è, l'amico, un'ora): nu sunt cuvinte de sine stătătoare
ELISION_STEMS = {"c", "d", "l", "dov", "un", "all", "dall", "nell", "sull", "quest", "quell", "anch", "com", "cos", "dell", "sull", "ch", "s", "m", "t", "v", "n"}


def load_limits() -> dict[str, int]:
    """Rangul maxim permis în exemplele unui cuvânt, pe nivelul cuvântului (banda nivelului următor)."""
    bands = json.loads((ROOT / "content/levels.json").read_text(encoding="utf8"))["bands"]
    upper = {level: bands[level] for level in LEVELS if level in bands}
    limits: dict[str, int] = {}
    for i, level in enumerate(LEVELS):
        nxt = LEVELS[min(i + 1, len(LEVELS) - 1)]
        limits[level] = upper.get(nxt) or upper.get(level) or max(upper.values())
    return limits


def main() -> None:
    strict = "--strict" in sys.argv
    only = sys.argv[sys.argv.index("--level") + 1] if "--level" in sys.argv else None

    ranks = {
        row["lemma"]: row["rank"]
        for row in json.loads((ROOT / "content/frequency/it-lemmas.json").read_text(encoding="utf8"))["lemmas"]
    }
    limits = load_limits()
    details = json.loads((ROOT / "src/data/generated/details.json").read_text(encoding="utf8"))
    conjugations = json.loads((ROOT / "src/data/generated/conjugations.json").read_text(encoding="utf8"))

    # formele conjugate ale verbelor din dicționar sunt vocabular cunoscut (lematizatorul le încurcă uneori)
    known_forms = {form.split()[-1] for tenses in conjugations.values() for persons in tenses.values() for alts in persons for form in alts}
    own = set()
    for w in details:
        own |= {w["it"], *w.get("forms", {}).values(), w.get("plural", "")}
        if w["pos"] == "verb":
            own.add(w["pastParticiple"])

    flagged = 0
    checked = 0
    for word in details:
        if only and word["level"] != only:
            continue
        limit = limits[word["level"]]
        for example in word["examples"]:
            checked += 1
            problems = []
            for match in TOKEN.finditer(example["it"]):
                token = match.group(0)
                lower = token.lower()
                nxt = example["it"][match.end() : match.end() + 1]
                prev = example["it"][match.start() - 1 : match.start()] if match.start() else ""
                # fragmente de elisiune: c'è, dov'è, l'amico (cuvântul din fața sau din spatele apostrofului)
                if lower in ELISION_STEMS and (nxt in "'’" or prev in "'’"):
                    continue
                if lower in PROPER or lower in known_forms or lower in own:
                    continue
                # nume proprii: cuvinte cu majusculă care nu încep propoziția
                if token[0].isupper() and match.start() > 0:
                    continue
                lemma = simplemma.lemmatize(lower, lang="it").lower()
                rank = ranks.get(lemma)
                if rank is None or rank > limit:
                    problems.append(f"{token}→{lemma} ({'fără rang' if rank is None else f'rang {rank}'})")
            if problems:
                flagged += 1
                print(f"{word['level']} {word['it']:<12} {example['it']}\n      ↳ {', '.join(problems)}")

    print(f"\nExemple verificate: {checked}; cu vocabular peste nivel: {flagged}")
    if strict and flagged:
        sys.exit(1)


if __name__ == "__main__":
    main()
