const counter = document.getElementById('counter')

function handleUpdateCounter (value) {
  const oldValue = Number(counter.innerText)
  const newValue = oldValue + value
  counter.innerText = newValue.toString()
  window.electronAPI.counterValue(newValue)
}

window.electronAPI.onUpdateCounter(handleUpdateCounter)
