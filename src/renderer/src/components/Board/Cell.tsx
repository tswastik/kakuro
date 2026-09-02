import { CellCoord } from '@domain/types'
import { usePuzzleStore } from '../../store/usePuzzleStore'
import { ClueCell } from './ClueCell'
import { WhiteCell } from './WhiteCell'

interface CellProps {
  coord: CellCoord
}

export function Cell({ coord }: CellProps) {
  const cell = usePuzzleStore((s) => s.puzzle!.board[coord.row][coord.col])
  const isSelected = usePuzzleStore(
    (s) => s.selectedCell?.row === coord.row && s.selectedCell?.col === coord.col
  )
  const selectCell = usePuzzleStore((s) => s.selectCell)

  if (cell.kind === 'wall') {
    return (
      <div className="board-cell">
        <ClueCell rightSum={cell.rightSum} downSum={cell.downSum} />
      </div>
    )
  }

  return (
    <div className="board-cell">
      <WhiteCell cell={cell} isSelected={isSelected} onSelect={() => selectCell(coord)} />
    </div>
  )
}
