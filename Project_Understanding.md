# Kakuro — Project Understanding

A file-by-file walkthrough of the codebase: what each module and component does, what it exports,
and how it connects to the rest of the app. For the higher-level plan and feature list, see
[Project_Plan.md](Project_Plan.md). For terse "don't break this again" engineering notes, see
[NOTES.md](NOTES.md).

## How the app is put together, in one paragraph

Electron runs two processes: **main** (`src/main/`) just opens a window and loads the renderer;
**preload** (`src/preload/`) exposes one small bridge (a window-blur event) to it. Everything the
user actually sees and interacts with is the **renderer** — a normal React app. Inside the
renderer, `domain/` is a self-contained puzzle engine (types, generation, solving, validation)
with zero React or Electron dependency, `store/` holds four small Zustand stores that own all
mutable app state, and `components/` is the UI, organized one folder per feature area, reading
from and calling into the stores.

---

## Main process

### `src/main/index.ts`
Creates the single `BrowserWindow`, points it at the Vite dev server URL in development or the
built `index.html` in production, opens external links in the OS browser instead of inside the
app, and forwards the window's `blur` event to the renderer over IPC (`window:blur`) so the
puzzle timer can auto-pause when the app loses focus. Quits the app when the window closes
(standard non-macOS behavior).

### `src/main/is.ts`
One helper: `is.dev`, true when running under `electron-vite dev`.

### `src/preload/index.ts` / `index.d.ts`
`contextBridge.exposeInMainWorld('kakuroApi', { onWindowBlur })` — the *only* main↔renderer
bridge in the app. `index.d.ts` declares the resulting `window.kakuroApi` global so the renderer
gets full type checking on it.

---

## Renderer entry

### `src/renderer/src/main.tsx`
Mounts `<App />` into `#root` and imports `styles/theme.css` (the only global stylesheet import —
every component CSS file after this is plain, unscoped, imported once by whichever component
needs it, and stays loaded globally afterward since Vite injects `<style>` tags per imported CSS
module).

### `src/renderer/src/App.tsx`
The screen router. Reads `useUiStore().screen` and renders exactly one of `HomeScreen`,
`BoardScreen`, or `BoardEditor`; `RulesPanel` is *always* mounted underneath (it renders `null`
internally when closed) so the Rules modal can be opened from any screen. Also subscribes to the
preload's window-blur event and calls `useTimerStore.pause()` when it fires.

### `src/renderer/src/env.d.ts`
Just `/// <reference types="vite/client" />` — gives TypeScript the ambient types for `import.meta.env` and CSS-as-side-effect imports (`import './x.css'`).

---

## `domain/` — the puzzle engine

Pure TypeScript. Nothing here imports React, Zustand, or Electron. Every function takes plain data
in and returns plain data out, which is what makes the 27 unit tests possible without any DOM.

### `types.ts`
The shared vocabulary:
- `WallCell { kind: 'wall', rightSum?, downSum? }` and `WhiteCell { kind: 'white', solution, userDigit, pencilMarks: number[], state }` — a cell is one or the other (`Cell = WallCell | WhiteCell`), distinguished by `kind`. `isWhite()`/`isWall()` are the type-guard helpers used everywhere.
- `Board = Cell[][]`, `CellCoord = {row, col}`.
- `Run = { id, direction: 'across'|'down', sum, cells: CellCoord[] }` — **always derived, never stored** on the board itself (see `board.ts`).
- `Puzzle = { id, size, board, runs, difficulty }` — what actually gets handed to `usePuzzleStore` to play.
- `Difficulty = 'easy' | 'medium' | 'hard' | 'custom'`.

### `combinations.ts`
At module load, precomputes every subset of `{1..9}` for each length 2–9, indexed by
`combinationsFor(length, sum) → number[][]`. This one table underpins both the generator (which
digit sets can satisfy a given clue) and the solver (which digits are still possible in a cell).
Also exposes `minSumByLength`/`maxSumByLength` and `uniqueCombinationCount`.

### `random.ts`
A seedable PRNG (`createRng(seed?)`, mulberry32) plus `shuffle()` and `randomInt()`. Seeding
matters for reproducibility — the same seed always produces the same puzzle, which is what makes
the generator's own unit tests deterministic.

### `board.ts`
Board-shape utilities, all operating on the `Board`/`Run` types:
- `createWallCell`, `createWhiteCell`, `createEmptyWallBoard(size)` (an all-walls canvas, the board editor's starting point).
- `cloneBoard` — deep-ish clone (including each white cell's own `pencilMarks` array).
- `withCellUpdate(board, coord, updater)` — returns a new board where *only* the target cell (and its row) gets a new object reference; every other cell keeps its old reference. This is what lets `Cell.tsx` subscribe to a single board cell in Zustand and only re-render when that exact cell changes, instead of the whole 10×10 grid re-rendering on every keystroke.
- `deriveRuns(board)` — scans the board for every maximal contiguous white strip in both directions; `run.sum` is computed by *summing the white cells' `.solution` values*. This is the "I already know the answer" mode, used once a board is fully solved.
- `deriveRunsFromWallClues(board)` — same scan, but `run.sum` comes from the *wall* cell's `rightSum`/`downSum` instead (0 if not entered yet). This is the "I only know the clues, not the answer" mode, used by the board editor's manual clue-entry stage and by imported template files before they're solved.
- `invalidRuns(runs)` — flags any run outside length [2, 9] (can't hold non-repeating 1–9 digits).
- `stampClueSums(board, runs)` — writes each derived run's sum onto the wall cell immediately before it (used after the generator fills a board, so the clues match the fill).
- `forEachWhiteCell(board, fn)`.

### `solver.ts`
The actual Kakuro-solving logic, used by generation (to prove/disprove uniqueness), the board
editor (to solve user-entered clues), and its own unit tests. Internally:
1. **Propagation** (`propagate`): for each run, narrow its list of still-possible digit combinations by any cells already fixed; for each cell, intersect the digit-union of its across-run and down-run combos to find its own candidate set; if that's down to one digit, fix it. Then a **"hidden singles"** pass: if a digit is guaranteed to appear somewhere in a run (present in *every* remaining combo) and only one still-open cell in that run can hold it, fix it there too — the deduction a plain per-cell intersection alone would miss, and without it propagation stalls almost immediately on anything longer than the shortest runs.
2. **Backtracking** (`search`): when propagation stalls, pick the most-constrained still-open cell and branch on each remaining candidate, recursing with propagation re-applied at each node. Mutates its working state in place and undoes exactly what it changed on the way back out (rather than deep-cloning per branch) — this is what keeps it fast enough to run inside puzzle generation.
3. Bounded by a **node budget** (`SearchBudget`) so a pathological board can never hang the app; a budget-exhausted search reports `confirmed: false` rather than a false answer.

Public functions: `solveFromClues(runs, size)` (first solution, or null), `countSolutionsUpTo(runs, size, cap)` (how many solutions exist, up to `cap`), `findDistinctSolutions(runs, size, cap)` (same, but returns the actual digit assignments — needed when the generator has to see *where* two solutions disagree), `logicalFillRatio` and `unresolvedCellCoords` (propagation-only, no backtracking — cheap, used as a fast pre-check before paying for a real search).

### `generator.ts`
Builds random puzzles for Easy/Medium/Hard, "solution-first": lay out walls (`buildWallLayout`,
capping any run that ends up too long via `capOverlongRuns`, then sprinkling in more walls via
`addRandomInteriorWalls` until the difficulty's target density is hit), fill every white cell with
a digit via randomized backtracking (`fillDigits`) so no run repeats one, then derive each run's
sum from that fill.

The hard part is `ensureUnique`: proving that board is the *only* solution to its own clues is a
genuinely hard search problem (see Project_Plan.md's "known limitation" section for why). It
alternates cheap propagation-only tightening (walling off ambiguous cells) with occasional real
searches, and `generatePuzzle` falls back to the closest best-effort candidate (logged via
`console.warn`) if a full proof can't be reached in the attempt budget — so "New Game" always
produces *something* playable.

`generateFromWallLayout(wallLayout)` is the board-editor / import counterpart: given a wall
pattern the user already drew, it only *fills digits* (never adds walls, since the layout is the
user's own design) and proves uniqueness the same way. `toPuzzle(generated, difficulty)` wraps a
generated board+runs into the `Puzzle` shape the store expects.

### `customPuzzle.ts`
The board editor's "Clues" stage validator. `validateClues(board, size)` reads clues via
`deriveRunsFromWallClues` and returns one of: `invalid-structure` (a run too short/long),
`incomplete` (some clue not yet typed — sum sentinel is 0, since a real Kakuro sum is always ≥3),
`unsolvable` (no digit assignment satisfies every sum), `ambiguous` (more than one does), or
`unique` (exactly one — includes the solved digit map). `applySolutionToBoard(board, solution)`
writes that digit map onto the board's white cells once validation succeeds.

### `templateFile.ts`
The hand-editable board-file format (full spec in `templates/README.md`): a `#`/`.` grid string
per row plus a flat list of `{row, col, right?, down?}` clue entries. `boardToTemplateFile`/
`templateFileToBoard` convert to and from the app's internal `Board`; `parseTemplateFile` does
defensive runtime validation of arbitrary untrusted JSON (wrong version, wrong grid size, stray
characters, a border that isn't all walls, malformed clue entries) before anything touches it.

### `templateStorage.ts`
`localStorage`-backed persistence for **My Boards**: `listTemplates`, `saveTemplate(name, board,
size, proven)`, `getTemplate(id)`, `deleteTemplate(id)`. `proven` records whether the saved board
was independently proven unique or accepted via "Use Anyway" on an ambiguous one, so the UI can be
honest about it later.

### `validator.ts`
The Check-button logic, operating on an already-playing board: `checkBoard(board)` flags any
*filled* cell that doesn't match its solution as `state: 'incorrect'` (never touches empty cells,
never reveals answers — no hints); `isBoardSolved(board)` is the win check.

---

## `store/` — Zustand state

### `usePuzzleStore.ts`
The board actually being played. `puzzle: Puzzle | null`, `selectedCell`, `solved`. Actions:
`newPuzzle(difficulty)` (calls the generator, resumes the timer), `loadPuzzle(puzzle)` (same, for
a puzzle that came from the editor/templates instead of the random generator), `selectCell`,
`moveSelection(dRow, dCol)` (arrow-key navigation, skips wall cells), `setDigit(digit, asPencil)`,
`clearSelectedCell`, `checkBoard`, `solveBoard`. Per-cell writes go through `withCellUpdate` so
only the touched `Cell` component re-renders. Both `setDigit` (on completing the board) and
`solveBoard` call `useTimerStore.stop()` — deliberately *not* `pause()`, since solving/finishing
should stop the clock without triggering the board-hiding `PauseOverlay`.

### `useTimerStore.ts`
`startTimestamp`, `accumulatedMs`, `running`, `paused`. `resume()`/`pause()` are the user-facing
Pause button (pause sets `paused: true`, which `PauseOverlay` watches). `stop()` is the distinct
"solved" case — stops counting without setting `paused`. `getElapsedMs()` computes the displayed
time from `accumulatedMs` plus however long the current run has been going, rather than trusting
an incrementing counter (avoids drift from `setInterval` throttling).

### `useUiStore.ts`
Which top-level `screen` is active (`'home' | 'board' | 'editor'`), the global pencil-mode toggle,
and whether the Rules modal is open.

### `useEditorStore.ts`
The board editor's whole state machine — `stage: 'design' | 'clues' | 'ready'` plus the `board`
being built and a `clueValidation` result. Key actions: `toggleCell` (stage 1 only),
`goToClueStage`/`backToDesign`, `setClueValue` (stage 2), `validate` (runs `customPuzzle.
validateClues`), `proceedToReady` (only from a `'unique'` validation), `useAmbiguousAnyway`
(accepts an `'ambiguous'` one, re-solving to get *a* concrete solution to play against),
`saveTemplate`/`loadTemplate` (via `templateStorage`), `importFromFile` (parses+validates an
uploaded file and drops the user into whichever stage its contents warrant), `playNow` (wraps the
finished board as a `'custom'` `Puzzle` and hands it to `usePuzzleStore`). `readyProven` tracks
whether the current "ready" board was actually proven unique or just accepted anyway, so stage 3's
messaging (and the saved template's `proven` flag) stay honest.

---

## `components/`

### `Home/`
- **`HomeScreen.tsx`** — the landing screen: three difficulty cards (start a random puzzle),
  "Design Your Own Board" (→ editor), "My Boards" (opens `TemplatesModal`), "Import Board"
  (hidden file input + `FileReader`, feeds the text straight to
  `useEditorStore.importFromFile`), "How to Play" (opens the Rules modal).
- **`TemplatesModal.tsx`** — lists everything from `templateStorage`, each with Play (load +
  `playNow` + go to board), Edit (load into the editor), Export (downloads a `.json` via a blob
  URL + a temporary `<a download>`, using `templateFile`'s converter), Delete.

### `Board/` — playing a puzzle
- **`BoardScreen.tsx`** — composes `Toolbar` (top bar), the win banner, `Grid` + `PauseOverlay`,
  and `SidePanel`.
- **`Grid.tsx`** — renders the 10×10 grid of `Cell`s and owns *all* keyboard handling (arrow keys,
  digit keys, Backspace/Delete, Tab for pencil mode) as one grid-level `onKeyDown`, rather than a
  listener per cell.
- **`Cell.tsx`** — subscribes to exactly one `puzzle.board[row][col]` from the store and dispatches
  to `ClueCell` (wall) or `WhiteCell` (playable).
- **`ClueCell.tsx`** — the diagonally-split clue cell, as inline SVG (so it scales cleanly with
  cell size and text can be sized in SVG user-units). Renders the down-sum (↓) at bottom-left and
  the right-sum (→) at top-right — a deliberate reversal of the traditional Kakuro convention, per
  the user's request.
- **`WhiteCell.tsx`** — the playable cell: shows the big blue digit if one's entered, otherwise
  `PencilMarks` if any are set, styled red when `state === 'incorrect'`.
- **`PencilMarks.tsx`** — the 3×3 mini-grid of small candidate digits.

### `Editor/` — designing a board (3-stage flow)
- **`BoardEditor.tsx`** — the stage router: renders the stepper (1. Design / 2. Clues / 3. Ready)
  and whichever stage component matches `useEditorStore().stage`.
- **`DesignStage.tsx`** — the wall/white toggle grid (stage 1). Blocks "Next" while any run is
  shorter than 2 cells or the board is entirely walls.
- **`ClueStage.tsx`** — lists every across and down run (via `deriveRuns`, just for cell
  membership) with a number input for its sum, live-flagging any single sum that's infeasible for
  its run length (via `combinationsFor`) before the user even clicks Validate. "Validate Clues"
  calls the store's `validate()`; renders whichever of incomplete/unsolvable/ambiguous/unique
  message applies, including the "Use Anyway" override for an ambiguous set.
- **`ReadyStage.tsx`** — a read-only preview of the finished board (reusing `ClueCell`, but blank
  white cells — never shows the solution), the Save-Template name field, and Play Now.

### `Toolbar/`
- **`Toolbar.tsx`** — the board screen's top bar: New Game (regenerates the same difficulty in
  place, or goes home for a custom puzzle), Quit (→ home), the `Timer`, Pause/Resume, How to Play.
- **`SidePanel.tsx`** — the digit pad, Pencil toggle, Check, and Solve (with a `ConfirmDialog`
  before actually revealing the solution), positioned beside the board rather than in the top bar.
- **`DigitPad.tsx`** — the on-screen 1–9 + clear keypad, an alternative to typing.

### `Timer/`
- **`Timer.tsx`** — reads `useTimerStore.getElapsedMs()` and force-re-renders on a short interval
  purely to refresh the display; the interval is *not* the source of truth for elapsed time.
- **`PauseOverlay.tsx`** — the board-hiding blur/card shown while `paused` (not `stopped`) is true.

### `Rules/`
- **`RulesPanel.tsx`** — the How-to-Play modal: goal, the two rules, how to read a reversed clue
  cell, and the full controls reference. Always mounted (see `App.tsx`), toggled via
  `useUiStore`.

### `common/`
- **`ConfirmDialog.tsx`** — a small reusable custom-styled confirm/cancel modal (used for the
  Solve confirmation instead of the native `window.confirm`, which doesn't match the app's look
  and doesn't work reliably in every embedding context).

---

## `styles/theme.css`

The only global stylesheet. CSS custom properties for the whole palette (wall colors, white-cell
backgrounds, the blue/red/amber accents, fonts), the shared `.btn`/`.btn-primary`/`.btn-secondary`/
`.btn-danger` button styles every screen uses, and the Nunito font faces (bundled locally via
`@fontsource/nunito`, not a CDN, since this is an offline desktop app). Everything else
(`Board.css`, `HomeScreen.css`, `BoardEditor.css`, `RulesPanel.css`, `TemplatesModal.css`,
`ConfirmDialog.css`) is component-scoped by convention (plain class names, no CSS modules) and
imported once by the component that owns it.

---

## Three walkthroughs, to see the pieces move together

**Starting a random Easy game:** `HomeScreen` → `usePuzzleStore.newPuzzle('easy')` → `generator.
generatePuzzle('easy', rng)` builds and validates a board → wrapped via `toPuzzle` → stored, timer
resumed → `useUiStore.goTo('board')` → `BoardScreen` reads the new `puzzle` and renders `Grid`.

**Designing a board by hand:** `HomeScreen` → `useUiStore.goTo('editor')` → `DesignStage` toggles
cells in `useEditorStore.board` → `goToClueStage` → `ClueStage` writes sums via `setClueValue` →
`validate()` calls `customPuzzle.validateClues` (which itself calls into `solver.ts`) → on
`'unique'`, `proceedToReady` applies the solution and moves to `ReadyStage` → `playNow` wraps it
as a `'custom'` `Puzzle` and hands it to `usePuzzleStore`, same as a random one from here on.

**Importing a hand-edited file:** `HomeScreen`'s hidden file input reads the file as text →
`useEditorStore.importFromFile` parses it (`templateFile.parseTemplateFile`), rejects anything
malformed, converts it to a `Board`, and re-validates its clues from scratch (never trusts the
file's own claims) — landing either straight in `'ready'` (already valid and unique) or in
`'clues'` (so the same validator UI a hand-typed board would hit can guide fixing it).
