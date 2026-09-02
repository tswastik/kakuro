import { usePuzzleStore } from '../../store/usePuzzleStore'
import { useUiStore } from '../../store/useUiStore'
import { useTimerStore } from '../../store/useTimerStore'
import { Timer } from '../Timer/Timer'

export function Toolbar() {
  const puzzle = usePuzzleStore((s) => s.puzzle)
  const solved = usePuzzleStore((s) => s.solved)
  const newPuzzle = usePuzzleStore((s) => s.newPuzzle)
  const goTo = useUiStore((s) => s.goTo)
  const toggleRules = useUiStore((s) => s.toggleRules)
  const paused = useTimerStore((s) => s.paused)
  const resume = useTimerStore((s) => s.resume)
  const pause = useTimerStore((s) => s.pause)

  function handleNewGame(): void {
    if (puzzle && puzzle.difficulty !== 'custom') {
      newPuzzle(puzzle.difficulty)
    } else {
      goTo('home')
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button className="btn btn-secondary" onClick={handleNewGame}>
          New Game
        </button>
        <button className="btn btn-secondary" onClick={() => goTo('home')}>
          Quit
        </button>
      </div>

      <Timer />

      <div className="toolbar__group">
        <button
          className="btn btn-secondary"
          onClick={() => (paused ? resume() : pause())}
          disabled={solved}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button className="btn btn-secondary" onClick={toggleRules}>
          How to Play
        </button>
      </div>
    </div>
  )
}
