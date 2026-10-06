const { contextBridge, ipcRenderer } = require('electron/renderer')

function onUpdateCounter (callback) {
  const listener = (_event, value) => {
    callback(value)
  }
  ipcRenderer.on('update-counter', listener)
  return () => ipcRenderer.removeListener('update-counter', listener)
}

function sendCounterValue (value) {
  ipcRenderer.send('counter-value', value)
}

function closeSettings () {
  ipcRenderer.send('settings:close')
}

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateCounter,
  counterValue: sendCounterValue,
  closeSettings
})
