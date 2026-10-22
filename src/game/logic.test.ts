import { describe, expect, it } from "vitest"
import { hePuzzles } from "../data/he-puzzles"
import {
  acceptsLetter,
  addDays,
  dayKey,
  judgeGuess,
  maxScore,
  normalizeHebrew,
  puzzleIndexForDate,
  rankState,
  scoreWord,
  shuffleWithSeed,
} from "./logic"
import type { Puzzle } from "../languages/types"

const puzzle: Puzzle = {
  center: "ב",
  outer: ["י", "ת", "ל", "ש", "ו", "ם"],
  words: ["לבית", "בשלום"],
  pangrams: [],
}

describe("normalizeHebrew", () => {
  it("folds final letters and ignores niqqud", () => {
    expect(normalizeHebrew("מֶלֶךְ")).toBe("מלכ")
    expect(normalizeHebrew("סוף")).toBe("סופ")
    expect(normalizeHebrew("מים")).toBe("מימ")
  })
})

describe("scoreWord", () => {
  it("scores four-letter words as one point and pangrams with a bonus", () => {
    expect(scoreWord(4, false)).toBe(1)
    expect(scoreWord(5, false)).toBe(5)
    expect(scoreWord(7, true)).toBe(14)
    expect(scoreWord(3, false)).toBe(0)
  })
})

describe("judgeGuess", () => {
  it("accepts a center word and rejects the usual mistakes", () => {
    const found = new Set<string>()
    const good = judgeGuess("לבית", puzzle, found, normalizeHebrew, 4)
    expect(good).toMatchObject({ ok: true, display: "לבית", points: 1, pangram: false })

    expect(judgeGuess("שלום", puzzle, found, normalizeHebrew, 4)).toMatchObject({
      ok: false,
      reason: "center",
    })
    expect(judgeGuess("ביתי", puzzle, found, normalizeHebrew, 4)).toMatchObject({
      ok: false,
      reason: "unknown",
    })
    expect(judgeGuess("בת", puzzle, found, normalizeHebrew, 4)).toMatchObject({
      ok: false,
      reason: "short",
    })
    found.add(normalizeHebrew("לבית"))
    expect(judgeGuess("לבית", puzzle, found, normalizeHebrew, 4)).toMatchObject({
      ok: false,
      reason: "repeat",
    })
  })

  it("treats a final letter as the hive letter", () => {
    expect(acceptsLetter("ך", { ...puzzle, center: "כ", outer: puzzle.outer }, normalizeHebrew)).toBe(
      true,
    )
  })
})

describe("ranks and dates", () => {
  it("names the opening rank and the perfect rank", () => {
    expect(rankState(0, 100).current.name).toBe("מתחילים")
    expect(rankState(100, 100).current.name).toBe("כוורת מלאה")
    expect(rankState(70, 100).current.name).toBe("גאונות")
  })

  it("keeps a stable puzzle for a calendar day", () => {
    const today = new Date(2026, 9, 22)
    expect(dayKey(today)).toBe("2026-10-22")
    expect(puzzleIndexForDate(today, 10)).toBe(puzzleIndexForDate(new Date(2026, 9, 22, 23, 30), 10))
    expect(puzzleIndexForDate(addDays(today, 1), 10)).toBe((puzzleIndexForDate(today, 10) + 1) % 10)
  })
})

describe("hebrew puzzle bank", () => {
  it("contains playable hives with real answers", () => {
    expect(hePuzzles.length).toBeGreaterThan(60)
    for (const hive of hePuzzles) {
      const letters = new Set([hive.center, ...hive.outer])
      expect(letters.size).toBe(7)
      expect(hive.outer).not.toContain(hive.center)
      expect(hive.pangrams.length).toBeGreaterThan(0)
      expect(maxScore(hive, normalizeHebrew)).toBeGreaterThan(0)
      const seen = new Set<string>()
      for (const word of hive.words) {
        const normalized = normalizeHebrew(word)
        expect(Array.from(normalized).length).toBeGreaterThanOrEqual(4)
        expect(Array.from(normalized).every((letter) => letters.has(letter))).toBe(true)
        expect(normalized.includes(hive.center)).toBe(true)
        expect(seen.has(normalized)).toBe(false)
        seen.add(normalized)
      }
      for (const pangram of hive.pangrams) {
        const normalized = normalizeHebrew(pangram)
        expect(new Set(Array.from(normalized))).toEqual(letters)
        expect(hive.words).toContain(pangram)
      }
    }
  })
})

describe("shuffleWithSeed", () => {
  it("is stable for the same seed", () => {
    expect(shuffleWithSeed(["א", "ב", "ג", "ד", "ה", "ו"], 7)).toEqual(
      shuffleWithSeed(["א", "ב", "ג", "ד", "ה", "ו"], 7),
    )
  })
})
