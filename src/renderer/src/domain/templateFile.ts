import { Board, BOARD_SIZE, Cell } from './types'
import { createEmptyWallBoard, createWhiteCell } from './board'

/**
 * A hand-editable Kakuro board definition. Deliberately simple and self-contained — no reference
 * to any other file or app state is needed to understand or build one from scratch: a grid of
 * '#' (wall) / '.' (white cell) characters, plus one entry per clue sum. See templates/README.md
 * for a full walkthrough and worked example.
 */
export interface TemplateFileV1 {
  version: 1
  name: string
  size: number
  /** One string per row. '#' = wall/blocked cell, '.' = white/playable cell. Row 0 and column 0 must be all '#'. */
  grid: string[]
  /** One entry per clue-bearing wall cell. `right` is the sum for the run starting immediately to its right; `down` is the sum for the run starting immediately below it. A cell can have either, both, or (if it's a plain wall) neither. */
  clues: { row: number; col: number; right?: number; down?: number }[]
}

export function boardToTemplateFile(board: Board, name: string): TemplateFileV1 {
  const size = board.length
  const grid = board.map((row) => row.map((cell) => (cell.kind === 'wall' ? '#' : '.')).join(''))

  const clues: TemplateFileV1['clues'] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = board[row][col]
      if (cell.kind === 'wall' && (cell.rightSum !== undefined || cell.downSum !== undefined)) {
        clues.push({ row, col, right: cell.rightSum, down: cell.downSum })
      }
    }
  }

  return { version: 1, name, size, grid, clues }
}

/** Builds a Board from a template file. White cells get `solution: 0` — this is a layout + clues definition, not a solved board; validate and solve it (see `customPuzzle.ts`) before treating it as playable. */
export function templateFileToBoard(file: TemplateFileV1): Board {
  const size = file.size
  const board: Board = createEmptyWallBoard(size)

  for (let row = 0; row < size; row++) {
    const rowStr = file.grid[row] ?? ''
    for (let col = 0; col < size; col++) {
      board[row][col] = rowStr[col] === '.' ? createWhiteCell() : { kind: 'wall' }
    }
  }

  for (const clue of file.clues) {
    const cell: Cell | undefined = board[clue.row]?.[clue.col]
    if (cell && cell.kind === 'wall') {
      if (clue.right !== undefined) cell.rightSum = clue.right
      if (clue.down !== undefined) cell.downSum = clue.down
    }
  }

  return board
}

export interface TemplateParseError {
  error: string
}

/** Runtime validation for a file the user hand-edited (or downloaded from anywhere) — never trust its shape. */
export function parseTemplateFile(data: unknown): TemplateFileV1 | TemplateParseError {
  if (typeof data !== 'object' || data === null) return { error: 'Not a valid template file (expected a JSON object).' }
  const obj = data as Record<string, unknown>

  if (obj.version !== 1) return { error: 'Unsupported template version — expected "version": 1.' }
  if (typeof obj.size !== 'number' || obj.size < 4 || obj.size > 20) {
    return { error: '"size" must be a number between 4 and 20.' }
  }
  if (!Array.isArray(obj.grid) || obj.grid.length !== obj.size) {
    return { error: `"grid" must be an array of ${obj.size} row strings.` }
  }
  for (const row of obj.grid) {
    if (typeof row !== 'string' || row.length !== obj.size || !/^[.#]+$/.test(row)) {
      return { error: `Every "grid" row must be a ${obj.size}-character string of only "." and "#".` }
    }
  }
  if (obj.grid[0].includes('.') || (obj.grid as string[]).some((row) => row[0] === '.')) {
    return { error: 'Row 0 and column 0 must be all "#" — they hold the border clues.' }
  }
  if (!Array.isArray(obj.clues)) return { error: '"clues" must be an array.' }
  for (const clue of obj.clues) {
    if (
      typeof clue !== 'object' ||
      clue === null ||
      typeof (clue as Record<string, unknown>).row !== 'number' ||
      typeof (clue as Record<string, unknown>).col !== 'number'
    ) {
      return { error: 'Every entry in "clues" needs numeric "row" and "col".' }
    }
  }

  return {
    version: 1,
    name: typeof obj.name === 'string' ? obj.name : 'Imported board',
    size: obj.size,
    grid: obj.grid as string[],
    clues: obj.clues as TemplateFileV1['clues']
  }
}

export function isTemplateParseError(result: TemplateFileV1 | TemplateParseError): result is TemplateParseError {
  return 'error' in result
}

export const DEFAULT_TEMPLATE_SIZE = BOARD_SIZE
