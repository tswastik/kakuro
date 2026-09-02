import { usePuzzleStore } from '../../store/usePuzzleStore'
import { useUiStore } from '../../store/useUiStore'
import { useTimerStore } from '../../store/useTimerStore'

export function DigitPad() {
  const setDigit = usePuzzleStore((s) => s.setDigit)
  const clearSelectedCell = usePuzzleStore((s) => s.clearSelectedCell)
  const pencilMode = useUiStore((s) => s.pencilMode)
  const paused = useTimerStore((s) => s.paused)

  return (
    <div className="digit-pad">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
        <button
          key={digit}
          className="digit-pad__key"
          disabled={paused}
          onClick={() => setDigit(digit, pencilMode)}
        >
          {digit}
        </button>
      ))}
      <button className="digit-pad__key digit-pad__key--clear" disabled={paused} onClick={clearSelectedCell}>
        ✕
      </button>
    </div>
  )
}
