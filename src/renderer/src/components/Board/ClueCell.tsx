interface ClueCellProps {
  rightSum?: number
  downSum?: number
}

export function ClueCell({ rightSum, downSum }: ClueCellProps) {
  return (
    <svg viewBox="0 0 60 60" className="clue-cell" role="presentation">
      <polygon points="0,0 60,0 60,60" fill="var(--wall-brown)" />
      <polygon points="0,0 0,60 60,60" fill="var(--wall-brown-dark)" />
      <line x1="0" y1="0" x2="60" y2="60" stroke="var(--wall-divider)" strokeWidth="1" />

      {downSum !== undefined && (
        <g className="clue-cell__down">
          <text x="20" y="46" className="clue-cell__text" textAnchor="middle">
            {downSum}
          </text>
          <text x="12" y="54" className="clue-cell__arrow" textAnchor="middle">
            ↓
          </text>
        </g>
      )}

      {rightSum !== undefined && (
        <g className="clue-cell__right">
          <text x="38" y="20" className="clue-cell__text" textAnchor="middle">
            {rightSum}
          </text>
          <text x="47" y="12" className="clue-cell__arrow" textAnchor="middle">
            →
          </text>
        </g>
      )}
    </svg>
  )
}
