import { usePuzzleStore } from '../../store/usePuzzleStore'
import { Toolbar } from '../Toolbar/Toolbar'
import { SidePanel } from '../Toolbar/SidePanel'
import { Grid } from './Grid'
import { PauseOverlay } from '../Timer/PauseOverlay'
import './Board.css'

export function BoardScreen() {
  const puzzle = usePuzzleStore((s) => s.puzzle)
  const solved = usePuzzleStore((s) => s.solved)

  if (!puzzle) return null

  return (
    <div className="board-screen">
      <Toolbar />
      {solved && <div className="win-banner">🎉 Solved! Great work.</div>}
      <div className="board-layout">
        <div className="board-wrapper">
          <Grid />
          <PauseOverlay />
        </div>
        <SidePanel />
      </div>
    </div>
  )
}
