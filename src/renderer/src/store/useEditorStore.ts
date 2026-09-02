import { create } from 'zustand'
import { Board, BOARD_SIZE, CellCoord, Puzzle } from '@domain/types'
import { createEmptyWallBoard, createWhiteCell, deriveRuns, deriveRunsFromWallClues, invalidRuns } from '@domain/board'
import { toPuzzle } from '@domain/generator'
import { solveFromClues } from '@domain/solver'
import { ClueValidationResult, applySolutionToBoard, validateClues } from '@domain/customPuzzle'
import { SavedTemplate, saveTemplate as persistTemplate } from '@domain/templateStorage'
import { isTemplateParseError, parseTemplateFile, templateFileToBoard } from '@domain/templateFile'
import { usePuzzleStore } from './usePuzzleStore'
import { useUiStore } from './useUiStore'

export type EditorStage = 'design' | 'clues' | 'ready'

interface EditorState {
  stage: EditorStage
  board: Board
  invalidRunCount: number
  clueValidation: ClueValidationResult | null
  savedTemplateName: string | null
  /** True only if the current "ready" board was independently proven to have exactly one solution — false if the user accepted an ambiguous board via "Use Anyway". Used to keep the Ready-stage messaging honest. */
  readyProven: boolean

  toggleCell: (coord: CellCoord) => void
  resetBoard: () => void
  goToClueStage: () => void
  backToDesign: () => void
  setClueValue: (coord: CellCoord, direction: 'right' | 'down', value: number | null) => void
  validate: () => void
  proceedToReady: () => void
  useAmbiguousAnyway: () => void
  backToClues: () => void
  saveTemplate: (name: string) => SavedTemplate
  loadTemplate: (template: SavedTemplate) => void
  importFromFile: (jsonText: string) => { ok: true; message: string } | { ok: false; error: string }
  playNow: () => void
}

function countInvalidRuns(board: Board): number {
  return invalidRuns(deriveRuns(board)).length
}

function freshState(): Pick<
  EditorState,
  'stage' | 'board' | 'invalidRunCount' | 'clueValidation' | 'savedTemplateName' | 'readyProven'
> {
  return {
    stage: 'design',
    board: createEmptyWallBoard(BOARD_SIZE),
    invalidRunCount: 0,
    clueValidation: null,
    savedTemplateName: null,
    readyProven: false
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...freshState(),

  toggleCell: (coord) => {
    if (get().stage !== 'design') return
    if (coord.row === 0 || coord.col === 0) return

    const board = get().board.map((row) => [...row])
    const current = board[coord.row][coord.col]
    board[coord.row][coord.col] = current.kind === 'wall' ? createWhiteCell() : { kind: 'wall' }
    set({ board, invalidRunCount: countInvalidRuns(board) })
  },

  resetBoard: () => set(freshState()),

  goToClueStage: () => {
    const { board, invalidRunCount } = get()
    if (invalidRunCount > 0) return
    if (deriveRuns(board).length === 0) return
    set({ stage: 'clues', clueValidation: null })
  },

  backToDesign: () => set({ stage: 'design', clueValidation: null }),

  setClueValue: (coord, direction, value) => {
    if (get().stage !== 'clues') return
    const board = get().board.map((row) => [...row])
    const cell = board[coord.row][coord.col]
    if (cell.kind !== 'wall') return
    const updated = { ...cell }
    if (direction === 'right') updated.rightSum = value ?? undefined
    else updated.downSum = value ?? undefined
    board[coord.row][coord.col] = updated
    set({ board, clueValidation: null })
  },

  validate: () => {
    const result = validateClues(get().board, BOARD_SIZE)
    set({ clueValidation: result })
  },

  proceedToReady: () => {
    const { clueValidation, board } = get()
    if (!clueValidation || clueValidation.status !== 'unique') return
    const solvedBoard = applySolutionToBoard(board, clueValidation.solution)
    set({ board: solvedBoard, stage: 'ready', readyProven: true })
  },

  useAmbiguousAnyway: () => {
    const { clueValidation, board } = get()
    if (!clueValidation || clueValidation.status !== 'ambiguous') return
    // Re-solve to get a concrete (arbitrary but consistent) solution to play against.
    const runs = deriveRunsFromWallClues(board)
    const solution = solveFromClues(runs, BOARD_SIZE)
    if (!solution) return
    const solvedBoard = applySolutionToBoard(board, solution)
    set({ board: solvedBoard, stage: 'ready', readyProven: false })
  },

  backToClues: () => set({ stage: 'clues', clueValidation: null }),

  saveTemplate: (name) => {
    const { board, readyProven } = get()
    const template = persistTemplate(name, board, BOARD_SIZE, readyProven)
    set({ savedTemplateName: template.name })
    return template
  },

  loadTemplate: (template) => {
    set({
      stage: 'ready',
      board: template.board,
      invalidRunCount: 0,
      clueValidation: null,
      savedTemplateName: template.name,
      readyProven: template.proven
    })
  },

  importFromFile: (jsonText) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return { ok: false, error: 'That file is not valid JSON.' }
    }

    const file = parseTemplateFile(parsed)
    if (isTemplateParseError(file)) return { ok: false, error: file.error }
    if (file.size !== BOARD_SIZE) {
      return { ok: false, error: `This app only supports ${BOARD_SIZE}x${BOARD_SIZE} boards — the file has size ${file.size}.` }
    }

    const board = templateFileToBoard(file)
    const invalidCount = countInvalidRuns(board)
    if (invalidCount > 0) {
      return { ok: false, error: `This layout has ${invalidCount} run(s) shorter than 2 cells — it can't be a valid Kakuro board.` }
    }

    const validation = validateClues(board, BOARD_SIZE)
    if (validation.status === 'unique') {
      const solved = applySolutionToBoard(board, validation.solution)
      set({ stage: 'ready', board: solved, invalidRunCount: 0, clueValidation: null, savedTemplateName: null, readyProven: true })
      return { ok: true, message: `Imported "${file.name}" — ready to play.` }
    }

    // Incomplete, unsolvable, or ambiguous clues — drop into the Clues stage so the existing
    // validation UI can guide the user through fixing it, same as if they'd typed it by hand.
    set({ stage: 'clues', board, invalidRunCount: 0, clueValidation: validation, savedTemplateName: null, readyProven: false })
    return { ok: true, message: `Imported "${file.name}" — check its clues before continuing.` }
  },

  playNow: () => {
    const { board } = get()
    const puzzle: Puzzle = toPuzzle({ board, runs: deriveRuns(board) }, 'custom')
    usePuzzleStore.getState().loadPuzzle(puzzle)
    useUiStore.getState().goTo('board')
  }
}))
