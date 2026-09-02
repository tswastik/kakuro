import { useEffect, useState } from 'react'
import { SavedTemplate, deleteTemplate, listTemplates } from '@domain/templateStorage'
import { boardToTemplateFile } from '@domain/templateFile'
import { useEditorStore } from '../../store/useEditorStore'
import { useUiStore } from '../../store/useUiStore'
import './TemplatesModal.css'

interface TemplatesModalProps {
  onClose: () => void
}

export function TemplatesModal({ onClose }: TemplatesModalProps) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const loadTemplate = useEditorStore((s) => s.loadTemplate)
  const playNow = useEditorStore((s) => s.playNow)
  const goTo = useUiStore((s) => s.goTo)

  useEffect(() => {
    setTemplates(listTemplates())
  }, [])

  function handlePlay(template: SavedTemplate): void {
    loadTemplate(template)
    playNow()
    onClose()
  }

  function handleEdit(template: SavedTemplate): void {
    loadTemplate(template)
    goTo('editor')
    onClose()
  }

  function handleDelete(id: string): void {
    deleteTemplate(id)
    setTemplates(listTemplates())
  }

  function handleExport(template: SavedTemplate): void {
    const file = boardToTemplateFile(template.board, template.name)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'kakuro-board'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rules-backdrop" onClick={onClose}>
      <div className="templates-modal" onClick={(e) => e.stopPropagation()}>
        <div className="templates-modal__header">
          <h2>My Boards</h2>
          <button className="rules-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="templates-modal__body">
          {templates.length === 0 && (
            <p className="templates-modal__empty">
              No saved boards yet — design one and save it as a template to see it here.
            </p>
          )}
          {templates.map((t) => (
            <div key={t.id} className="template-row">
              <div className="template-row__info">
                <span className="template-row__name">{t.name}</span>
                <span className="template-row__date">
                  {new Date(t.createdAt).toLocaleDateString()}
                  {!t.proven && ' · not proven unique'}
                </span>
              </div>
              <div className="template-row__actions">
                <button className="btn btn-primary" onClick={() => handlePlay(t)}>
                  Play
                </button>
                <button className="btn btn-secondary" onClick={() => handleEdit(t)}>
                  Edit
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport(t)}>
                  Export
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(t.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
