import { hebrew } from "./hebrew"
import type { LanguagePack } from "./types"

/** Add a language by appending another pack: an alphabet, rules, and puzzles. */
export const languages: LanguagePack[] = [hebrew]

export function languageById(id: string): LanguagePack {
  return languages.find((language) => language.id === id) ?? hebrew
}
