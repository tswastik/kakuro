import { Board } from './types'

export interface SavedTemplate {
  id: string
  name: string
  createdAt: number
  size: number
  /** A fully-solved board (wall clue sums + white solution digits). userDigit/pencilMarks/state are reset on load. */
  board: Board
  /** False if this was saved after "Use Anyway" on an ambiguous set of clues rather than a proven-unique one. */
  proven: boolean
}

const STORAGE_KEY = 'kakuro.customTemplates.v1'

function readAll(): SavedTemplate[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(templates: SavedTemplate[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — saving is best-effort.
  }
}

export function listTemplates(): SavedTemplate[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveTemplate(name: string, board: Board, size: number, proven: boolean): SavedTemplate {
  const template: SavedTemplate = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled board',
    createdAt: Date.now(),
    size,
    board,
    proven
  }
  const templates = readAll()
  templates.push(template)
  writeAll(templates)
  return template
}

export function getTemplate(id: string): SavedTemplate | null {
  return readAll().find((t) => t.id === id) ?? null
}

export function deleteTemplate(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id))
}
