import { BOARD_SIZE, Board, Cell, CellCoord, Run, WallCell, WhiteCell, isWhite } from './types'

export function createWallCell(): WallCell {
  return { kind: 'wall' }
}

export function createWhiteCell(solution = 0): WhiteCell {
  return { kind: 'white', solution, userDigit: null, pencilMarks: [], state: 'default' }
}

/** All-walls board. Used as the starting canvas for the board editor. */
export function createEmptyWallBoard(size: number = BOARD_SIZE): Board {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => createWallCell()))
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((cell): Cell =>
      cell.kind === 'wall'
        ? { ...cell }
        : { ...cell, pencilMarks: [...cell.pencilMarks] }
    )
  )
}

export function getCell(board: Board, coord: CellCoord): Cell {
  return board[coord.row][coord.col]
}

/**
 * Returns a new board with only the cell at `coord` replaced (via `updater`); every other row
 * array and cell object keeps its original reference. This lets components subscribe to a single
 * cell (`store(s => s.puzzle.board[r][c])`) and only re-render when that exact cell changes,
 * instead of the whole 10x10 grid re-rendering on every keystroke.
 */
export function withCellUpdate<T extends Cell>(board: Board, coord: CellCoord, updater: (cell: T) => T): Board {
  const newRow = [...board[coord.row]]
  newRow[coord.col] = updater(newRow[coord.col] as T)
  const newBoard = [...board]
  newBoard[coord.row] = newRow
  return newBoard
}

/**
 * Scans the board for every maximal contiguous run of white cells, in both directions.
 * Runs are derived (never stored) so the board layout is always the single source of truth.
 * Length-1 runs are included so callers (editor validation, generator repair) can detect and reject them.
 */
export function deriveRuns(board: Board): Run[] {
  const size = board.length
  const runs: Run[] = []

  // Horizontal (across) runs
  for (let row = 0; row < size; row++) {
    let cells: CellCoord[] = []
    for (let col = 0; col <= size; col++) {
      const cell = col < size ? board[row][col] : undefined
      if (cell && isWhite(cell)) {
        cells.push({ row, col })
      } else {
        if (cells.length > 0) {
          runs.push(makeRun('across', board, cells))
        }
        cells = []
      }
    }
  }

  // Vertical (down) runs
  for (let col = 0; col < size; col++) {
    let cells: CellCoord[] = []
    for (let row = 0; row <= size; row++) {
      const cell = row < size ? board[row][col] : undefined
      if (cell && isWhite(cell)) {
        cells.push({ row, col })
      } else {
        if (cells.length > 0) {
          runs.push(makeRun('down', board, cells))
        }
        cells = []
      }
    }
  }

  return runs
}

function makeRun(direction: 'across' | 'down', board: Board, cells: CellCoord[]): Run {
  const sum = cells.reduce((total, coord) => {
    const cell = board[coord.row][coord.col]
    return total + (isWhite(cell) ? cell.solution : 0)
  }, 0)
  const first = cells[0]
  return {
    id: `${direction}-${first.row}-${first.col}`,
    direction,
    sum,
    cells
  }
}

/**
 * Same scan as `deriveRuns`, but for boards where the solution isn't known yet — `run.sum` comes
 * from the clue value already typed onto the preceding wall cell (0 if not entered yet) instead of
 * summing white-cell solutions. Used by the board editor's manual clue-entry stage, where the user
 * supplies the sums directly and a solution is derived (or rejected) from them afterwards.
 */
export function deriveRunsFromWallClues(board: Board): Run[] {
  const size = board.length
  const runs: Run[] = []

  for (let row = 0; row < size; row++) {
    let cells: CellCoord[] = []
    for (let col = 0; col <= size; col++) {
      const cell = col < size ? board[row][col] : undefined
      if (cell && isWhite(cell)) {
        cells.push({ row, col })
      } else {
        if (cells.length > 0) runs.push(makeClueRun('across', board, cells))
        cells = []
      }
    }
  }

  for (let col = 0; col < size; col++) {
    let cells: CellCoord[] = []
    for (let row = 0; row <= size; row++) {
      const cell = row < size ? board[row][col] : undefined
      if (cell && isWhite(cell)) {
        cells.push({ row, col })
      } else {
        if (cells.length > 0) runs.push(makeClueRun('down', board, cells))
        cells = []
      }
    }
  }

  return runs
}

function makeClueRun(direction: 'across' | 'down', board: Board, cells: CellCoord[]): Run {
  const first = cells[0]
  const wallCell = direction === 'across' ? board[first.row][first.col - 1] : board[first.row - 1][first.col]
  const sum = (wallCell.kind === 'wall' ? (direction === 'across' ? wallCell.rightSum : wallCell.downSum) : undefined) ?? 0
  return {
    id: `${direction}-${first.row}-${first.col}`,
    direction,
    sum,
    cells
  }
}

/** Runs with length outside [2,9] are invalid Kakuro runs (can't hold non-repeating 1-9 digits). */
export function invalidRuns(runs: Run[]): Run[] {
  return runs.filter((run) => run.cells.length < 2 || run.cells.length > 9)
}

/** Writes each run's clue sum onto the wall cell immediately preceding it (row 0 / col 0 are always walls). */
export function stampClueSums(board: Board, runs: Run[]): void {
  for (const run of runs) {
    const first = run.cells[0]
    if (run.direction === 'across') {
      const wallCell = board[first.row][first.col - 1]
      if (wallCell.kind === 'wall') wallCell.rightSum = run.sum
    } else {
      const wallCell = board[first.row - 1][first.col]
      if (wallCell.kind === 'wall') wallCell.downSum = run.sum
    }
  }
}

export function forEachWhiteCell(board: Board, fn: (cell: WhiteCell, coord: CellCoord) => void): void {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col]
      if (isWhite(cell)) fn(cell, { row, col })
    }
  }
}
