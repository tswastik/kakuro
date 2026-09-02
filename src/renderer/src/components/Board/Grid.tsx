import { useEffect, useRef } from 'react'
import { usePuzzleStore } from '../../store/usePuzzleStore'
import { useUiStore } from '../../store/useUiStore'
import { useTimerStore } from '../../store/useTimerStore'
import { Cell } from './Cell'

export function Grid() {
  const size = usePuzzleStore((s) => s.puzzle!.board.length)
  const moveSelection = usePuzzleStore((s) => s.moveSelection)
  const setDigit = usePuzzleStore((s) => s.setDigit)
  const clearSelectedCell = usePuzzleStore((s) => s.clearSelectedCell)
  const pencilMode = useUiStore((s) => s.pencilMode)
  const togglePencilMode = useUiStore((s) => s.togglePencilMode)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (useTimerStore.getState().paused) return

    if (e.key === 'ArrowUp') moveSelection(-1, 0)
    else if (e.key === 'ArrowDown') moveSelection(1, 0)
    else if (e.key === 'ArrowLeft') moveSelection(0, -1)
    else if (e.key === 'ArrowRight') moveSelection(0, 1)
    else if (e.key >= '1' && e.key <= '9') setDigit(Number(e.key), pencilMode)
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') clearSelectedCell()
    else if (e.key === 'Tab') {
      e.preventDefault()
      togglePencilMode()
    } else {
      return
    }
    e.preventDefault()
  }

  const coords = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({ row, col }))
  ).flat()

  return (
    <div
      ref={containerRef}
      className="grid"
      style={{ gridTemplateColumns: `repeat(${size}, var(--cell-size))` }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {coords.map((coord) => (
        <Cell key={`${coord.row}-${coord.col}`} coord={coord} />
      ))}
    </div>
  )
}
