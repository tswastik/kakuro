# Kakuro Desktop App — Project Plan & Structure

A Windows desktop Kakuro puzzle app: play a random Easy/Medium/Hard 10×10 puzzle, design your own
board, save/load/import/export board templates, with a modern warm-toned UI, pencil marks, a
pausable timer, and a Check/Solve flow with no hints.

Standalone project, unrelated to any other app in this workspace. See [NOTES.md](NOTES.md) for
terser "things to know before you touch this" engineering notes; this file is the fuller picture.

## Tech stack

- **Electron + React + TypeScript**, scaffolded with `electron-vite` (separate Vite build
  pipelines for main/preload/renderer).
- **Zustand** for state — no Redux/Context, chosen so per-cell UI updates don't re-render the
  whole 10×10 grid.
- **Vitest** for the domain-engine unit tests (27 tests, all pure TypeScript, no DOM/Electron).
- **electron-builder** for packaging a Windows NSIS installer.
- All puzzle generation and solving is **plain deterministic TypeScript** — combinatorics,
  constraint propagation, and backtracking search. No AI/ML model, no network call, no
  nondeterministic "thinking" step of any kind is involved in building a board; the same seed
  reproduces the same puzzle every time (see `domain/random.ts`'s seedable PRNG).

## Commands

```
npm run dev        # electron-vite dev server + Electron window
npm test           # domain engine unit tests (vitest)
npm run typecheck  # tsconfig.web.json + tsconfig.node.json
npm run dist:win   # build the Windows installer
```

## Project structure

```
Kakuro/
  templates/
    README.md              # the hand-editable board-file format, explained with an example
    bundled-puzzles.json    # 10 pre-generated puzzles each for Easy/Medium/Hard (30 total)
  src/
    main/                   # Electron main process (window creation, lifecycle)
    preload/                # contextBridge — currently just a window-blur → renderer event
    renderer/
      index.html
      src/
        main.tsx / App.tsx  # screen router (Home / Board / Editor) + always-mounted RulesPanel
        env.d.ts            # Vite client types (CSS imports, etc.)

        domain/             # the entire puzzle engine — pure TS, no React/Electron dependency
          types.ts            # Board/Cell/Run/Puzzle/Difficulty types
          combinations.ts     # precomputed "which digit subsets sum to N over length L" table
          board.ts            # run derivation, board mutation helpers, wall/white conventions
          random.ts           # seedable PRNG (mulberry32) + shuffle
          generator.ts        # random puzzle generation for Easy/Medium/Hard (see below)
          solver.ts           # constraint propagation (incl. "hidden singles") + backtracking
          validator.ts        # Check-button logic: flag wrong filled cells, detect a full solve
          customPuzzle.ts     # validates user-typed clue sums (board editor stage 2)
          templateFile.ts     # the hand-editable JSON board-file format (see templates/README.md)
          templateStorage.ts  # localStorage-backed save/list/delete for "My Boards"
          *.test.ts           # 27 unit tests across all of the above

        store/              # Zustand stores
          usePuzzleStore.ts   # the live board being played: digits, pencil marks, check/solve
          useTimerStore.ts    # elapsed time; pause() (shows overlay) vs stop() (solved, no overlay)
          useUiStore.ts       # which screen is active, pencil-mode toggle, rules panel open/closed
          useEditorStore.ts   # the 3-stage board editor (design → clues → ready), import/save

        components/
          Home/          HomeScreen, TemplatesModal ("My Boards": play/edit/export/delete)
          Board/          BoardScreen, Grid, Cell, ClueCell (SVG diagonal clue), WhiteCell, PencilMarks
          Editor/          BoardEditor (stage router + stepper), DesignStage, ClueStage, ReadyStage
          Toolbar/         Toolbar (top bar), SidePanel (digit pad + Pencil/Check/Solve), DigitPad
          Timer/           Timer, PauseOverlay
          Rules/           RulesPanel (How to Play)
          common/          ConfirmDialog (used for the Solve confirmation)

        styles/theme.css  # CSS custom properties: palette, fonts, shared button styles
```

## Core features

### Play a random puzzle
Home → Easy/Medium/Hard → generates a puzzle and opens the board. Digit entry (click + type, or
the on-screen keypad), pencil marks (toggle mode, small 3×3 mini-grid per cell), arrow-key
navigation, Check (flags wrong *filled* cells red, never reveals answers), Solve (confirmation
dialog, reveals everything, stops the timer), Pause (blurs/hides the board, stops the timer),
New Game (regenerates the same difficulty), Quit (back to Home).

### Board Editor — three stages
"Design Your Own Board" walks through:
1. **Design** — click cells to carve the wall/white layout. Blocked to runs shorter than 2 cells.
2. **Clues** — type the sum for every run directly (across and down listed separately with the
   run's length shown). "Validate Clues" runs the real solver and reports one of: clues still
   missing, no solution exists, more than one solution exists (with an "Use Anyway" override), or
   exactly one solution (continue).
3. **Ready** — a read-only preview of the finished board (no solution shown), with **Save
   Template** (name it, stored via `templateStorage`) and **Play Now**.

### Templates: save, load, import, export
- **My Boards** (Home screen) lists everything saved via `templateStorage` (localStorage), each
  with Play / Edit / Export / Delete.
- **Export** downloads a saved board as a `.json` file in the format documented in
  `templates/README.md` — self-contained, meant to be readable and hand-editable in any text
  editor (a `#`/`.` grid plus a flat list of clue sums).
- **Import Board** (Home screen) reads a `.json` file (hand-written or exported) and drops it into
  the editor at whichever stage makes sense: straight to "Ready" if it's already fully valid and
  unique, or into the "Clues" stage (reusing the same validator UI) if clues are missing or don't
  check out.
- `templates/bundled-puzzles.json` ships 10 ready-made puzzles per difficulty as both a quick
  source of extra content and worked examples of the file format for hand-editing.

## The generation/solving engine, and its one real limitation

`generator.ts` builds a puzzle "solution-first": lay out walls, fill every white cell with a
digit so no run repeats one, then derive each run's clue sum from that fill. `solver.ts`
implements real Kakuro logic — per-run candidate combinations, cross-run intersection, and
"hidden singles" (a digit guaranteed to appear somewhere in a run, with only one cell able to
hold it) — plus backtracking for whatever propagation alone can't resolve.

**Proving a full 10×10 board has *exactly one* solution is a genuinely hard search problem** —
run-level constraints alone are much weaker than e.g. Sudoku's row/column-wide constraints, so a
plain random fill is very rarely uniquely solvable on its own (often 6+ valid alternates).
`ensureUnique` in `generator.ts` handles this with a hybrid: cheap propagation-only tightening
first, then one real backtracking search per round to check where things stand and target the
next tightening round. When even that can't reach a proof in reasonable time, `generatePuzzle`
falls back to the closest best-effort candidate (logged via `console.warn`) rather than fail the
"New Game" action outright. In practice the fallback is extremely close (its own solver finds a
second solution differing from the intended one in only a cell or two) and is not something a
player would notice while solving. Manually-authored boards (editor stage 2, and imports) are
held to the strict standard instead — the app tells you outright if your clues aren't uniquely
solvable, since you have full control to just adjust a sum.

## Known deliberate design choices (don't "fix" without checking first)

- Clue cell diagonal split is **intentionally reversed** from the traditional Kakuro convention,
  at the user's request: the down-sum (↓) sits bottom-left, the right-sum (→) sits top-right.
- Wall colors are literal user-specified hex values (`--wall-brown: #e3a869`,
  `--wall-brown-dark: #cd853f` in `theme.css`), not a designed palette.
- The whole board has a solid black border (`Board.css`'s `.grid`).
- `useTimerStore` has both `pause()` (user-initiated, shows the board-hiding overlay) and
  `stop()` (puzzle solved — stops the clock but must NOT hide the finished board). Conflating
  these was a real bug that shipped once already.

## Verification

- `npm test` — 27 unit tests covering combinatorics, run derivation, the solver (propagation +
  backtracking + hidden singles), the generator (structural validity across all three
  difficulties, custom-layout generation, edge cases like an all-wall board), clue validation for
  the editor, and the template file format's round-trip + parse-error handling.
- Manual verification (this session): generated a puzzle per difficulty and played it end-to-end
  in the browser-hosted renderer (digit entry, pencil marks, Check flagging red correctly, Solve
  revealing the answer and stopping the timer, Pause hiding the board); ran the full 3-stage
  editor flow including an ambiguous-clue case and "Use Anyway"; imported/exported a board file.
- Not yet done: packaging the actual Windows installer (`npm run dist:win`) and running it outside
  the dev environment.
