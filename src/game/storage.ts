export type Progress = {
  found: string[]
  outer: string[]
}

function key(languageId: string, day: string) {
  return `milim:v1:${languageId}:${day}`
}

export function loadProgress(languageId: string, day: string): Progress | null {
  try {
    const raw = localStorage.getItem(key(languageId, day))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as Partial<Progress>
    const found = Array.isArray(record.found)
      ? record.found.filter((word): word is string => typeof word === "string")
      : []
    const outer = Array.isArray(record.outer)
      ? record.outer.filter((letter): letter is string => typeof letter === "string")
      : []
    return { found, outer }
  } catch {
    return null
  }
}

export function saveProgress(
  languageId: string,
  day: string,
  progress: Progress,
) {
  localStorage.setItem(key(languageId, day), JSON.stringify(progress))
}
