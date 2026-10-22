import { isHebrewLetter, normalizeHebrew } from "../game/logic"
import { hePuzzles } from "../data/he-puzzles"
import type { LanguagePack } from "./types"

export const hebrew: LanguagePack = {
  id: "he",
  name: "עברית",
  dir: "rtl",
  minLength: 4,
  normalize: normalizeHebrew,
  isLetter: isHebrewLetter,
  puzzles: hePuzzles,
}
