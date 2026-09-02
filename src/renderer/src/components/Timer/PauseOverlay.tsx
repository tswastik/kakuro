import { useTimerStore } from '../../store/useTimerStore'

export function PauseOverlay() {
  const paused = useTimerStore((s) => s.paused)
  const resume = useTimerStore((s) => s.resume)

  if (!paused) return null

  return (
    <div className="pause-overlay">
      <div className="pause-overlay__card">
        <h2>Paused</h2>
        <p>The board is hidden while you're away.</p>
        <button className="btn btn-primary" onClick={resume}>
          ▶ Resume
        </button>
      </div>
    </div>
  )
}
