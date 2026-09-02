import { useEffect } from 'react'
import { useUiStore } from './store/useUiStore'
import { useTimerStore } from './store/useTimerStore'
import { HomeScreen } from './components/Home/HomeScreen'
import { BoardScreen } from './components/Board/BoardScreen'
import { BoardEditor } from './components/Editor/BoardEditor'
import { RulesPanel } from './components/Rules/RulesPanel'

export default function App() {
  const screen = useUiStore((s) => s.screen)

  useEffect(() => {
    return window.kakuroApi?.onWindowBlur(() => {
      if (useTimerStore.getState().running) useTimerStore.getState().pause()
    })
  }, [])

  return (
    <div className="app-shell">
      {screen === 'home' && <HomeScreen />}
      {screen === 'board' && <BoardScreen />}
      {screen === 'editor' && <BoardEditor />}
      <RulesPanel />
    </div>
  )
}
