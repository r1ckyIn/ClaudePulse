import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'
import type { SessionState, DayStats } from '../shared/types'

export interface NotificationSettings {
  notifications: boolean
  completionNotifications: boolean
}

export interface ClaudePulseAPI {
  onSessionsUpdated: (callback: (sessions: SessionState[]) => void) => () => void
  onSessionRemoved: (callback: (sessionId: string) => void) => () => void
  getSessions: () => Promise<SessionState[]>
  getStats: () => Promise<DayStats[]>
  onStatsUpdated: (callback: (stats: DayStats[]) => void) => () => void
  updateSettings: (settings: NotificationSettings) => void
  toggleFloating: () => void
  onExpandedChanged: (callback: (expanded: boolean) => void) => () => void
}

const api: ClaudePulseAPI = {
  onSessionsUpdated: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessions: SessionState[]): void => {
      callback(sessions)
    }
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_UPDATED, handler)
  },

  onSessionRemoved: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string): void => {
      callback(sessionId)
    }
    ipcRenderer.on(IPC_CHANNELS.SESSION_REMOVED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_REMOVED, handler)
  },

  getSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSIONS),

  getStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATS),

  updateSettings: (settings) => ipcRenderer.send(IPC_CHANNELS.UPDATE_SETTINGS, settings),

  toggleFloating: () => ipcRenderer.send(IPC_CHANNELS.TOGGLE_WINDOW),

  onExpandedChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, expanded: boolean): void => {
      callback(expanded)
    }
    ipcRenderer.on('floating:expanded', handler)
    return () => ipcRenderer.removeListener('floating:expanded', handler)
  },

  onStatsUpdated: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, stats: DayStats[]): void => {
      callback(stats)
    }
    ipcRenderer.on(IPC_CHANNELS.STATS_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STATS_UPDATED, handler)
  },
}

contextBridge.exposeInMainWorld('claudePulse', api)
