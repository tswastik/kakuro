import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onWindowBlur: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('window:blur', listener)
    return () => ipcRenderer.removeListener('window:blur', listener)
  }
}

contextBridge.exposeInMainWorld('kakuroApi', api)

export type KakuroApi = typeof api
