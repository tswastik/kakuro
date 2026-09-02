import { useEditorStore } from '../../store/useEditorStore'

export function DesignStage() {
  const board = useEditorStore((s) => s.board)
  const invalidRunCount = useEditorStore((s) => s.invalidRunCount)
  const toggleCell = useEditorStore((s) => s.toggleCell)
  const resetBoard = useEditorStore((s) => s.resetBoard)
  const goToClueStage = useEditorStore((s) => s.goToClueStage)

  const size = board.length
  const hasAnyRun = board.some((row) => row.some((cell) => cell.kind === 'white'))

  return (
    <div className="editor-stage">
      <p className="editor-instructions">
        Click cells to carve out white paths (brown stays as a wall). Every white run needs 2–9
        cells.
      </p>

      <div className="editor-grid" style={{ gridTemplateColumns: `repeat(${size}, var(--editor-cell-size))` }}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`editor-cell ${cell.kind === 'wall' ? 'editor-cell--wall' : 'editor-cell--white'}`}
              onClick={() => toggleCell({ row: r, col: c })}
              aria-label={cell.kind === 'wall' ? 'Wall cell' : 'White cell'}
            />
          ))
        )}
      </div>

      <div className="editor-footer">
        {invalidRunCount > 0 && (
          <p className="editor-warning">
            {invalidRunCount} run{invalidRunCount > 1 ? 's are' : ' is'} too short — every white
            strip needs at least 2 cells.
          </p>
        )}

        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={resetBoard}>
            Clear Board
          </button>
          <button
            className="btn btn-primary"
            onClick={goToClueStage}
            disabled={invalidRunCount > 0 || !hasAnyRun}
          >
            Next: Enter Clues →
          </button>
        </div>
      </div>
    </div>
  )
}
