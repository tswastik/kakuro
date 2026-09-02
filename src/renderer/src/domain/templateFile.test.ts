import { describe, expect, it } from 'vitest'
import { createEmptyWallBoard, createWhiteCell, deriveRuns, stampClueSums } from './board'
import {
  boardToTemplateFile,
  isTemplateParseError,
  parseTemplateFile,
  templateFileToBoard
} from './templateFile'

function buildSolvedBoard() {
  const board = createEmptyWallBoard(4)
  board[1][1] = createWhiteCell(1)
  board[1][2] = createWhiteCell(2)
  board[2][1] = createWhiteCell(3)
  board[2][2] = createWhiteCell(4)
  stampClueSums(board, deriveRuns(board))
  return board
}

describe('template file round-trip', () => {
  it('preserves layout and clue sums through boardToTemplateFile -> parse -> templateFileToBoard', () => {
    const board = buildSolvedBoard()
    const file = boardToTemplateFile(board, 'Test Board')

    expect(file.grid).toEqual(['####', '#..#', '#..#', '####'])
    expect(file.clues).toEqual(
      expect.arrayContaining([
        { row: 1, col: 0, right: 3, down: undefined },
        { row: 2, col: 0, right: 7, down: undefined },
        { row: 0, col: 1, right: undefined, down: 4 },
        { row: 0, col: 2, right: undefined, down: 6 }
      ])
    )

    const parsed = parseTemplateFile(JSON.parse(JSON.stringify(file)))
    expect(isTemplateParseError(parsed)).toBe(false)
    if (isTemplateParseError(parsed)) return

    const rebuilt = templateFileToBoard(parsed)
    expect(rebuilt[1][1].kind).toBe('white')
    expect(rebuilt[1][0]).toMatchObject({ kind: 'wall', rightSum: 3 })
    expect(rebuilt[0][1]).toMatchObject({ kind: 'wall', downSum: 4 })
  })
})

describe('parseTemplateFile validation', () => {
  it('rejects the wrong version', () => {
    const result = parseTemplateFile({ version: 2, size: 4, grid: ['####', '####', '####', '####'], clues: [] })
    expect(isTemplateParseError(result)).toBe(true)
  })

  it('rejects a grid row of the wrong length', () => {
    const result = parseTemplateFile({ version: 1, size: 4, grid: ['###', '####', '####', '####'], clues: [] })
    expect(isTemplateParseError(result)).toBe(true)
  })

  it('rejects a grid with characters other than . and #', () => {
    const result = parseTemplateFile({ version: 1, size: 4, grid: ['####', '#x.#', '#..#', '####'], clues: [] })
    expect(isTemplateParseError(result)).toBe(true)
  })

  it('rejects a border (row 0 / col 0) that is not all walls', () => {
    const result = parseTemplateFile({ version: 1, size: 4, grid: ['#.##', '#..#', '#..#', '####'], clues: [] })
    expect(isTemplateParseError(result)).toBe(true)
  })

  it('accepts a minimal valid file', () => {
    const result = parseTemplateFile({
      version: 1,
      name: 'Minimal',
      size: 4,
      grid: ['####', '#..#', '#..#', '####'],
      clues: [{ row: 1, col: 0, right: 3 }]
    })
    expect(isTemplateParseError(result)).toBe(false)
  })
})
