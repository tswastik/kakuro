import { Board, isWhite } from './types'

/** Flags every filled-but-wrong cell red; leaves empty and correct cells untouched (no hints). */
export function checkBoard(board: Board): void {
  for (const row of board) {
    for (const cell of row) {
      if (!isWhite(cell)) continue
      if (cell.userDigit === null) {
        cell.state = 'default'
        continue
      }
      cell.state = cell.userDigit === cell.solution ? 'default' : 'incorrect'
    }
  }
}

/** True only when every white cell is filled and matches the solution. */
export function isBoardSolved(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (isWhite(cell) && cell.userDigit !== cell.solution) return false
    }
  }
  return true
}
