import { createElement, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CounterPage } from './ui/counter-page'
import './styles.css'

function CounterApp () {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let currentValue = 0
    function handleUpdateCounter (delta) {
      const oldValue = currentValue
      const newValue = oldValue + delta
      currentValue = newValue
      setValue(newValue)
      window.electronAPI.counterValue(newValue)
    }
    return window.electronAPI.onUpdateCounter(handleUpdateCounter)
  }, [])

  return createElement(CounterPage, { value })
}

createRoot(document.getElementById('root')).render(createElement(CounterApp))
