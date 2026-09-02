import { useEditorStore } from '../../store/useEditorStore'
import { useUiStore } from '../../store/useUiStore'
import { DesignStage } from './DesignStage'
import { ClueStage } from './ClueStage'
import { ReadyStage } from './ReadyStage'
import './BoardEditor.css'

const STAGES = [
  { key: 'design', label: '1. Design' },
  { key: 'clues', label: '2. Clues' },
  { key: 'ready', label: '3. Ready' }
] as const

export function BoardEditor() {
  const stage = useEditorStore((s) => s.stage)
  const goTo = useUiStore((s) => s.goTo)

  return (
    <div className="editor-screen">
      <div className="editor-header">
        <button className="btn btn-secondary" onClick={() => goTo('home')}>
          ← Back
        </button>
        <h2>Design Your Own Board</h2>
        <div style={{ width: 84 }} />
      </div>

      <div className="editor-stepper">
        {STAGES.map((s) => (
          <div key={s.key} className={`editor-stepper__step ${stage === s.key ? 'editor-stepper__step--active' : ''}`}>
            {s.label}
          </div>
        ))}
      </div>

      {stage === 'design' && <DesignStage />}
      {stage === 'clues' && <ClueStage />}
      {stage === 'ready' && <ReadyStage />}
    </div>
  )
}
