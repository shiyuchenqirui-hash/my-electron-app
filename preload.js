const { contextBridge, ipcRenderer } = require('electron/renderer')

function onUpdateCounter (callback) {
  ipcRenderer.on('update-counter', (_event, value) => {
    callback(value)
  })
}

function sendCounterValue (value) {
  ipcRenderer.send('counter-value', value)
}

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateCounter,
  counterValue: sendCounterValue
})
