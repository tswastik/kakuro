import { describe, expect, it } from 'vitest'
import { createEmptyWallBoard, createWhiteCell, deriveRuns } from './board'
import { countSolutionsUpTo, solveFromClues } from './solver'

/**
 * A minimal hand-crafted 2x2 Kakuro block with a known unique solution:
 *   row1: 1 2   (sum 3)
 *   row2: 3 4   (sum 7)
 *   col1: 1 3   (sum 4)
 *   col2: 2 4   (sum 6)
 */
function buildKnownPuzzle() {
  const board = createEmptyWallBoard(4)
  board[1][1] = createWhiteCell(1)
  board[1][2] = createWhiteCell(2)
  board[2][1] = createWhiteCell(3)
  board[2][2] = createWhiteCell(4)
  const runs = deriveRuns(board) // computes sums from the solution digits above
  return { board, runs }
}

describe('solveFromClues', () => {
  it('solves a known puzzle using only the clue sums, not the stored solution', () => {
    const { runs } = buildKnownPuzzle()
    const solution = solveFromClues(runs, 4)

    expect(solution).not.toBeNull()
    expect(solution!.get('1,1')).toBe(1)
    expect(solution!.get('1,2')).toBe(2)
    expect(solution!.get('2,1')).toBe(3)
    expect(solution!.get('2,2')).toBe(4)
  })

  it('returns null for an unsatisfiable clue set', () => {
    const { runs } = buildKnownPuzzle()
    // Corrupt one run's sum to a value no 2-digit combo can satisfy.
    const corrupted = runs.map((r) => (r.direction === 'across' && r.cells[0].row === 1 ? { ...r, sum: 100 } : r))
    expect(solveFromClues(corrupted, 4)).toBeNull()
  })
})

describe('countSolutionsUpTo', () => {
  it('reports exactly one confirmed solution for the known unique puzzle', () => {
    const { runs } = buildKnownPuzzle()
    expect(countSolutionsUpTo(runs, 4, 2)).toEqual({ count: 1, confirmed: true })
  })
})
