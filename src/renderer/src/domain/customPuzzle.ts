import { Board } from './types'
import { cloneBoard, deriveRunsFromWallClues, forEachWhiteCell, invalidRuns } from './board'
import { countSolutionsUpTo, solveFromClues } from './solver'

export type ClueValidationResult =
  | { status: 'invalid-structure' }
  | { status: 'incomplete'; missingCount: number }
  | { status: 'unsolvable' }
  | { status: 'ambiguous'; solutionCount: number }
  | { status: 'unique'; solution: Map<string, number> }

/**
 * Validates a board whose wall cells carry user-typed clue sums (not yet a known solution).
 * A sum of 0 is the sentinel for "not entered yet" — a real Kakuro sum is always >= 3 for any
 * run length >= 2, so it can never collide with a legitimately entered value.
 */
export function validateClues(board: Board, size: number): ClueValidationResult {
  const runs = deriveRunsFromWallClues(board)
  if (invalidRuns(runs).length > 0) return { status: 'invalid-structure' }

  const missingCount = runs.filter((r) => r.sum <= 0).length
  if (missingCount > 0) return { status: 'incomplete', missingCount }

  const uniqueness = countSolutionsUpTo(runs, size, 2)
  if (!uniqueness.confirmed || uniqueness.count === 0) return { status: 'unsolvable' }
  if (uniqueness.count >= 2) return { status: 'ambiguous', solutionCount: uniqueness.count }

  const solution = solveFromClues(runs, size)
  if (!solution) return { status: 'unsolvable' }
  return { status: 'unique', solution }
}

/** Writes a solved digit map (from `validateClues`) onto the board's white cells. */
export function applySolutionToBoard(board: Board, solution: Map<string, number>): Board {
  const result = cloneBoard(board)
  forEachWhiteCell(result, (cell, coord) => {
    cell.solution = solution.get(`${coord.row},${coord.col}`) ?? 0
  })
  return result
}
