import { Board, CellCoord, Run } from '@domain/types'
import { deriveRuns } from '@domain/board'
import { combinationsFor } from '@domain/combinations'
import { useEditorStore } from '../../store/useEditorStore'

function wallCoordFor(run: Run): CellCoord {
  const first = run.cells[0]
  return run.direction === 'across' ? { row: first.row, col: first.col - 1 } : { row: first.row - 1, col: first.col }
}

function currentClue(board: Board, run: Run): number | undefined {
  const { row, col } = wallCoordFor(run)
  const wall = board[row][col]
  if (wall.kind !== 'wall') return undefined
  return run.direction === 'across' ? wall.rightSum : wall.downSum
}

function RunRow({ run }: { run: Run }) {
  const board = useEditorStore((s) => s.board)
  const setClueValue = useEditorStore((s) => s.setClueValue)
  const value = currentClue(board, run)
  const feasible = value === undefined || value <= 0 || combinationsFor(run.cells.length, value).length > 0
  const first = run.cells[0]

  return (
    <div className={`clue-row ${!feasible ? 'clue-row--invalid' : ''}`}>
      <span className="clue-row__label">
        Row {first.row}, Col {first.col} · {run.cells.length} cells
      </span>
      <input
        type="number"
        min={3}
        max={45}
        className="clue-row__input"
        value={value ?? ''}
        placeholder="Sum"
        onChange={(e) => {
          const raw = e.target.value
          const num = raw === '' ? null : Number(raw)
          setClueValue(wallCoordFor(run), run.direction === 'across' ? 'right' : 'down', num)
        }}
      />
      {!feasible && <span className="clue-row__warning">not possible for {run.cells.length} cells</span>}
    </div>
  )
}

export function ClueStage() {
  const board = useEditorStore((s) => s.board)
  const clueValidation = useEditorStore((s) => s.clueValidation)
  const validate = useEditorStore((s) => s.validate)
  const proceedToReady = useEditorStore((s) => s.proceedToReady)
  const useAmbiguousAnyway = useEditorStore((s) => s.useAmbiguousAnyway)
  const backToDesign = useEditorStore((s) => s.backToDesign)

  const runs = deriveRuns(board)
  const acrossRuns = runs.filter((r) => r.direction === 'across')
  const downRuns = runs.filter((r) => r.direction === 'down')

  return (
    <div className="editor-stage">
      <p className="editor-instructions">
        Type the sum clue for every run. Down-run (↓) clues sit at the bottom-left of a clue cell,
        right-run (→) clues at the top-right — same as the board.
      </p>

      <div className="clue-columns">
        <div className="clue-column">
          <h3>Across runs (→)</h3>
          {acrossRuns.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
        <div className="clue-column">
          <h3>Down runs (↓)</h3>
          {downRuns.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      </div>

      <div className="editor-footer">
        {clueValidation?.status === 'invalid-structure' && (
          <p className="editor-warning">This layout isn't valid anymore — go back and check it.</p>
        )}
        {clueValidation?.status === 'incomplete' && (
          <p className="editor-warning">
            {clueValidation.missingCount} clue{clueValidation.missingCount > 1 ? 's are' : ' is'} still empty.
          </p>
        )}
        {clueValidation?.status === 'unsolvable' && (
          <p className="editor-warning">
            These clues don't have any valid solution — double-check the sums.
          </p>
        )}
        {clueValidation?.status === 'ambiguous' && (
          <div className="editor-warning-block">
            <p className="editor-warning">
              These clues have more than one possible solution. You can adjust a sum to make it
              unique, or use it anyway.
            </p>
            <button className="btn btn-secondary" onClick={useAmbiguousAnyway}>
              Use Anyway
            </button>
          </div>
        )}
        {clueValidation?.status === 'unique' && (
          <p className="editor-success">✓ Every clue checks out — this board has exactly one solution.</p>
        )}

        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={backToDesign}>
            ← Back to Design
          </button>
          <button className="btn btn-secondary" onClick={validate}>
            Validate Clues
          </button>
          <button
            className="btn btn-primary"
            onClick={proceedToReady}
            disabled={clueValidation?.status !== 'unique'}
          >
            Next: Ready →
          </button>
        </div>
      </div>
    </div>
  )
}
