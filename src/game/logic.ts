import type { Puzzle } from "../languages/types"

export const RANKS = [
  { min: 0, name: "מתחילים" },
  { min: 0.02, name: "התחלה טובה" },
  { min: 0.05, name: "מתקדמים" },
  { min: 0.08, name: "יפה" },
  { min: 0.15, name: "טוב" },
  { min: 0.25, name: "חזק" },
  { min: 0.4, name: "מצוין" },
  { min: 0.5, name: "מבריק" },
  { min: 0.7, name: "גאונות" },
  { min: 1, name: "כוורת מלאה" },
] as const

const FINALS: Record<string, string> = {
  "ך": "כ",
  "ם": "מ",
  "ן": "נ",
  "ף": "פ",
  "ץ": "צ",
}

const HEBREW_LETTERS = new Set(
  Array.from("אבגדהוזחטיכלמנסעפצקרשתךםןףץ"),
)

const NIQQUD = /[\u0591-\u05C7]/g

export type RejectReason = "short" | "center" | "unknown" | "repeat"

export type Judgement =
  | {
      ok: true
      normalized: string
      display: string
      pangram: boolean
      points: number
    }
  | { ok: false; reason: RejectReason }

export function normalizeHebrew(word: string): string {
  let normalized = ""
  for (const character of word.normalize("NFC").replace(NIQQUD, "")) {
    normalized += FINALS[character] ?? character
  }
  return normalized
}

export function isHebrewLetter(character: string): boolean {
  return HEBREW_LETTERS.has(character)
}

export function scoreWord(length: number, pangram: boolean): number {
  if (length < 4) return 0
  const base = length === 4 ? 1 : length
  return base + (pangram ? 7 : 0)
}

export function answerBook(
  puzzle: Puzzle,
  normalize: (word: string) => string,
) {
  const answers = new Map<string, string>()
  const pangrams = new Set<string>()
  for (const word of puzzle.words) answers.set(normalize(word), word)
  for (const word of puzzle.pangrams) pangrams.add(normalize(word))
  return { answers, pangrams }
}

export function maxScore(
  puzzle: Puzzle,
  normalize: (word: string) => string,
): number {
  const { pangrams } = answerBook(puzzle, normalize)
  return puzzle.words.reduce((total, word) => {
    const normalized = normalize(word)
    return total + scoreWord(Array.from(word).length, pangrams.has(normalized))
  }, 0)
}

export function judgeGuess(
  entry: string,
  puzzle: Puzzle,
  found: ReadonlySet<string>,
  normalize: (word: string) => string,
  minLength: number,
): Judgement {
  const normalized = normalize(entry)
  if (Array.from(normalized).length < minLength) {
    return { ok: false, reason: "short" }
  }
  if (!Array.from(normalized).includes(puzzle.center)) {
    return { ok: false, reason: "center" }
  }
  const { answers, pangrams } = answerBook(puzzle, normalize)
  const display = answers.get(normalized)
  if (!display) return { ok: false, reason: "unknown" }
  if (found.has(normalized)) return { ok: false, reason: "repeat" }
  const pangram = pangrams.has(normalized)
  return {
    ok: true,
    normalized,
    display,
    pangram,
    points: scoreWord(Array.from(display).length, pangram),
  }
}

export function acceptsLetter(
  character: string,
  puzzle: Puzzle,
  normalize: (word: string) => string,
): boolean {
  const normalized = normalize(character)
  return normalized === puzzle.center || puzzle.outer.includes(normalized)
}

export function rankState(score: number, maximum: number) {
  const ratio = maximum === 0 ? 0 : score / maximum
  let index = 0
  for (let i = 0; i < RANKS.length; i += 1) {
    if (ratio + 1e-9 >= RANKS[i].min) index = i
  }
  const current = RANKS[index]
  const next = RANKS[index + 1]
  const pointsToNext = next
    ? Math.max(0, Math.ceil(next.min * maximum - 1e-9) - score)
    : 0
  const floor = current.min * maximum
  const ceiling = next ? next.min * maximum : maximum
  const within = next
    ? Math.min(1, Math.max(0, (score - floor) / Math.max(1, ceiling - floor)))
    : 1
  return { current, next, pointsToNext, ratio, within }
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date)
  next.setDate(next.getDate() + days)
  return next
}

export function dayKey(date: Date): string {
  const day = startOfDay(date)
  const month = String(day.getMonth() + 1).padStart(2, "0")
  const dateNumber = String(day.getDate()).padStart(2, "0")
  return `${day.getFullYear()}-${month}-${dateNumber}`
}

export function formatDay(date: Date): string {
  return startOfDay(date).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function puzzleIndexForDate(
  date: Date,
  count: number,
  epoch = new Date(2026, 0, 1),
): number {
  if (count <= 0) return 0
  const start = Date.UTC(epoch.getFullYear(), epoch.getMonth(), epoch.getDate())
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((current - start) / 86_400_000)
  return ((days % count) + count) % count
}

export function sameLetters(left: string[], right: string[]): boolean {
  return [...left].sort().join("") === [...right].sort().join("")
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

export function lengthRows(words: readonly string[]) {
  const counts = new Map<number, number>()
  for (const word of words) {
    const length = Array.from(word).length
    counts.set(length, (counts.get(length) ?? 0) + 1)
  }
  return [...counts.entries()].sort((left, right) => left[0] - right[0])
}
