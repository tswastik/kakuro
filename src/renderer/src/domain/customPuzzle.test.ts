import { describe, expect, it } from 'vitest'
import { createEmptyWallBoard } from './board'
import { createWhiteCell } from './board'
import { validateClues } from './customPuzzle'

/** The same known 2x2 unique puzzle used elsewhere, but expressed as manually-entered clues (no known solution yet). */
function buildKnownClueBoard() {
  const board = createEmptyWallBoard(4)
  board[1][1] = createWhiteCell()
  board[1][2] = createWhiteCell()
  board[2][1] = createWhiteCell()
  board[2][2] = createWhiteCell()
  board[1][0] = { kind: 'wall', rightSum: 3 } // row1: 1+2
  board[2][0] = { kind: 'wall', rightSum: 7 } // row2: 3+4
  board[0][1] = { kind: 'wall', downSum: 4 } // col1: 1+3
  board[0][2] = { kind: 'wall', downSum: 6 } // col2: 2+4
  return board
}

describe('validateClues', () => {
  it('reports "unique" with the correct solution for a fully-specified, uniquely-solvable board', () => {
    const board = buildKnownClueBoard()
    const result = validateClues(board, 4)
    expect(result.status).toBe('unique')
    if (result.status === 'unique') {
      expect(result.solution.get('1,1')).toBe(1)
      expect(result.solution.get('1,2')).toBe(2)
      expect(result.solution.get('2,1')).toBe(3)
      expect(result.solution.get('2,2')).toBe(4)
    }
  })

  it('reports "incomplete" when a clue is missing', () => {
    const board = buildKnownClueBoard()
    ;(board[2][0] as { rightSum?: number }).rightSum = undefined
    const result = validateClues(board, 4)
    expect(result.status).toBe('incomplete')
  })

  it('reports "unsolvable" when a sum has no valid combination', () => {
    const board = buildKnownClueBoard()
    ;(board[1][0] as { rightSum?: number }).rightSum = 100
    const result = validateClues(board, 4)
    expect(result.status).toBe('unsolvable')
  })

  it('reports "ambiguous" for a plain rectangular block prone to symmetric solutions', () => {
    const board = createEmptyWallBoard(5)
    board[1][1] = createWhiteCell()
    board[1][2] = createWhiteCell()
    board[2][1] = createWhiteCell()
    board[2][2] = createWhiteCell()
    board[3][1] = createWhiteCell()
    board[3][2] = createWhiteCell()
    board[1][0] = { kind: 'wall', rightSum: 3 } // {1,2}
    board[2][0] = { kind: 'wall', rightSum: 7 } // {3,4} or other combos
    board[3][0] = { kind: 'wall', rightSum: 11 }
    board[0][1] = { kind: 'wall', downSum: 6 }
    board[0][2] = { kind: 'wall', downSum: 15 }

    const result = validateClues(board, 5)
    expect(['ambiguous', 'unsolvable']).toContain(result.status)
  })
})
