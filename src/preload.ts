import { contextBridge, ipcRenderer } from 'electron';

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // System
  systemCheck: () => ipcRenderer.invoke('system:check'),

  // Snapshots
  snapshotsList: (target: string) => ipcRenderer.invoke('snapshots:list', { target }),
  snapshotsCreate: (rootTarget: string, homeTarget: string, prefix: string) => 
    ipcRenderer.invoke('snapshots:create', { rootTarget, homeTarget, prefix }),
  snapshotsRestore: (rootSnapshotPath: string) => 
    ipcRenderer.invoke('snapshots:restore', { rootSnapshotPath }),
  snapshotsDelete: (snapshotPath: string) => 
    ipcRenderer.invoke('snapshots:delete', { snapshotPath }),

  // Config
  configGet: () => ipcRenderer.invoke('config:get'),
  configSet: (config: unknown) => ipcRenderer.invoke('config:set', config),
  configReset: () => ipcRenderer.invoke('config:reset'),

  // Timers
  timersEnable: (schedule: string, retention: unknown, rootTarget: string, homeTarget: string, prefix: string) => 
    ipcRenderer.invoke('timers:enable', { schedule, retention, rootTarget, homeTarget, prefix }),
  timersDisable: () => ipcRenderer.invoke('timers:disable'),
  timersStatus: () => ipcRenderer.invoke('timers:status'),

  // Logs
  logsGet: () => ipcRenderer.invoke('logs:get'),
  logsClear: () => ipcRenderer.invoke('logs:clear'),
});
