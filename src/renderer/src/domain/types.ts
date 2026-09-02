export const BOARD_SIZE = 10

export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom'

export interface WallCell {
  kind: 'wall'
  rightSum?: number
  downSum?: number
}

export type CellCheckState = 'default' | 'incorrect'

export interface WhiteCell {
  kind: 'white'
  solution: number
  userDigit: number | null
  pencilMarks: number[]
  state: CellCheckState
}

export type Cell = WallCell | WhiteCell

export type Board = Cell[][]

export interface CellCoord {
  row: number
  col: number
}

export interface Run {
  id: string
  direction: 'across' | 'down'
  sum: number
  cells: CellCoord[]
}

export interface Puzzle {
  id: string
  size: typeof BOARD_SIZE
  board: Board
  runs: Run[]
  difficulty: Difficulty
}

export function isWhite(cell: Cell): cell is WhiteCell {
  return cell.kind === 'white'
}

export function isWall(cell: Cell): cell is WallCell {
  return cell.kind === 'wall'
}
