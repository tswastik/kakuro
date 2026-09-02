# Kakuro board template files

A template file is a plain JSON file that fully describes one Kakuro board — the wall/white
layout **and** every clue sum. It's designed to be readable and hand-editable in any text editor,
with no other file or app state needed to understand it.

## Format

```json
{
  "version": 1,
  "name": "My First Board",
  "size": 10,
  "grid": [
    "##########",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "##########"
  ],
  "clues": [
    { "row": 0, "col": 1, "down": 17 },
    { "row": 1, "col": 0, "right": 24 }
  ]
}
```

| Field | Meaning |
|---|---|
| `version` | Always `1`. |
| `name` | Whatever you want to call the board. |
| `size` | The board's width/height. The app currently only plays `10`. |
| `grid` | One string per row, `size` characters each. `#` = wall (blocked) cell, `.` = white (playable) cell. **Row 0 and column 0 must be all `#`** — that border is where the outermost clues live. |
| `clues` | One entry per clue-bearing wall cell: `row`/`col` locate the wall cell, `right` is the sum of the run starting immediately to its right, `down` is the sum of the run starting immediately below it. A wall cell can have `right`, `down`, both, or (if it's just a plain wall) neither — only include what applies. |

## Rules a valid board must follow

- Every maximal strip of white cells (reading across or down) must be **2 to 9 cells long**. A
  strip of just 1 cell, or longer than 9, isn't legal Kakuro (you can't fit non-repeating 1–9
  digits into it).
- Every such strip needs exactly one clue sum, on the wall cell immediately before it (to its
  left for an across strip, above it for a down strip).
- The set of sums must have **exactly one** valid solution — some digits from 1–9 in every white
  cell, no repeats within any strip, matching every sum exactly. The app checks this for you and
  will tell you if a clue is missing, the puzzle can't be solved at all, or more than one solution
  exists — you don't have to work this out by hand.

## Building your own

1. Start from one of the 30 puzzles in `bundled-puzzles.json` (see below) as a working example, or
   sketch your own `grid` from scratch.
2. Fill in `clues` for every run — even a rough guess is fine, since the app validates for you.
3. In the app, use **Import Board** on the home screen and pick your file. It's loaded straight
   into the "Design Your Own Board" flow at whichever stage makes sense:
   - If every clue is filled in and has exactly one solution → straight to "Ready to Play".
   - Otherwise → the Clues stage, with the same validator you'd see designing a board in the app,
     so you can see exactly what's missing or wrong.
4. From "Ready to Play" you can **Save Template** (to play again later from **My Boards**) or
   **Play Now**.

You can also go the other direction: design or edit a board in the app, then use **Export** from
**My Boards** to get a `.json` file in this exact format — useful as a starting point for your
next hand-edit, or to hand a board to someone else using the app.

## `bundled-puzzles.json`

Ten pre-generated, pre-validated puzzles for each of Easy, Medium, and Hard, in the shape:

```json
{
  "size": 10,
  "easy":   [ { "version": 1, "name": "Easy #1", ... }, /* … 10 total */ ],
  "medium": [ /* … 10 total */ ],
  "hard":   [ /* … 10 total */ ]
}
```

Each entry is a template object identical in shape to a single-board file above — pull one out,
save it as its own `.json` file, and it's importable on its own.
