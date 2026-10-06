import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsPage } from './ui/settings-page'
import './styles.css'

function handleCloseSettings () {
  window.electronAPI.closeSettings()
}

createRoot(document.getElementById('root')).render(createElement(SettingsPage, {
  onClose: handleCloseSettings,
  isNavigationTarget: window.location.pathname.endsWith('/navigation-target.html')
}))
