import { Run } from './types'
import { combinationsFor } from './combinations'

interface SolverRun {
  cells: number[]
  combos: number[][]
}

interface SolveState {
  fixed: Map<number, number>
  runs: SolverRun[]
}

interface BuiltPuzzle {
  cellToRuns: Map<number, number[]>
  totalCells: number
}

export function cellIndex(row: number, col: number, size: number): number {
  return row * size + col
}

function buildPuzzle(runs: Run[], size: number): { state: SolveState; built: BuiltPuzzle } {
  const cellToRuns = new Map<number, number[]>()
  const solverRuns: SolverRun[] = runs.map((run, runIdx) => {
    const cells = run.cells.map((c) => cellIndex(c.row, c.col, size))
    for (const idx of cells) {
      const list = cellToRuns.get(idx) ?? []
      list.push(runIdx)
      cellToRuns.set(idx, list)
    }
    return { cells, combos: combinationsFor(cells.length, run.sum) }
  })
  return {
    state: { fixed: new Map(), runs: solverRuns },
    built: { cellToRuns, totalCells: cellToRuns.size }
  }
}

type PropagateResult = 'solved' | 'contradiction' | 'stalled'

/** Runs propagation to a fixed point, mutating `state` in place. Every newly-fixed cell index is appended to `addedKeys` so the caller can undo precisely. */
function propagate(state: SolveState, built: BuiltPuzzle, addedKeys: number[]): PropagateResult {
  let changed = true
  while (changed) {
    changed = false

    for (const run of state.runs) {
      const fixedDigits = run.cells
        .filter((c) => state.fixed.has(c))
        .map((c) => state.fixed.get(c)!)
      const fixedSet = new Set(fixedDigits)
      if (fixedSet.size !== fixedDigits.length) return 'contradiction'

      const filtered = run.combos.filter((combo) => fixedDigits.every((d) => combo.includes(d)))
      if (filtered.length === 0) return 'contradiction'
      if (filtered.length !== run.combos.length) {
        run.combos = filtered
        changed = true
      }
    }

    // Per-cell candidates: a digit is possible for a cell only if some remaining combo of its
    // across run AND some remaining combo of its down run both contain it.
    const cellCandidates = new Map<number, Set<number>>()
    for (const [cellIdx, runIdxs] of built.cellToRuns) {
      if (state.fixed.has(cellIdx)) continue

      let possible: Set<number> | null = null
      for (const runIdx of runIdxs) {
        possible = possible === null ? unionOfCombos(state.runs[runIdx].combos) : intersect(possible, unionOfCombos(state.runs[runIdx].combos))
      }

      if (!possible || possible.size === 0) return 'contradiction'
      cellCandidates.set(cellIdx, possible)
      if (possible.size === 1) {
        state.fixed.set(cellIdx, [...possible][0])
        addedKeys.push(cellIdx)
        changed = true
      }
    }

    // Hidden singles: a digit that appears in EVERY remaining combo of a run is guaranteed to be
    // used somewhere in that run. If only one of the run's still-unresolved cells can even hold
    // that digit, it must go there — even though that cell's own candidate set (above) may still
    // list other options on its own. This is the deduction a plain per-cell intersection misses,
    // and without it propagation stalls almost immediately on anything but the shortest runs.
    for (const run of state.runs) {
      if (run.combos.length === 0) continue
      const alreadyPlaced = new Set(run.cells.filter((c) => state.fixed.has(c)).map((c) => state.fixed.get(c)!))
      const guaranteedDigits = intersectionOfCombos(run.combos)
      for (const digit of guaranteedDigits) {
        if (alreadyPlaced.has(digit)) continue // already occupies a cell in this run — not looking for another home
        const holders = run.cells.filter((c) => !state.fixed.has(c) && cellCandidates.get(c)?.has(digit))
        if (holders.length === 1) {
          const cellIdx = holders[0]
          if (!state.fixed.has(cellIdx)) {
            state.fixed.set(cellIdx, digit)
            addedKeys.push(cellIdx)
            changed = true
          }
        }
      }
    }
  }

  return state.fixed.size === built.totalCells ? 'solved' : 'stalled'
}

function unionOfCombos(combos: number[][]): Set<number> {
  const result = new Set<number>()
  for (const combo of combos) for (const d of combo) result.add(d)
  return result
}

/** Digits present in every remaining combo — guaranteed to be used somewhere in the run regardless of which combo turns out to be correct. */
function intersectionOfCombos(combos: number[][]): Set<number> {
  if (combos.length === 0) return new Set()
  let result = new Set(combos[0])
  for (let i = 1; i < combos.length && result.size > 0; i++) {
    result = intersect(result, new Set(combos[i]))
  }
  return result
}

function intersect(a: Set<number>, b: Set<number>): Set<number> {
  const result = new Set<number>()
  for (const v of a) if (b.has(v)) result.add(v)
  return result
}

function pickMostConstrainedCell(state: SolveState, built: BuiltPuzzle): { cellIdx: number; candidates: number[] } | null {
  let best: { cellIdx: number; candidates: number[] } | null = null

  for (const [cellIdx, runIdxs] of built.cellToRuns) {
    if (state.fixed.has(cellIdx)) continue

    let possible: Set<number> | null = null
    for (const runIdx of runIdxs) {
      possible = possible === null ? unionOfCombos(state.runs[runIdx].combos) : intersect(possible, unionOfCombos(state.runs[runIdx].combos))
    }
    const candidates = possible ? [...possible] : []
    if (!best || candidates.length < best.candidates.length) {
      best = { cellIdx, candidates }
      if (candidates.length <= 1) break
    }
  }

  return best
}

const DEFAULT_NODE_BUDGET = 20_000

interface SearchBudget {
  remaining: number
}

type SearchOutcome = 'stop' | 'budget' | 'exhausted'

/**
 * Searches for solutions via propagation + backtracking, invoking `onSolution` for each
 * complete assignment found. Stops as soon as `onSolution` returns `true` (i.e. "stop searching"),
 * which lets callers implement both "find one" and "count up to N" with the same search.
 *
 * Mutates `state` in place and undoes its own changes before returning (rather than deep-cloning
 * the whole state per branch), so a node only costs O(number of runs) instead of O(total combos) —
 * essential for this to stay fast on a 10x10 board.
 *
 * Bounded by a node-expansion budget so a pathological board can never hang generation —
 * a `'budget'` outcome means the search gave up before exploring the full space, so callers
 * must not treat a low solution count as a confirmed result in that case.
 */
function search(
  state: SolveState,
  built: BuiltPuzzle,
  budget: SearchBudget,
  onSolution: (fixed: Map<number, number>) => boolean
): SearchOutcome {
  if (budget.remaining-- <= 0) return 'budget'

  const comboSnapshot = state.runs.map((r) => r.combos)
  const addedKeys: number[] = []
  const undo = (): void => {
    for (const key of addedKeys) state.fixed.delete(key)
    for (let i = 0; i < state.runs.length; i++) state.runs[i].combos = comboSnapshot[i]
  }

  const result = propagate(state, built, addedKeys)

  if (result === 'contradiction') {
    undo()
    return 'exhausted'
  }
  if (result === 'solved') {
    const stop = onSolution(state.fixed)
    undo()
    return stop ? 'stop' : 'exhausted'
  }

  const choice = pickMostConstrainedCell(state, built)
  if (!choice || choice.candidates.length === 0) {
    undo()
    return 'exhausted'
  }

  for (const digit of choice.candidates) {
    state.fixed.set(choice.cellIdx, digit)
    const outcome = search(state, built, budget, onSolution)
    state.fixed.delete(choice.cellIdx)
    if (outcome !== 'exhausted') {
      undo()
      return outcome
    }
  }

  undo()
  return 'exhausted'
}

function toDigitMap(fixed: Map<number, number>, size: number): Map<string, number> {
  const result = new Map<string, number>()
  for (const [idx, digit] of fixed) {
    const row = Math.floor(idx / size)
    const col = idx % size
    result.set(`${row},${col}`, digit)
  }
  return result
}

/** Solves the puzzle from its clue structure alone (never reads any stored solution digit). */
export function solveFromClues(runs: Run[], size: number, nodeBudget = DEFAULT_NODE_BUDGET): Map<string, number> | null {
  const { state, built } = buildPuzzle(runs, size)

  let solution: Map<number, number> | null = null
  search(state, built, { remaining: nodeBudget }, (fixed) => {
    solution = new Map(fixed)
    return true
  })

  return solution ? toDigitMap(solution, size) : null
}

export interface UniquenessResult {
  count: number
  /** false means the node budget ran out before the search space was fully explored — count is not trustworthy. */
  confirmed: boolean
}

/** Counts distinct solutions up to `cap` (default 2) — used to verify a generated puzzle is uniquely solvable. */
export function countSolutionsUpTo(runs: Run[], size: number, cap = 2, nodeBudget = DEFAULT_NODE_BUDGET): UniquenessResult {
  const { state, built } = buildPuzzle(runs, size)

  let count = 0
  const outcome = search(state, built, { remaining: nodeBudget }, () => {
    count++
    return count >= cap
  })

  return { count, confirmed: outcome !== 'budget' }
}

export interface DistinctSolutionsResult {
  solutions: Map<string, number>[]
  /** false means the node budget ran out before the search space was fully explored — the solutions found so far may not be exhaustive. */
  confirmed: boolean
}

/**
 * Like `countSolutionsUpTo`, but returns the actual digit assignment for each solution found
 * (up to `cap`). Used by the generator's uniqueness-repair loop, which needs to see exactly
 * where two solutions disagree in order to add a wall that rules one of them out.
 */
export function findDistinctSolutions(runs: Run[], size: number, cap = 2, nodeBudget = DEFAULT_NODE_BUDGET): DistinctSolutionsResult {
  const { state, built } = buildPuzzle(runs, size)

  const solutions: Map<number, number>[] = []
  const outcome = search(state, built, { remaining: nodeBudget }, (fixed) => {
    solutions.push(new Map(fixed))
    return solutions.length >= cap
  })

  return { solutions: solutions.map((s) => toDigitMap(s, size)), confirmed: outcome !== 'budget' }
}

/**
 * Runs constraint propagation only (no backtracking/guessing) and returns the fraction of
 * cells it can fill through pure logical deduction. Used as a practical difficulty signal:
 * an easier puzzle should be almost fully solvable this way.
 */
export function logicalFillRatio(runs: Run[], size: number): number {
  const { state, built } = buildPuzzle(runs, size)
  propagate(state, built, [])
  return built.totalCells === 0 ? 0 : state.fixed.size / built.totalCells
}

/**
 * Cells that pure logical propagation (no backtracking) could NOT pin down to a single digit.
 * A puzzle where this is empty is solvable by deduction alone with no free choices anywhere,
 * which is a cheap, sound proof that its solution is unique — no branch point exists from which
 * an alternate solution could diverge. The generator uses this list to know exactly which cells
 * are still ambiguous when it needs to repair a near-miss layout.
 */
export function unresolvedCellCoords(runs: Run[], size: number): { row: number; col: number }[] {
  const { state, built } = buildPuzzle(runs, size)
  propagate(state, built, [])

  const unresolved: { row: number; col: number }[] = []
  for (const idx of built.cellToRuns.keys()) {
    if (!state.fixed.has(idx)) {
      unresolved.push({ row: Math.floor(idx / size), col: idx % size })
    }
  }
  return unresolved
}
