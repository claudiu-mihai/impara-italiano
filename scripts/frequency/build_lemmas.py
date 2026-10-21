#!/usr/bin/env python3
"""
Calculează rangul combinat al lemelor italiene din două liste de frecvență și îl scrie în
content/frequency/it-lemmas.json (se păstrează în git; build-ul aplicației nu are nevoie de Python).

Surse (descărcate în content/sources/, ignorat de git):
  - FrequencyWords it_50k (OpenSubtitles 2018, CC BY-SA 4.0): italiana vorbită
  - Leipzig Corpora Collection ita_news_2023_100K (CC BY 4.0): italiana scrisă (știri)

Pași: păstrează doar cuvintele alfabetice minuscule, aduce fiecare formă la lemă (simplemma),
însumează frecvențele pe lemă, clasează lemele pe fiecare sursă și combină rangurile 70% / 30%.

Rulare (o singură dată, sau când se schimbă sursele):
  python3 -m venv .venv && .venv/bin/pip install simplemma
  .venv/bin/python scripts/frequency/build_lemmas.py
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import simplemma

ROOT = Path(__file__).resolve().parents[2]
FW_FILE = ROOT / "content/sources/it_50k.txt"
LEIPZIG_FILE = ROOT / "content/sources/leipzig/ita_news_2023_100K/ita_news_2023_100K-words.txt"
OUT_FILE = ROOT / "content/frequency/it-lemmas.json"

WEIGHT_FW = 0.7
WEIGHT_LEIPZIG = 0.3
KEEP = 3000

WORD = re.compile(r"^[a-zàèéìíîòóùú]+$")


def read_frequency_words() -> Counter:
    counts: Counter = Counter()
    for line in FW_FILE.read_text(encoding="utf8").splitlines():
        word, _, count = line.partition(" ")
        if WORD.match(word):
            counts[word] += int(count)
    return counts


def read_leipzig() -> Counter:
    counts: Counter = Counter()
    for line in LEIPZIG_FILE.read_text(encoding="utf8").splitlines():
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        _, word, count = parts
        # doar formele scrise cu minuscule: majusculele sunt nume proprii sau început de propoziție
        if WORD.match(word):
            counts[word] += int(count)
    return counts


def lemmatize(forms: Counter) -> Counter:
    lemmas: Counter = Counter()
    for form, count in forms.items():
        lemmas[simplemma.lemmatize(form, lang="it").lower()] += count
    return lemmas


def ranks(counts: Counter) -> dict[str, int]:
    ordered = sorted(counts, key=lambda lemma: (-counts[lemma], lemma))
    return {lemma: i + 1 for i, lemma in enumerate(ordered)}


def main() -> None:
    for path in (FW_FILE, LEIPZIG_FILE):
        if not path.exists():
            sys.exit(f"Lipsește {path}. Vezi instrucțiunile din antetul scriptului.")

    fw = lemmatize(read_frequency_words())
    leipzig = lemmatize(read_leipzig())
    fw_rank, leipzig_rank = ranks(fw), ranks(leipzig)
    # o lemă absentă dintr-o listă primește un rang imediat după ultima, ca să nu fie favorizată
    missing_fw, missing_leipzig = len(fw_rank) + 1, len(leipzig_rank) + 1

    rows = []
    for lemma in set(fw) | set(leipzig):
        r_fw = fw_rank.get(lemma, missing_fw)
        r_leipzig = leipzig_rank.get(lemma, missing_leipzig)
        rows.append(
            {
                "lemma": lemma,
                "score": round(WEIGHT_FW * r_fw + WEIGHT_LEIPZIG * r_leipzig, 1),
                "fwRank": fw_rank.get(lemma),
                "leipzigRank": leipzig_rank.get(lemma),
            }
        )
    rows.sort(key=lambda r: (r["score"], r["lemma"]))
    top = rows[:KEEP]
    for i, row in enumerate(top, start=1):
        row["rank"] = i

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "weights": {"frequencyWords": WEIGHT_FW, "leipzig": WEIGHT_LEIPZIG},
        "sources": ["FrequencyWords it_50k (OpenSubtitles 2018)", "Leipzig Corpora ita_news_2023_100K"],
        "lemmas": top,
    }
    # câte o lemă pe linie, ca diferențele să rămână lizibile
    lines = ",\n".join("    " + json.dumps(r, ensure_ascii=False) for r in top)
    head = json.dumps({k: v for k, v in payload.items() if k != "lemmas"}, ensure_ascii=False, indent=2)[:-2]
    OUT_FILE.write_text(f'{head},\n  "lemmas": [\n{lines}\n  ]\n}}\n', encoding="utf8")
    print(f"{len(fw)} leme în FrequencyWords, {len(leipzig)} în Leipzig → {len(top)} păstrate în {OUT_FILE}")
    print("Primele 40:", ", ".join(r["lemma"] for r in top[:40]))


if __name__ == "__main__":
    main()
