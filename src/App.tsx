import { useEffect, useMemo, useRef, useState } from "react"
import { Hive } from "./components/Hive"
import {
  acceptsLetter,
  addDays,
  answerBook,
  dayKey,
  formatDay,
  hashString,
  judgeGuess,
  lengthRows,
  maxScore,
  puzzleIndexForDate,
  rankState,
  sameLetters,
  scoreWord,
  shuffleWithSeed,
  startOfDay,
  type RejectReason,
} from "./game/logic"
import { loadProgress, saveProgress } from "./game/storage"
import { languageById } from "./languages"
import type { Puzzle } from "./languages/types"

const language = languageById("he")

const REASONS: Record<RejectReason, string> = {
  short: "ארבע אותיות לפחות",
  center: "חסרה האות המרכזית",
  unknown: "אין מילה כזאת",
  repeat: "המילה כבר נמצאה",
}

type Tone = "good" | "bad" | "pangram"

type Notice = { tone: Tone; text: string }

const openedToday = startOfDay(new Date())

function loadBoard(day: string, puzzle: Puzzle) {
  const saved = loadProgress(language.id, day)
  const seeded = shuffleWithSeed(puzzle.outer, hashString(`${language.id}:${day}`))
  const outer =
    saved && saved.outer.length === puzzle.outer.length && sameLetters(saved.outer, puzzle.outer)
      ? saved.outer
      : seeded
  const found = (saved?.found ?? []).filter((word) =>
    answerBook(puzzle, language.normalize).answers.has(word),
  )
  return { found, outer }
}

function App() {
  const [date, setDate] = useState(() => startOfDay(new Date()))
  const [entry, setEntry] = useState("")
  const [found, setFound] = useState<string[]>([])
  const [outer, setOuter] = useState<string[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [shake, setShake] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [trackedDay, setTrackedDay] = useState("")
  const helpRef = useRef<HTMLDialogElement>(null)
  const noticeTimer = useRef<number | null>(null)
  const actions = useRef({
    addLetter: (_letter: string) => {},
    removeLetter: () => {},
    submit: () => {},
  })

  const day = dayKey(date)
  const isToday = day === dayKey(openedToday)
  const puzzle =
    language.puzzles[puzzleIndexForDate(date, language.puzzles.length)] ??
    language.puzzles[0]

  const book = useMemo(
    () => (puzzle ? answerBook(puzzle, language.normalize) : null),
    [puzzle],
  )
  const maximum = useMemo(
    () => (puzzle ? maxScore(puzzle, language.normalize) : 0),
    [puzzle],
  )
  const score = useMemo(() => {
    if (!book) return 0
    return found.reduce((total, word) => {
      const display = book.answers.get(word) ?? word
      return total + scoreWord(Array.from(display).length, book.pangrams.has(word))
    }, 0)
  }, [book, found])
  const rank = rankState(score, maximum)
  const foundDisplays = found
    .map((word) => book?.answers.get(word) ?? word)
    .sort((left, right) => left.localeCompare(right, "he"))
  const progress = `${foundDisplays.length.toLocaleString("he-IL")} מתוך ${puzzle?.words.length.toLocaleString("he-IL") ?? "0"}`

  useEffect(() => {
    document.documentElement.lang = language.id
    document.documentElement.dir = language.dir
    document.title = "מילים — כוורת אותיות"
  }, [])

  if (puzzle && trackedDay !== day) {
    const loaded = loadBoard(day, puzzle)
    setTrackedDay(day)
    setFound(loaded.found)
    setOuter(loaded.outer)
    setEntry("")
    setNotice(null)
    setShake(false)
    setShowGrid(false)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (helpRef.current?.open) return
      const target = event.target
      const onField =
        target instanceof HTMLElement &&
        Boolean(target.closest("button, a, input, textarea"))
      if (event.key === "Enter") {
        if (onField) return
        event.preventDefault()
        actions.current.submit()
        return
      }
      if (event.key === "Backspace") {
        if (target instanceof HTMLElement && target.closest("input, textarea")) return
        event.preventDefault()
        actions.current.removeLetter()
        return
      }
      if (onField) return
      if (language.isLetter(event.key)) actions.current.addLetter(event.key)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function persist(nextFound: string[], nextOuter: string[]) {
    saveProgress(language.id, day, { found: nextFound, outer: nextOuter })
  }

  function flash(next: Notice) {
    setNotice(next)
    setShake(next.tone === "bad")
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => {
      setNotice(null)
      setShake(false)
    }, next.tone === "bad" ? 1300 : 1700)
  }

  function addLetter(letter: string) {
    if (!puzzle || !language.isLetter(letter)) return
    if (!acceptsLetter(letter, puzzle, language.normalize)) {
      flash({ tone: "bad", text: "האות לא בכוורת" })
      return
    }
    setNotice(null)
    setEntry((current) => current + letter)
  }

  function removeLetter() {
    setEntry((current) => Array.from(current).slice(0, -1).join(""))
  }

  function submit() {
    if (!puzzle || !book || !entry) return
    const result = judgeGuess(
      entry,
      puzzle,
      new Set(found),
      language.normalize,
      language.minLength,
    )
    if (!result.ok) {
      flash({ tone: "bad", text: REASONS[result.reason] })
      return
    }
    const nextFound = [...found, result.normalized]
    const before = rankState(score, maximum)
    const after = rankState(score + result.points, maximum)
    const complete = nextFound.length === book.answers.size
    let text = result.pangram ? `פנגרמה! +${result.points}` : `+${result.points}`
    if (complete) text = "כל המילים נמצאו"
    else if (after.current.name !== before.current.name) text = `${text} · ${after.current.name}`
    setFound(nextFound)
    setEntry("")
    persist(nextFound, outer)
    flash({ tone: result.pangram || complete ? "pangram" : "good", text })
  }

  function shuffle() {
    const nextOuter = shuffleWithSeed(outer, hashString(`${day}:${Date.now()}`))
    setOuter(nextOuter)
    persist(found, nextOuter)
  }

  useEffect(() => {
    actions.current = { addLetter, removeLetter, submit }
  })

  if (!puzzle || !book) {
    return <main className="app">אין חידה להיום.</main>
  }

  const lengths = lengthRows(puzzle.words)
  const foundLengths = new Map(lengthRows(foundDisplays))
  const gridLetters = firstLetters(puzzle.words)

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            מ
          </span>
          <div>
            <h1>מילים</h1>
            <p>כוורת אותיות בעברית</p>
          </div>
        </div>
        <div className="day-nav">
          <button type="button" onClick={() => setDate((current) => addDays(current, -1))} aria-label="יום קודם">
            ‹
          </button>
          <div className="day-label">
            <strong>{formatDay(date)}</strong>
            {!isToday && (
              <button type="button" className="texty" onClick={() => setDate(startOfDay(new Date()))}>
                חזרה להיום
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDate((current) => addDays(current, 1))}
            disabled={isToday}
            aria-label="יום הבא"
          >
            ›
          </button>
        </div>
        <button type="button" className="ghost" onClick={() => helpRef.current?.showModal()}>
          איך משחקים
        </button>
      </header>

      <main className="layout">
        <section className="stage">
          <div className="scoreboard">
            <p className="rank">{rank.current.name}</p>
            <p className="points">
              <strong>{score.toLocaleString("he-IL")}</strong>
              <span> / {maximum.toLocaleString("he-IL")}</span>
            </p>
            <div className="track" aria-hidden="true">
              <div className="fill" style={{ width: `${Math.round(rank.within * 100)}%` }} />
            </div>
            <p className="rank-note">
              {rank.next
                ? `${pointsToGo(rank.pointsToNext)} לדרגת ${rank.next.name}`
                : "הכוורת מלאה"}
            </p>
          </div>

          <p className={shake ? "entry shake" : "entry"} aria-label="המילה הנוכחית">
            {Array.from(entry).map((character, index) => (
              <span
                key={`${character}-${index}`}
                className={language.normalize(character) === puzzle.center ? "req" : undefined}
              >
                {character}
              </span>
            ))}
            <span className="caret" />
          </p>
          <p className={notice ? `notice ${notice.tone}` : "notice"} role="status">
            {notice?.text ?? ""}
          </p>

          <Hive center={puzzle.center} outer={outer} onPick={addLetter} />

          <div className="controls">
            <button type="button" onClick={removeLetter}>
              מחיקה
            </button>
            <button type="button" onClick={shuffle}>
              ערבוב
            </button>
            <button type="button" className="primary" onClick={submit}>
              אישור
            </button>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-head">
            <h2>מילים שנמצאו</h2>
            <span>{progress}</span>
          </div>
          {foundDisplays.length === 0 ? (
            <p className="empty">עדיין אין מילים. האות המרכזית חייבת להופיע בכל מילה.</p>
          ) : (
            <ul className="found">
              {foundDisplays.map((word) => (
                <li key={word} className={book.pangrams.has(language.normalize(word)) ? "pangram" : undefined}>
                  {word}
                </li>
              ))}
            </ul>
          )}

          <table className="lengths">
            <caption>מילים לפי אורך</caption>
            <thead>
              <tr>
                <th>אורך</th>
                <th>נמצאו</th>
              </tr>
            </thead>
            <tbody>
              {lengths.map(([length, total]) => (
                <tr key={length}>
                  <td>{length.toLocaleString("he-IL")}</td>
                  <td>
                    {(foundLengths.get(length) ?? 0).toLocaleString("he-IL")}
                    <span> / {total.toLocaleString("he-IL")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" className="ghost wide" onClick={() => setShowGrid((open) => !open)}>
            {showGrid ? "הסתרת רמז" : "רמז לפי אות פותחת"}
          </button>
          {showGrid && (
            <div className="grid-scroll">
              <table className="grid">
                <caption>כמה מילים מתחילות בכל אות</caption>
                <thead>
                  <tr>
                    <th>אות</th>
                    {lengths.map(([length]) => (
                      <th key={length}>{length.toLocaleString("he-IL")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridLetters.map(([letter, counts]) => (
                    <tr key={letter}>
                      <th scope="row">{letter}</th>
                      {lengths.map(([length]) => (
                        <td key={length}>{(counts.get(length) ?? 0) || ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </main>

      <footer>
        <p>
          משחק מקורי. רשימת המילים היא מבחר שכיח מתוך{" "}
          <a href="http://hspell.ivrix.org.il/">Hspell</a> של נדב הראל ודן קניגסברג, דרך{" "}
          <a href="https://github.com/eyaler/hebrew_wordlists">hebrew_wordlists</a>, ברישיון AGPL-3.0.
        </p>
      </footer>

      <dialog ref={helpRef} className="help" onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}>
        <h2>איך משחקים</h2>
        <ol>
          <li>מצאו מילים בעברית שמשתמשות רק באותיות שבכוורת.</li>
          <li>כל מילה חייבת לכלול את האות המרכזית. אותיות יכולות לחזור.</li>
          <li>מילה קצרה מארבע אותיות לא נספרת.</li>
          <li>אות סופית נחשבת כמו האות הרגילה: ך כ, ם מ, ן נ, ף פ, ץ צ.</li>
          <li>מילה בת ארבע אותיות שווה נקודה. מילה ארוכה יותר שווה נקודה לכל אות.</li>
          <li>מילה שמשתמשת בכל שבע האותיות היא פנגרמה ומזכה בשבע נקודות נוספות.</li>
        </ol>
        <p>אפשר ללחוץ על האותיות או להקליד בעברית. Enter מאשר, Backspace מוחק.</p>
        <button type="button" className="primary" onClick={() => helpRef.current?.close()}>
          יאללה
        </button>
      </dialog>
    </div>
  )
}

function pointsToGo(count: number) {
  if (count === 1) return "עוד נקודה אחת"
  return `עוד ${count.toLocaleString("he-IL")} נקודות`
}

function firstLetters(words: readonly string[]) {
  const rows = new Map<string, Map<number, number>>()
  for (const word of words) {
    const characters = Array.from(word)
    const first = characters[0]
    if (!first) continue
    const counts = rows.get(first) ?? new Map<number, number>()
    counts.set(characters.length, (counts.get(characters.length) ?? 0) + 1)
    rows.set(first, counts)
  }
  return [...rows.entries()].sort((left, right) => left[0].localeCompare(right[0], "he"))
}

export default App
