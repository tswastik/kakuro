import { useState } from 'react'
import { usePuzzleStore } from '../../store/usePuzzleStore'
import { useUiStore } from '../../store/useUiStore'
import { useTimerStore } from '../../store/useTimerStore'
import { DigitPad } from './DigitPad'
import { ConfirmDialog } from '../common/ConfirmDialog'

export function SidePanel() {
  const checkBoard = usePuzzleStore((s) => s.checkBoard)
  const solveBoard = usePuzzleStore((s) => s.solveBoard)
  const solved = usePuzzleStore((s) => s.solved)
  const pencilMode = useUiStore((s) => s.pencilMode)
  const togglePencilMode = useUiStore((s) => s.togglePencilMode)
  const paused = useTimerStore((s) => s.paused)
  const [confirmingSolve, setConfirmingSolve] = useState(false)

  return (
    <div className="side-panel">
      <DigitPad />

      <button
        className={`btn ${pencilMode ? 'btn-primary' : 'btn-secondary'} side-panel__btn`}
        onClick={togglePencilMode}
        title="Toggle pencil marks (Tab)"
      >
        ✏ Pencil
      </button>
      <button
        className="btn btn-secondary side-panel__btn"
        onClick={checkBoard}
        disabled={paused || solved}
      >
        Check
      </button>
      <button
        className="btn btn-danger side-panel__btn"
        onClick={() => setConfirmingSolve(true)}
        disabled={solved}
      >
        Solve
      </button>

      {confirmingSolve && (
        <ConfirmDialog
          title="Reveal the solution?"
          message="This fills in every answer and ends your current attempt."
          confirmLabel="Reveal Solution"
          onConfirm={() => {
            solveBoard()
            setConfirmingSolve(false)
          }}
          onCancel={() => setConfirmingSolve(false)}
        />
      )}
    </div>
  )
}
