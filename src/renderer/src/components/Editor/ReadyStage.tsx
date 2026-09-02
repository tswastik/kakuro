import { useState } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { ClueCell } from '../Board/ClueCell'

export function ReadyStage() {
  const board = useEditorStore((s) => s.board)
  const readyProven = useEditorStore((s) => s.readyProven)
  const savedTemplateName = useEditorStore((s) => s.savedTemplateName)
  const saveTemplate = useEditorStore((s) => s.saveTemplate)
  const backToClues = useEditorStore((s) => s.backToClues)
  const playNow = useEditorStore((s) => s.playNow)
  const [name, setName] = useState('')

  const size = board.length

  function handleSave(): void {
    if (!name.trim()) return
    saveTemplate(name.trim())
  }

  return (
    <div className="editor-stage">
      <p className="editor-instructions">
        {readyProven
          ? 'Your board is ready — it has exactly one solution.'
          : "Your board is ready, but keep in mind it wasn't proven to have exactly one solution (you chose to use it anyway)."}{' '}
        Save it as a template to play later (or hand it to someone else using this app), or play
        it right now.
      </p>

      <div className="board-wrapper">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, var(--cell-size))` }}>
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div className="board-cell" key={`${r}-${c}`}>
                {cell.kind === 'wall' ? (
                  <ClueCell rightSum={cell.rightSum} downSum={cell.downSum} />
                ) : (
                  <div className="white-cell" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="editor-footer">
        <div className="save-template-row">
          <input
            type="text"
            className="clue-row__input save-template-input"
            placeholder="Name this board"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={handleSave} disabled={!name.trim()}>
            Save Template
          </button>
        </div>
        {savedTemplateName && <p className="editor-success">Saved as "{savedTemplateName}".</p>}

        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={backToClues}>
            ← Back to Clues
          </button>
          <button className="btn btn-primary" onClick={playNow}>
            Play Now
          </button>
        </div>
      </div>
    </div>
  )
}
