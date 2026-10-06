const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('sessionLab', {
  readCookie: () => ipcRenderer.invoke('session-lab:read'),
  writeCookie: () => ipcRenderer.invoke('session-lab:write'),
  removeCookie: () => ipcRenderer.invoke('session-lab:remove')
})
