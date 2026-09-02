import { useRef, useState } from 'react'
import { Difficulty } from '@domain/types'
import { usePuzzleStore } from '../../store/usePuzzleStore'
import { useUiStore } from '../../store/useUiStore'
import { useEditorStore } from '../../store/useEditorStore'
import { TemplatesModal } from './TemplatesModal'
import './HomeScreen.css'

const DIFFICULTIES: { value: Exclude<Difficulty, 'custom'>; label: string; blurb: string }[] = [
  { value: 'easy', label: 'Easy', blurb: 'Bigger runs, gentle logic — great for getting started.' },
  { value: 'medium', label: 'Medium', blurb: 'A balanced challenge with a few tricky crossings.' },
  { value: 'hard', label: 'Hard', blurb: 'Dense, twisty runs that reward careful deduction.' }
]

export function HomeScreen() {
  const newPuzzle = usePuzzleStore((s) => s.newPuzzle)
  const goTo = useUiStore((s) => s.goTo)
  const toggleRules = useUiStore((s) => s.toggleRules)
  const importFromFile = useEditorStore((s) => s.importFromFile)
  const [showTemplates, setShowTemplates] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startPuzzle(difficulty: Exclude<Difficulty, 'custom'>): void {
    newPuzzle(difficulty)
    goTo('board')
  }

  function handleImportClick(): void {
    setImportError(null)
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = importFromFile(String(reader.result))
      if (result.ok) {
        setImportError(null)
        goTo('editor')
      } else {
        setImportError(result.error)
      }
    }
    reader.onerror = () => setImportError('Could not read that file.')
    reader.readAsText(file)
  }

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-hero__badge">10 × 10</div>
        <h1 className="home-title">Kakuro</h1>
        <p className="home-subtitle">Sum your way to a solved board.</p>
      </div>

      <div className="difficulty-grid">
        {DIFFICULTIES.map((d) => (
          <button key={d.value} className="difficulty-card" onClick={() => startPuzzle(d.value)}>
            <span className={`difficulty-card__badge difficulty-card__badge--${d.value}`}>{d.label}</span>
            <span className="difficulty-card__blurb">{d.blurb}</span>
          </button>
        ))}
      </div>

      <div className="home-actions">
        <button className="btn btn-secondary" onClick={() => goTo('editor')}>
          Design Your Own Board
        </button>
        <button className="btn btn-secondary" onClick={() => setShowTemplates(true)}>
          My Boards
        </button>
        <button className="btn btn-secondary" onClick={handleImportClick}>
          Import Board
        </button>
        <button className="btn btn-secondary" onClick={toggleRules}>
          How to Play
        </button>
      </div>

      {importError && <p className="home-import-error">{importError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
    </div>
  )
}
