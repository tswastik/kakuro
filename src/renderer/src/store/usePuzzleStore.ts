import { create } from 'zustand'
import { CellCoord, Difficulty, Puzzle, isWhite } from '@domain/types'
import { cloneBoard, withCellUpdate } from '@domain/board'
import { generatePuzzle, toPuzzle } from '@domain/generator'
import { checkBoard as runCheck, isBoardSolved } from '@domain/validator'
import { createRng } from '@domain/random'
import { useTimerStore } from './useTimerStore'

interface PuzzleState {
  puzzle: Puzzle | null
  selectedCell: CellCoord | null
  solved: boolean

  newPuzzle: (difficulty: Exclude<Difficulty, 'custom'>) => void
  loadPuzzle: (puzzle: Puzzle) => void
  selectCell: (coord: CellCoord) => void
  moveSelection: (dRow: number, dCol: number) => void
  setDigit: (digit: number, asPencil: boolean) => void
  clearSelectedCell: () => void
  checkBoard: () => void
  solveBoard: () => void
}

function firstWhiteCell(puzzle: Puzzle): CellCoord | null {
  for (let row = 0; row < puzzle.board.length; row++) {
    for (let col = 0; col < puzzle.board[row].length; col++) {
      if (isWhite(puzzle.board[row][col])) return { row, col }
    }
  }
  return null
}

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  puzzle: null,
  selectedCell: null,
  solved: false,

  newPuzzle: (difficulty) => {
    const generated = generatePuzzle(difficulty, createRng())
    const puzzle = toPuzzle(generated, difficulty)
    set({ puzzle, selectedCell: firstWhiteCell(puzzle), solved: false })
    useTimerStore.getState().reset()
    useTimerStore.getState().resume()
  },

  loadPuzzle: (puzzle) => {
    set({ puzzle, selectedCell: firstWhiteCell(puzzle), solved: false })
    useTimerStore.getState().reset()
    useTimerStore.getState().resume()
  },

  selectCell: (coord) => {
    const { puzzle } = get()
    if (!puzzle) return
    const cell = puzzle.board[coord.row]?.[coord.col]
    if (!cell || !isWhite(cell)) return
    set({ selectedCell: coord })
  },

  moveSelection: (dRow, dCol) => {
    const { puzzle, selectedCell } = get()
    if (!puzzle || !selectedCell) return
    const size = puzzle.board.length
    let row = selectedCell.row
    let col = selectedCell.col

    for (let step = 0; step < size; step++) {
      row += dRow
      col += dCol
      if (row < 0 || row >= size || col < 0 || col >= size) return
      if (isWhite(puzzle.board[row][col])) {
        set({ selectedCell: { row, col } })
        return
      }
    }
  },

  setDigit: (digit, asPencil) => {
    const { puzzle, selectedCell } = get()
    if (!puzzle || !selectedCell || useTimerStore.getState().paused) return
    const cell = puzzle.board[selectedCell.row][selectedCell.col]
    if (!isWhite(cell)) return

    const board = withCellUpdate(puzzle.board, selectedCell, (c) => {
      if (c.kind !== 'white') return c
      if (asPencil) {
        const has = c.pencilMarks.includes(digit)
        const pencilMarks = has ? c.pencilMarks.filter((d) => d !== digit) : [...c.pencilMarks, digit].sort()
        return { ...c, pencilMarks, state: 'default' }
      }
      return { ...c, userDigit: c.userDigit === digit ? null : digit, state: 'default' }
    })

    const updatedPuzzle = { ...puzzle, board }
    const solved = isBoardSolved(board)
    set({ puzzle: updatedPuzzle, solved })
    if (solved) useTimerStore.getState().stop()
  },

  clearSelectedCell: () => {
    const { puzzle, selectedCell } = get()
    if (!puzzle || !selectedCell || useTimerStore.getState().paused) return
    const board = withCellUpdate(puzzle.board, selectedCell, (c) => {
      if (c.kind !== 'white') return c
      return { ...c, userDigit: null, pencilMarks: [], state: 'default' }
    })
    set({ puzzle: { ...puzzle, board }, solved: false })
  },

  checkBoard: () => {
    const { puzzle } = get()
    if (!puzzle) return
    const board = cloneBoard(puzzle.board)
    runCheck(board)
    set({ puzzle: { ...puzzle, board } })
  },

  solveBoard: () => {
    const { puzzle } = get()
    if (!puzzle) return
    const board = cloneBoard(puzzle.board)
    for (const row of board) {
      for (const cell of row) {
        if (cell.kind === 'white') {
          cell.userDigit = cell.solution
          cell.state = 'default'
          cell.pencilMarks = []
        }
      }
    }
    set({ puzzle: { ...puzzle, board }, solved: true })
    useTimerStore.getState().stop()
  }
}))
