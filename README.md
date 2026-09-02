# Kakuro

A modern 10×10 Kakuro puzzle desktop app for Windows — play a random puzzle, design your own
board, and share it with anyone else using the app.

Built with Electron, React, and TypeScript. Puzzle generation and solving are 100% deterministic
algorithmic code (combinatorics, constraint propagation, backtracking search) — no AI/ML model or
network call is involved anywhere in building or checking a board.

## Features

- **Random puzzles** in three difficulties (Easy / Medium / Hard), generated on demand.
- **Play mode**: click-or-type digit entry, an on-screen keypad, pencil marks (small candidate
  digits per cell), arrow-key navigation, a pausable timer that hides the board while paused.
- **Check** flags wrong *filled-in* cells in red — it never reveals the answer. **Solve** (behind
  a confirmation) reveals the full solution if you want to give up on an attempt.
- **Design your own board**, in three stages:
  1. **Design** the wall/white layout by clicking cells.
  2. **Clues** — type in every run's sum yourself; the app validates it with a real solver and
     tells you if a clue's missing, the puzzle is unsolvable, or it has more than one solution.
  3. **Ready** — preview the finished board and save it or play it immediately.
- **My Boards**: save, replay, edit, export, or delete any board you've designed.
- **Import / Export**: boards are plain, hand-editable JSON files (see
  [`templates/README.md`](templates/README.md) for the format) — write one in a text editor, or
  export a board you made in the app to hand to someone else. 30 ready-made puzzles ship in
  [`templates/bundled-puzzles.json`](templates/bundled-puzzles.json) (10 per difficulty).

## Getting started

Requires Node.js.

```bash
npm install
npm run dev          # launches the Electron app with hot reload
```

Other commands:

```bash
npm test             # run the domain-engine unit tests (vitest)
npm run typecheck     # type-check the whole project
npm run dist:win     # build a Windows installer (release/*.exe)
```

## Tech stack

Electron + React + TypeScript, scaffolded with `electron-vite`. State is managed with Zustand.
Tests run on Vitest. Packaged with `electron-builder` (NSIS installer for Windows).

## Project docs

- [`Project_Plan.md`](Project_Plan.md) — architecture, feature list, and the one real limitation
  worth knowing about (proving a 10×10 board has exactly one solution is a hard search problem).
- [`Project_Understanding.md`](Project_Understanding.md) — a file-by-file walkthrough of every
  module and component.
- [`templates/README.md`](templates/README.md) — the board template file format, for hand-editing
  or building your own puzzles outside the app.
