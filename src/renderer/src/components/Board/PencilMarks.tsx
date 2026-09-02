interface PencilMarksProps {
  marks: number[]
}

export function PencilMarks({ marks }: PencilMarksProps) {
  const set = new Set(marks)
  return (
    <div className="pencil-marks">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
        <span key={digit} className="pencil-marks__slot">
          {set.has(digit) ? digit : ''}
        </span>
      ))}
    </div>
  )
}
