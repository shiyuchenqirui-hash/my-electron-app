const closeButton = document.getElementById('close-settings')

closeButton.addEventListener('click', () => {
  window.electronAPI.closeSettings()
})
