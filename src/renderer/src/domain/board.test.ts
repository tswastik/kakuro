import { describe, expect, it } from 'vitest'
import { createEmptyWallBoard, createWhiteCell, deriveRuns, invalidRuns, stampClueSums } from './board'

function buildSampleBoard() {
  const board = createEmptyWallBoard(4)
  board[1][1] = createWhiteCell(1)
  board[1][2] = createWhiteCell(2)
  board[2][1] = createWhiteCell(3)
  board[2][2] = createWhiteCell(4)
  return board
}

describe('deriveRuns', () => {
  it('finds the across and down runs of a 2x2 white block', () => {
    const board = buildSampleBoard()
    const runs = deriveRuns(board)

    const across = runs.filter((r) => r.direction === 'across')
    const down = runs.filter((r) => r.direction === 'down')

    expect(across).toHaveLength(2)
    expect(down).toHaveLength(2)
    expect(invalidRuns(runs)).toHaveLength(0)

    const row1Run = across.find((r) => r.cells[0].row === 1)!
    expect(row1Run.sum).toBe(3) // 1 + 2
    const col1Run = down.find((r) => r.cells[0].col === 1)!
    expect(col1Run.sum).toBe(4) // 1 + 3
  })

  it('flags a lone white cell as an invalid length-1 run', () => {
    const board = createEmptyWallBoard(4)
    board[1][1] = createWhiteCell(5)
    const runs = deriveRuns(board)
    expect(invalidRuns(runs).length).toBeGreaterThan(0)
  })
})

describe('stampClueSums', () => {
  it('writes each run sum onto the wall cell preceding it', () => {
    const board = buildSampleBoard()
    const runs = deriveRuns(board)
    stampClueSums(board, runs)

    expect(board[1][0]).toMatchObject({ kind: 'wall', rightSum: 3 })
    expect(board[2][0]).toMatchObject({ kind: 'wall', rightSum: 7 })
    expect(board[0][1]).toMatchObject({ kind: 'wall', downSum: 4 })
    expect(board[0][2]).toMatchObject({ kind: 'wall', downSum: 6 })
  })
})
