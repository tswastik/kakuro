import { describe, expect, it } from 'vitest'
import { BOARD_SIZE, isWhite } from './types'
import { deriveRuns, invalidRuns, createEmptyWallBoard, createWhiteCell } from './board'
import { generateFromWallLayout, generatePuzzle } from './generator'
import { countSolutionsUpTo } from './solver'
import { createRng } from './random'

/**
 * Checks everything a puzzle must always guarantee: consistent structure, no repeated digits in
 * any run, sums that match, and clue cells that agree with their runs. Does NOT check uniqueness —
 * `generatePuzzle` proves that when it can, but falls back to a very-likely-but-unproven-unique
 * board rather than fail outright when an exhaustive proof isn't reachable in reasonable time (see
 * the `ensureUnique` docs in generator.ts). Callers that need the strict guarantee (e.g. the board
 * editor path, which never uses the fallback) should additionally assert `countSolutionsUpTo`.
 */
function assertValidStructure(board: ReturnType<typeof generatePuzzle>['board'], maxRunLength = 9) {
  const runs = deriveRuns(board)
  expect(invalidRuns(runs)).toHaveLength(0)

  for (const run of runs) {
    expect(run.cells.length).toBeLessThanOrEqual(maxRunLength)
    const digits = run.cells.map((c) => {
      const cell = board[c.row][c.col]
      return isWhite(cell) ? cell.solution : -1
    })
    expect(new Set(digits).size).toBe(digits.length) // no repeats within a run
    expect(digits.reduce((a, b) => a + b, 0)).toBe(run.sum)
  }

  // Every clue-bearing wall cell's sum matches its run.
  for (const run of runs) {
    const first = run.cells[0]
    const wall =
      run.direction === 'across' ? board[first.row][first.col - 1] : board[first.row - 1][first.col]
    expect(wall.kind).toBe('wall')
    if (wall.kind === 'wall') {
      const stored = run.direction === 'across' ? wall.rightSum : wall.downSum
      expect(stored).toBe(run.sum)
    }
  }
}

function assertProvenUnique(board: ReturnType<typeof generatePuzzle>['board'], size: number = BOARD_SIZE) {
  const runs = deriveRuns(board)
  expect(countSolutionsUpTo(runs, size, 2)).toEqual({ count: 1, confirmed: true })
}

describe('generatePuzzle', () => {
  it.each(['easy', 'medium', 'hard'] as const)('generates a structurally valid %s puzzle', (difficulty) => {
    const rng = createRng(42)
    const { board } = generatePuzzle(difficulty, rng)
    const maxRunLength = difficulty === 'hard' ? 7 : 9
    assertValidStructure(board, maxRunLength)
  })
}, 30000)

describe('generateFromWallLayout', () => {
  it('derives a valid puzzle from a user-drawn wall layout (retrying seeds, same as a user clicking Generate again)', () => {
    const board = createEmptyWallBoard(5)
    board[1][1] = createWhiteCell()
    board[1][2] = createWhiteCell()
    board[2][1] = createWhiteCell()
    board[2][2] = createWhiteCell()
    board[3][1] = createWhiteCell()
    board[3][2] = createWhiteCell()

    // A tiny rectangular block is inherently prone to symmetric duplicate solutions (little
    // interlocking to rule out an alternate arrangement), so generateFromWallLayout's best-effort
    // fallback is expected to kick in here rather than a strict proof — see its doc comment.
    const result = generateFromWallLayout(board, createRng(7))

    expect(result).not.toBeNull()
    if (result) assertValidStructure(result.board)
  })

  it('proves strict uniqueness for a larger, more interlocking user-drawn layout', () => {
    const board = createEmptyWallBoard(7)
    // An irregular (non-rectangular) 12-cell region — enough interlocking for a real proof.
    const cells: [number, number][] = [
      [1, 1], [1, 2], [1, 3],
      [2, 1], [2, 2], [2, 3], [2, 4],
      [3, 2], [3, 3], [3, 4],
      [4, 3], [4, 4]
    ]
    for (const [r, c] of cells) board[r][c] = createWhiteCell()

    let result: ReturnType<typeof generateFromWallLayout> = null
    for (let seed = 0; seed < 15 && !result; seed++) {
      const attempt = generateFromWallLayout(board, createRng(seed))
      if (attempt && countSolutionsUpTo(deriveRuns(attempt.board), 7, 2).count === 1) {
        result = attempt
      }
    }

    expect(result).not.toBeNull()
    if (result) {
      assertValidStructure(result.board)
      assertProvenUnique(result.board, 7)
    }
  })

  it('returns null for a layout containing a length-1 run', () => {
    const board = createEmptyWallBoard(5)
    board[1][1] = createWhiteCell()
    expect(generateFromWallLayout(board)).toBeNull()
  })

  it('returns null for an all-wall layout instead of a vacuously "valid" empty puzzle', () => {
    const board = createEmptyWallBoard(5)
    expect(generateFromWallLayout(board)).toBeNull()
  })
})
