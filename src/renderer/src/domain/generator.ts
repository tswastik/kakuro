import { BOARD_SIZE, Board, CellCoord, Difficulty, Puzzle, Run, isWhite } from './types'
import {
  cloneBoard,
  createEmptyWallBoard,
  createWhiteCell,
  deriveRuns,
  forEachWhiteCell,
  invalidRuns,
  stampClueSums
} from './board'
import { findDistinctSolutions, logicalFillRatio, unresolvedCellCoords } from './solver'
import { Rng, createRng, shuffle } from './random'

interface DifficultyParams {
  interiorWallRange: [number, number]
  maxRunLength: number
  logicalFillBand: [number, number]
}

// Higher wall density than a real hand-designed Kakuro would need — with only run-level (not
// row/column-wide) constraints, a procedurally random layout needs to be considerably more
// constrained than a hand-crafted one to be practically and quickly provable as unique.
const DIFFICULTY_PARAMS: Record<Exclude<Difficulty, 'custom'>, DifficultyParams> = {
  easy: { interiorWallRange: [11, 15], maxRunLength: 9, logicalFillBand: [0.85, 1.01] },
  medium: { interiorWallRange: [17, 21], maxRunLength: 9, logicalFillBand: [0.5, 0.85] },
  hard: { interiorWallRange: [23, 27], maxRunLength: 7, logicalFillBand: [0, 0.5] }
}

const CUSTOM_LAYOUT_FILL_ATTEMPTS = 40

/** Builds a fresh 10x10 wall/white layout: row 0 and column 0 are always walls (so every run has a clue-holding cell before it). */
function buildWallLayout(size: number, maxRunLength: number, interiorWallTarget: number, rng: Rng): Board {
  const board = createEmptyWallBoard(size)
  for (let row = 1; row < size; row++) {
    for (let col = 1; col < size; col++) {
      board[row][col] = createWhiteCell()
    }
  }

  capOverlongRuns(board, maxRunLength, rng)
  addRandomInteriorWalls(board, interiorWallTarget, maxRunLength, rng)

  return board
}

function capOverlongRuns(board: Board, maxRunLength: number, rng: Rng): void {
  let guard = 0
  while (guard++ < 300) {
    const runs = deriveRuns(board)
    const overlong = runs.filter((r) => r.cells.length > maxRunLength)
    if (overlong.length === 0) return
    const target = overlong[Math.floor(rng() * overlong.length)]
    splitRunWithWall(board, target, rng)
  }
}

/**
 * Converts one cell inside `run` into a wall, splitting it into two runs each of length >= 2.
 * Turning a cell into a wall consumes it (it's no longer playable), so the two resulting pieces'
 * lengths sum to `length - 1`, not `length` — a split is only possible when `length >= 5`.
 * The candidate cell also sits in a perpendicular run (across vs down), so every candidate is
 * verified against the *whole* board before committing, in case it would also chop that
 * perpendicular run down to an invalid length-1 sliver.
 */
function splitRunWithWall(board: Board, run: Run, rng: Rng): boolean {
  const length = run.cells.length
  // Wall lands at local index k+1: left piece = cells[0..k] (size k+1), right piece = cells[k+2..end] (size length-k-2).
  const minK = 1
  const maxK = length - 4
  if (maxK < minK) return false

  const candidateKs = shuffle(
    Array.from({ length: maxK - minK + 1 }, (_, i) => minK + i),
    rng
  )

  for (const k of candidateKs) {
    const wallCoord = run.cells[k + 1]
    const original = board[wallCoord.row][wallCoord.col]
    board[wallCoord.row][wallCoord.col] = { kind: 'wall' }
    if (invalidRuns(deriveRuns(board)).length === 0) return true
    board[wallCoord.row][wallCoord.col] = original
  }
  return false
}

function addRandomInteriorWalls(board: Board, targetCount: number, maxRunLength: number, rng: Rng): void {
  const size = board.length
  const candidates: CellCoord[] = []
  for (let row = 1; row < size; row++) {
    for (let col = 1; col < size; col++) {
      candidates.push({ row, col })
    }
  }
  const order = shuffle(candidates, rng)

  let placed = countWalls(board) - (size * 2 - 1) // interior walls only
  for (const coord of order) {
    if (placed >= targetCount) break
    const cell = board[coord.row][coord.col]
    if (cell.kind !== 'white') continue

    const original = board[coord.row][coord.col]
    board[coord.row][coord.col] = { kind: 'wall' }
    const runs = deriveRuns(board)
    const ok = invalidRuns(runs).length === 0 && runs.every((r) => r.cells.length <= maxRunLength)

    if (ok) {
      placed++
    } else {
      board[coord.row][coord.col] = original
    }
  }
}

function countWalls(board: Board): number {
  let count = 0
  for (const row of board) for (const cell of row) if (cell.kind === 'wall') count++
  return count
}

/** Fills every white cell with a 1-9 digit so no run repeats a digit, via randomized backtracking. */
function fillDigits(board: Board, runs: Run[], rng: Rng): boolean {
  const membership = new Map<string, { across?: Run; down?: Run }>()
  for (const run of runs) {
    for (const coord of run.cells) {
      const key = `${coord.row},${coord.col}`
      const entry = membership.get(key) ?? {}
      if (run.direction === 'across') entry.across = run
      else entry.down = run
      membership.set(key, entry)
    }
  }

  const whiteCoords: CellCoord[] = []
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (isWhite(board[row][col])) whiteCoords.push({ row, col })
    }
  }

  const usedByRun = new Map<string, Set<number>>()
  for (const run of runs) usedByRun.set(run.id, new Set())

  const FILL_STEP_BUDGET = 200_000
  let stepsRemaining = FILL_STEP_BUDGET

  function backtrack(index: number): boolean {
    if (stepsRemaining-- <= 0) return false
    if (index === whiteCoords.length) return true
    const coord = whiteCoords[index]
    const key = `${coord.row},${coord.col}`
    const { across, down } = membership.get(key)!
    const usedAcross = usedByRun.get(across!.id)!
    const usedDown = usedByRun.get(down!.id)!

    const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng).filter(
      (d) => !usedAcross.has(d) && !usedDown.has(d)
    )

    for (const digit of candidates) {
      const cell = board[coord.row][coord.col]
      if (cell.kind !== 'white') continue
      cell.solution = digit
      usedAcross.add(digit)
      usedDown.add(digit)

      if (backtrack(index + 1)) return true

      usedAcross.delete(digit)
      usedDown.delete(digit)
      cell.solution = 0
    }

    return false
  }

  return backtrack(0)
}

function bandDistance(ratio: number, band: [number, number]): number {
  if (ratio < band[0]) return band[0] - ratio
  if (ratio > band[1]) return ratio - band[1]
  return 0
}

export interface GeneratedPuzzle {
  board: Board
  runs: Run[]
}

const CHEAP_CANDIDATE_ATTEMPTS = 30
const MAX_UNIQUENESS_CHECKS = 10

interface Candidate {
  board: Board
  runs: Run[]
  distance: number
}

function allWhiteCoords(board: Board): CellCoord[] {
  const coords: CellCoord[] = []
  forEachWhiteCell(board, (_cell, coord) => coords.push(coord))
  return coords
}

/** For each white cell, the length of the longer of its across/down run — a proxy for how loosely constrained it is. */
function longestRunLengthByCell(runs: Run[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const run of runs) {
    for (const coord of run.cells) {
      const key = `${coord.row},${coord.col}`
      map.set(key, Math.max(map.get(key) ?? 0, run.cells.length))
    }
  }
  return map
}

const UNIQUENESS_NODE_BUDGET = 60_000
const MAX_OUTER_ROUNDS = 15
const MAX_PROPAGATION_REPAIRS_PER_ROUND = 30

function wallOffFirstSafe(board: Board, priority: CellCoord[]): { board: Board; runs: Run[] } | null {
  for (const coord of priority) {
    const trialBoard = cloneBoard(board)
    trialBoard[coord.row][coord.col] = { kind: 'wall' }
    const trialRuns = deriveRuns(trialBoard)
    if (invalidRuns(trialRuns).length === 0) {
      return { board: trialBoard, runs: trialRuns }
    }
  }
  return null
}

function byLooseness(coords: CellCoord[], runs: Run[], rng: Rng): CellCoord[] {
  const lengthByCell = longestRunLengthByCell(runs)
  return shuffle(coords, rng).sort(
    (a, b) => (lengthByCell.get(`${b.row},${b.col}`) ?? 0) - (lengthByCell.get(`${a.row},${a.col}`) ?? 0)
  )
}

interface UniquenessAttempt {
  puzzle: GeneratedPuzzle
  /** True only if a full search proved exactly one solution. False means this is a best-effort
   *  fallback — the last state reached before the repair loop ran out of moves or rounds — which
   *  is very likely but not certain to be unique. */
  proven: boolean
  /** How many candidate solutions the last search found (0 or 1 typically means very close to proven). */
  lastSolutionCount: number
}

/**
 * Proving uniqueness by exhaustive search is sound but expensive — cheap propagation alone
 * (`unresolvedCellCoords`) is fast but incomplete (it can stall well short of proving anything).
 * This combines them: repeatedly do fast, free propagation-based tightening (shortening the
 * loosest runs first) until it can't make further progress for free, then pay for exactly one
 * authoritative search to check where things really stand — either confirming uniqueness outright,
 * or (if genuinely still ambiguous) revealing real differing cells to target the next round of
 * cheap tightening with. This keeps the expensive search rare while still being a complete proof.
 * If it still can't reach a proof within the round budget, the caller (`generatePuzzle`) falls
 * back to the closest attempt across candidates rather than fail outright — see its comment.
 */
function ensureUnique(board: Board, runs: Run[], rng: Rng): UniquenessAttempt {
  let currentBoard = board
  let currentRuns = runs
  let lastSolutionCount = Infinity

  for (let round = 0; round < MAX_OUTER_ROUNDS; round++) {
    for (let i = 0; i < MAX_PROPAGATION_REPAIRS_PER_ROUND; i++) {
      const unresolved = unresolvedCellCoords(currentRuns, BOARD_SIZE)
      if (unresolved.length === 0) break
      const priority = byLooseness(unresolved, currentRuns, rng)
      const repaired = wallOffFirstSafe(currentBoard, priority)
      if (!repaired) break
      currentBoard = repaired.board
      currentRuns = repaired.runs
    }

    const result = findDistinctSolutions(currentRuns, BOARD_SIZE, 2, UNIQUENESS_NODE_BUDGET)
    if (result.confirmed) lastSolutionCount = result.solutions.length
    if (result.confirmed && result.solutions.length <= 1) {
      return { puzzle: { board: currentBoard, runs: currentRuns }, proven: true, lastSolutionCount: 1 }
    }
    if (!result.confirmed) break

    const [solutionA, solutionB] = result.solutions
    const differingCoords = [...solutionA.keys()]
      .filter((key) => solutionA.get(key) !== solutionB.get(key))
      .map((key) => {
        const [row, col] = key.split(',').map(Number)
        return { row, col }
      })

    const priority = [
      ...byLooseness(differingCoords, currentRuns, rng),
      ...byLooseness(allWhiteCoords(currentBoard), currentRuns, rng)
    ]
    const repaired = wallOffFirstSafe(currentBoard, priority)
    if (!repaired) break
    currentBoard = repaired.board
    currentRuns = repaired.runs
  }

  return { puzzle: { board: currentBoard, runs: currentRuns }, proven: false, lastSolutionCount }
}

/**
 * Generates a puzzle for the given difficulty in two phases so the expensive uniqueness search
 * (backtracking to prove no second solution exists) only ever runs a handful of times:
 *
 *  1. Cheap phase: generate several wall-layout + digit-fill candidates and score each with
 *     `logicalFillRatio` (a single propagation pass, no backtracking) against the difficulty's band.
 *  2. Verify phase: starting with the best-scoring candidate, run the real uniqueness check until
 *     one passes.
 */
export function generatePuzzle(difficulty: Exclude<Difficulty, 'custom'>, rng: Rng = createRng()): GeneratedPuzzle {
  const params = DIFFICULTY_PARAMS[difficulty]
  const candidates: Candidate[] = []

  for (let attempt = 0; attempt < CHEAP_CANDIDATE_ATTEMPTS; attempt++) {
    const interiorTarget =
      params.interiorWallRange[0] +
      Math.floor(rng() * (params.interiorWallRange[1] - params.interiorWallRange[0] + 1))
    const layout = buildWallLayout(BOARD_SIZE, params.maxRunLength, interiorTarget, rng)
    const layoutRuns = deriveRuns(layout)
    if (invalidRuns(layoutRuns).length > 0) continue

    const board = cloneBoard(layout)
    if (!fillDigits(board, layoutRuns, rng)) continue

    const runsWithSums = deriveRuns(board)
    const ratio = logicalFillRatio(runsWithSums, BOARD_SIZE)
    const distance = bandDistance(ratio, params.logicalFillBand)
    candidates.push({ board, runs: runsWithSums, distance })

    if (distance === 0 && candidates.length >= 3) break
  }

  if (candidates.length === 0) {
    throw new Error(`Failed to generate any fillable ${difficulty} board layout`)
  }

  candidates.sort((a, b) => a.distance - b.distance)

  let bestFallback: UniquenessAttempt | null = null
  for (const candidate of candidates.slice(0, MAX_UNIQUENESS_CHECKS)) {
    const attempt = ensureUnique(candidate.board, candidate.runs, rng)
    if (attempt.proven) {
      stampClueSums(attempt.puzzle.board, attempt.puzzle.runs)
      return attempt.puzzle
    }
    if (!bestFallback || attempt.lastSolutionCount < bestFallback.lastSolutionCount) {
      bestFallback = attempt
    }
  }

  // Every candidate's uniqueness proof was inconclusive (search budget exhausted) or hit a repair
  // dead end. Rather than fail the whole "New Game" action, fall back to whichever attempt came
  // closest — logged clearly since it isn't a certainty, only a strong likelihood, of uniqueness.
  if (bestFallback) {
    console.warn(
      `[kakuro] Could not prove uniqueness for a ${difficulty} puzzle after ${MAX_UNIQUENESS_CHECKS} candidates; ` +
        `using the closest best-effort attempt (last search found ${bestFallback.lastSolutionCount} solution(s)).`
    )
    stampClueSums(bestFallback.puzzle.board, bestFallback.puzzle.runs)
    return bestFallback.puzzle
  }

  throw new Error(`Failed to generate any ${difficulty} board layout`)
}

const CUSTOM_LAYOUT_SEARCH_BUDGET = 30_000

/**
 * Given a wall layout the user drew (Board Editor), auto-derives a solution and clue sums for it.
 * Unlike random generation, this never adds walls — the layout is the user's own design — so a
 * small or compact shape can genuinely lack enough interlocking for pure propagation to prove
 * uniqueness on its own (see `ensureUnique`'s comment for why that's common). Each fill attempt is
 * therefore also checked with a real (bounded) search: a fill proven to have exactly one solution
 * is accepted immediately, and if none reach that within the attempt budget, the fill that came
 * closest is used as a best-effort fallback rather than forcing the user to keep retrying forever.
 */
export function generateFromWallLayout(wallLayout: Board, rng: Rng = createRng()): GeneratedPuzzle | null {
  const layoutRuns = deriveRuns(wallLayout)
  // An all-wall (or otherwise runless) layout has no constraints to violate, so `invalidRuns`
  // finds nothing wrong with it — but it's not a puzzle either. Reject it explicitly rather than
  // let the loop below "solve" an empty board and hand back something unplayable.
  if (layoutRuns.length === 0) return null
  if (invalidRuns(layoutRuns).length > 0) return null

  let bestFallback: { board: Board; runs: Run[]; solutionCount: number } | null = null

  for (let fillAttempt = 0; fillAttempt < CUSTOM_LAYOUT_FILL_ATTEMPTS; fillAttempt++) {
    const board = cloneBoard(wallLayout)
    forEachWhiteCell(board, (cell) => {
      cell.solution = 0
    })
    if (!fillDigits(board, layoutRuns, rng)) continue

    const runsWithSums = deriveRuns(board)
    if (unresolvedCellCoords(runsWithSums, BOARD_SIZE).length === 0) {
      stampClueSums(board, runsWithSums)
      return { board, runs: runsWithSums }
    }

    const result = findDistinctSolutions(runsWithSums, BOARD_SIZE, 2, CUSTOM_LAYOUT_SEARCH_BUDGET)
    if (!result.confirmed) continue
    if (result.solutions.length <= 1) {
      stampClueSums(board, runsWithSums)
      return { board, runs: runsWithSums }
    }
    if (!bestFallback || result.solutions.length < bestFallback.solutionCount) {
      bestFallback = { board, runs: runsWithSums, solutionCount: result.solutions.length }
    }
  }

  if (bestFallback) {
    console.warn(
      `[kakuro] Could not prove uniqueness for this custom board after ${CUSTOM_LAYOUT_FILL_ATTEMPTS} attempts; ` +
        `using the closest best-effort fill (last search found ${bestFallback.solutionCount} solution(s)).`
    )
    stampClueSums(bestFallback.board, bestFallback.runs)
    return { board: bestFallback.board, runs: bestFallback.runs }
  }

  return null
}

export function toPuzzle(generated: GeneratedPuzzle, difficulty: Difficulty): Puzzle {
  return {
    id: crypto.randomUUID(),
    size: BOARD_SIZE,
    board: generated.board,
    runs: generated.runs,
    difficulty
  }
}
