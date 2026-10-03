const { contextBridge, ipcRenderer } = require('electron/renderer')

function onUpdateCounter (callback) {
  ipcRenderer.on('update-counter', (_event, value) => {
    callback(value)
  })
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
