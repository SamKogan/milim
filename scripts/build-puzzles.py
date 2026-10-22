#!/usr/bin/env python3
"""Build Hebrew hive puzzles from a frequency-filtered Hspell word list.

Source list: eyaler/hebrew_wordlists cc100_intersect_with_fatverb_with_some_prefixes.csv
That file is an AGPL-3.0 derivative of Hspell (Nadav Har'El and Dan Kenigsberg).
"""

from __future__ import annotations

import json
import random
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "cc100.csv"
OUT = ROOT / "src" / "data" / "he-puzzles.ts"
URL = (
    "https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/"
    "cc100_intersect_with_fatverb_with_some_prefixes.csv"
)

LETTERS = "אבגדהוזחטיכלמנסעפצקרשת"
LETTER_SET = set(LETTERS + "ךםןףץ")
FINAL = str.maketrans("ךםןףץ", "כמנפצ")
MIN_LEN = 4
MAX_LEN = 12
MIN_FREQ = 8000
MIN_WORDS = 20
MAX_WORDS = 64
TARGET = 36
MAX_PANGRAM_LEN = 9
MAX_PUZZLES = 366


def normalize(word: str) -> str:
    return word.translate(FINAL)


def mask_of(word: str) -> int:
    bits = 0
    for ch in set(word):
        bits |= 1 << LETTERS.index(ch)
    return bits


def ensure_source() -> None:
    if SOURCE.exists():
        return
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading {URL}")
    urllib.request.urlretrieve(URL, SOURCE)


def load_words() -> list[tuple[str, str, int]]:
    best: dict[str, tuple[int, str]] = {}
    with SOURCE.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            word, _, count_s = line.rpartition(",")
            if len(word) < MIN_LEN or len(word) > MAX_LEN:
                continue
            if any(ch not in LETTER_SET for ch in word):
                continue
            count = int(count_s)
            if count < MIN_FREQ:
                continue
            norm = normalize(word)
            if not norm or any(ch not in LETTERS for ch in norm):
                continue
            if len(set(norm)) > 7:
                continue
            prev = best.get(norm)
            if prev is None or count > prev[0]:
                best[norm] = (count, word)
    return [(norm, display, mask_of(norm)) for norm, (_, display) in best.items()]


def submasks(mask: int):
    sub = mask
    while True:
        yield sub
        if sub == 0:
            break
        sub = (sub - 1) & mask


def build(words: list[tuple[str, str, int]]) -> list[dict]:
    by_mask: dict[int, list[tuple[str, str, int]]] = defaultdict(list)
    for item in words:
        by_mask[item[2]].append(item)

    puzzles = []
    for mask, group in by_mask.items():
        if bin(mask).count("1") != 7:
            continue
        if not any(len(display) <= MAX_PANGRAM_LEN for _, display, _ in group):
            continue
        subset: list[tuple[str, str, int]] = []
        for sub in submasks(mask):
            subset.extend(by_mask.get(sub, ()))
        letters = [LETTERS[i] for i in range(len(LETTERS)) if mask & (1 << i)]
        best = None
        for center in letters:
            bit = 1 << LETTERS.index(center)
            chosen = [item for item in subset if item[2] & bit]
            count = len(chosen)
            if count < MIN_WORDS or count > MAX_WORDS:
                continue
            longer = sum(1 for item in chosen if len(item[1]) >= 5)
            if longer < 6:
                continue
            fours = sum(1 for item in chosen if len(item[1]) == 4)
            if fours / count > 0.68:
                continue
            pangrams = [
                item[1]
                for item in chosen
                if item[2] == mask and len(item[1]) <= MAX_PANGRAM_LEN
            ]
            if not pangrams:
                continue
            score = -abs(count - TARGET) + min(len(pangrams), 4) * 3 + min(longer, 12)
            if best is None or score > best[0]:
                best = (score, center, chosen, pangrams)
        if best is None:
            continue
        score, center, chosen, pangrams = best
        outer = sorted(ch for ch in letters if ch != center)
        puzzles.append(
            {
                "score": score,
                "center": center,
                "outer": outer,
                "words": sorted({item[1] for item in chosen}, key=lambda w: (len(w), w)),
                "pangrams": sorted(set(pangrams), key=lambda w: (len(w), w)),
            }
        )
    puzzles.sort(key=lambda puzzle: puzzle["score"], reverse=True)
    puzzles = puzzles[:MAX_PUZZLES]
    random.Random(20261022).shuffle(puzzles)
    return puzzles


def write_ts(puzzles: list[dict]) -> None:
    payload = [
        {
            "center": puzzle["center"],
            "outer": puzzle["outer"],
            "words": puzzle["words"],
            "pangrams": puzzle["pangrams"],
        }
        for puzzle in puzzles
    ]
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "\n".join(
            [
                "// Generated by scripts/build-puzzles.py. Do not edit by hand.",
                "// Words are a frequency-filtered subset of Hspell via eyaler/hebrew_wordlists",
                "// (CC100 intersect). Hspell by Nadav Har'El and Dan Kenigsberg, AGPL-3.0.",
                'import type { Puzzle } from "../languages/types"',
                "",
                f"export const hePuzzles: Puzzle[] = {body}",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> None:
    ensure_source()
    words = load_words()
    puzzles = build(words)
    if len(puzzles) < 60:
        raise SystemExit(f"only {len(puzzles)} puzzles; relax the filters")
    write_ts(puzzles)
    print(f"words={len(words)} puzzles={len(puzzles)} bytes={OUT.stat().st_size}")
    for puzzle in puzzles[:3]:
        print(
            f"center={puzzle['center']} outer={''.join(puzzle['outer'])} "
            f"n={len(puzzle['words'])} pangrams={','.join(puzzle['pangrams'][:4])}"
        )
        print(" ".join(puzzle["words"][:50]))


if __name__ == "__main__":
    main()
