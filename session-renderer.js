import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SessionPage } from './ui/session-page'
import './styles.css'

function SessionApp () {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  const runAction = useCallback(async (action) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const result = await window.sessionLab[action]()
      setState(result)
    } catch (error) {
      setError(error.message)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }, [])

  useEffect(() => { runAction('readCookie') }, [runAction])

  return createElement(SessionPage, { state, busy, error, onAction: runAction })
}

createRoot(document.getElementById('root')).render(createElement(SessionApp))
