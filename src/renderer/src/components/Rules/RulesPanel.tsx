import { useUiStore } from '../../store/useUiStore'
import './RulesPanel.css'

export function RulesPanel() {
  const rulesOpen = useUiStore((s) => s.rulesOpen)
  const toggleRules = useUiStore((s) => s.toggleRules)

  if (!rulesOpen) return null

  return (
    <div className="rules-backdrop" onClick={toggleRules}>
      <div className="rules-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rules-panel__header">
          <h2>How to Play Kakuro</h2>
          <button className="rules-panel__close" onClick={toggleRules} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="rules-panel__body">
          <section>
            <h3>The goal</h3>
            <p>
              Fill every white cell with a digit from 1–9 so that the digits in each run (a
              horizontal or vertical strip of white cells) add up to the clue number shown on the
              brown wall cell beside it.
            </p>
          </section>

          <section>
            <h3>The two rules</h3>
            <ul>
              <li>Every run must sum to exactly the clue number next to it.</li>
              <li>No digit may repeat within the same run.</li>
            </ul>
          </section>

          <section>
            <h3>Reading the clues</h3>
            <p>
              Each brown clue cell is split diagonally. The number in the lower-left, next to{' '}
              <strong>↓</strong>, is the sum for the run going down. The number in the upper-right,
              next to <strong>→</strong>, is the sum for the run going right.
            </p>
          </section>

          <section>
            <h3>Controls</h3>
            <ul>
              <li>Click a cell, then type a digit (1–9) or use the on-screen keypad.</li>
              <li>Arrow keys move the selection between white cells.</li>
              <li>Backspace / Delete clears the selected cell.</li>
              <li>
                Toggle <strong>Pencil</strong> mode (or press Tab) to jot small candidate digits
                instead of a final answer.
              </li>
              <li>
                <strong>Check</strong> flags any filled-in wrong digits in red — it never reveals
                the correct answer.
              </li>
              <li>
                <strong>Solve</strong> instantly fills in the full solution — there are no hints
                along the way, so use it only when you're ready to give up on this attempt.
              </li>
              <li>
                <strong>Pause</strong> hides the board completely so you can step away without
                peeking.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
