import { useEffect, useState } from 'react'
import { useTimerStore } from '../../store/useTimerStore'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function Timer() {
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs)
  const running = useTimerStore((s) => s.running)
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => forceTick((n) => n + 1), 300)
    return () => clearInterval(id)
  }, [running])

  return <div className="timer">{formatElapsed(getElapsedMs())}</div>
}
