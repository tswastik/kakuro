# Kakuro — Project Notes

Standalone project. Unrelated to any other app in this user's workspace — no shared context,
patterns, or conventions carried over from elsewhere. Keep project-specific memory/history here,
not in any global/cross-project store.

## Stack

Electron + React + TypeScript, scaffolded with `electron-vite`. Zustand for state. Vitest for the
domain-engine unit tests. Packaged with `electron-builder` (NSIS, Windows).

- `npm run dev` — dev server + Electron window
- `npm test` — domain engine unit tests
- `npm run typecheck` — both tsconfig projects (web + node)
- `npm run dist:win` — build the Windows installer

## Architecture

- `src/renderer/src/domain/` — the entire puzzle engine (types, combinations table, board/run
  helpers, generator, solver, validator). Pure TypeScript, no React/Electron dependency, fully
  unit-tested. This is the layer to touch for anything about puzzle rules, generation, or solving.
- `src/renderer/src/store/` — Zustand stores: `usePuzzleStore` (board/play state), `useTimerStore`
  (elapsed time, `pause`/`resume`/`stop` — see below), `useUiStore` (screen nav, pencil mode, rules
  panel), `useEditorStore` (board editor wall-toggle state).
- `src/renderer/src/components/` — one folder per feature area (Home, Board, Toolbar, Timer,
  Editor, Rules, common).

## Known limitation: puzzle uniqueness is best-effort, not guaranteed

A real Kakuro solver constrains a cell via **both** its across and down run simultaneously, plus
techniques like "hidden singles" (a digit guaranteed somewhere in a run, only one cell can hold
it). `solver.ts` implements both. Even so, proving a full 10×10 board has *only one* valid
solution is a hard search problem — a naive random digit-fill on a 10x10 grid is very rarely
uniquely solvable by itself (often 6+ valid alternate solutions), because run-level constraints
alone are much weaker than e.g. Sudoku's row/column-wide constraints.

`generator.ts`'s `ensureUnique` handles this pragmatically:
1. Cheap propagation-only tightening (walling off ambiguous cells) — fast, sound when it fully
   resolves the board (no branch point exists, so no alternate solution could exist).
2. When that stalls, one real backtracking search per round to check where things stand, using
   the actual differing solutions found to target the next tightening round.
3. If neither proves strict uniqueness within the attempt budget, `generatePuzzle` and
   `generateFromWallLayout` **fall back to the closest best-effort candidate** (logged via
   `console.warn`) rather than fail the "New Game" action outright.

Practically: most generated puzzles are proven unique or extremely close to it (the fallback
typically has just 2 valid solutions differing in a cell or two). If this ever needs to be
tightened further, the lever is `ensureUnique`'s round/repair budgets and the search node budget
in `solver.ts` — not a quick fix, see the git history / conversation this was built in for the
full story of what was tried (much higher wall density, pure propagation only, pure search only)
and why the current hybrid was landed on.

## Design decisions worth knowing before changing the UI

- Clue cell diagonal split is **intentionally reversed** from the traditional Kakuro convention at
  the user's request: the down-sum (↓) is bottom-left, the right-sum (→) is top-right (see
  `ClueCell.tsx`). Don't "fix" this back to convention without checking with the user first.
- Wall/clue colors are literal user-specified hex values (`--wall-brown: #cd853f`,
  `--wall-brown-dark: #f5f5dc` in `theme.css`) — not a designed palette, just what was asked for.
- `useTimerStore` has both `pause()` (user-initiated, shows the board-hiding `PauseOverlay`) and
  `stop()` (used when the puzzle is solved — stops counting but must NOT hide the finished board).
  Don't conflate these again; that was a real bug that shipped once already.
- Layout: top toolbar has New Game / Quit / Timer / Pause / How to Play. The digit pad, pencil
  toggle, Check, and Solve live in a `SidePanel` to the right of the board, not the top bar.
