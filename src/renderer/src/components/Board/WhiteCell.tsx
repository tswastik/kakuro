import { WhiteCell as WhiteCellModel } from '@domain/types'
import { PencilMarks } from './PencilMarks'

interface WhiteCellProps {
  cell: WhiteCellModel
  isSelected: boolean
  onSelect: () => void
}

export function WhiteCell({ cell, isSelected, onSelect }: WhiteCellProps) {
  const classes = ['white-cell']
  if (isSelected) classes.push('white-cell--selected')
  if (cell.state === 'incorrect') classes.push('white-cell--incorrect')

  return (
    <button type="button" className={classes.join(' ')} onClick={onSelect}>
      {cell.userDigit !== null ? (
        <span className="white-cell__digit">{cell.userDigit}</span>
      ) : cell.pencilMarks.length > 0 ? (
        <PencilMarks marks={cell.pencilMarks} />
      ) : null}
    </button>
  )
}
