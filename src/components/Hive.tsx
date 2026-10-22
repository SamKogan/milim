type HiveProps = {
  center: string
  outer: string[]
  onPick: (letter: string) => void
}

const NEIGHBOR_ANGLES = [300, 0, 60, 120, 180, 240]

export function Hive({ center, outer, onPick }: HiveProps) {
  const size = 48
  const dist = Math.sqrt(3) * size + 10
  const width = Math.sqrt(3) * size
  const height = size * 2
  const padX = dist + width / 2
  const padY = dist * Math.sin(Math.PI / 3) + height / 2
  const cells = [
    ...outer.map((letter, index) => {
      const turn = ((NEIGHBOR_ANGLES[index] ?? 0) * Math.PI) / 180
      return {
        letter,
        core: false,
        x: Math.cos(turn) * dist,
        y: -Math.sin(turn) * dist,
      }
    }),
    { letter: center, core: true, x: 0, y: 0 },
  ]

  return (
    <div
      className="hive"
      style={{ width: padX * 2, height: padY * 2 }}
      role="group"
      aria-label="אותיות הכוורת"
    >
      {cells.map((cell, index) => (
        <button
          key={cell.core ? "center" : `${cell.letter}-${index}`}
          type="button"
          className={cell.core ? "cell core" : "cell"}
          style={{
            width,
            height,
            left: padX + cell.x - width / 2,
            top: padY + cell.y - height / 2,
          }}
          onClick={() => onPick(cell.letter)}
          aria-label={cell.core ? `האות המרכזית ${cell.letter}` : `האות ${cell.letter}`}
        >
          {cell.letter}
        </button>
      ))}
    </div>
  )
}
