export type Puzzle = {
  center: string
  outer: string[]
  words: string[]
  pangrams: string[]
}

export type LanguagePack = {
  id: string
  name: string
  dir: "rtl" | "ltr"
  minLength: number
  normalize: (word: string) => string
  isLetter: (character: string) => boolean
  puzzles: Puzzle[]
}
