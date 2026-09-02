import { create } from 'zustand'

export type Screen = 'home' | 'board' | 'editor'

interface UiState {
  screen: Screen
  pencilMode: boolean
  rulesOpen: boolean

  goTo: (screen: Screen) => void
  togglePencilMode: () => void
  toggleRules: () => void
}

export const useUiStore = create<UiState>((set) => ({
  screen: 'home',
  pencilMode: false,
  rulesOpen: false,

  goTo: (screen) => set({ screen }),
  togglePencilMode: () => set((s) => ({ pencilMode: !s.pencilMode })),
  toggleRules: () => set((s) => ({ rulesOpen: !s.rulesOpen }))
}))
