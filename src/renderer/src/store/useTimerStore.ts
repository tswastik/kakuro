import { create } from 'zustand'

interface TimerState {
  startTimestamp: number | null
  accumulatedMs: number
  running: boolean
  paused: boolean

  resume: () => void
  pause: () => void
  /** Stops counting (e.g. the puzzle was solved) without setting `paused` — unlike `pause`, this must NOT trigger the board-hiding PauseOverlay; a finished board should stay visible. */
  stop: () => void
  reset: () => void
  getElapsedMs: () => number
}

export const useTimerStore = create<TimerState>((set, get) => ({
  startTimestamp: null,
  accumulatedMs: 0,
  running: false,
  paused: false,

  resume: () => {
    if (get().running) return
    set({ startTimestamp: Date.now(), running: true, paused: false })
  },

  pause: () => {
    const { running, startTimestamp, accumulatedMs } = get()
    if (!running || startTimestamp === null) {
      set({ paused: true })
      return
    }
    set({
      accumulatedMs: accumulatedMs + (Date.now() - startTimestamp),
      running: false,
      paused: true,
      startTimestamp: null
    })
  },

  stop: () => {
    const { running, startTimestamp, accumulatedMs } = get()
    if (!running || startTimestamp === null) return
    set({
      accumulatedMs: accumulatedMs + (Date.now() - startTimestamp),
      running: false,
      startTimestamp: null
    })
  },

  reset: () => {
    set({ startTimestamp: null, accumulatedMs: 0, running: false, paused: false })
  },

  getElapsedMs: () => {
    const { accumulatedMs, running, startTimestamp } = get()
    return accumulatedMs + (running && startTimestamp ? Date.now() - startTimestamp : 0)
  }
}))
