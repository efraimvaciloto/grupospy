'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'system', setTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system')

  function applyTheme(t) {
    const root = document.documentElement
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', t)
    }
  }

  function setTheme(t) {
    setThemeState(t)
    localStorage.setItem('gs_theme', t)
    applyTheme(t)
  }

  useEffect(() => {
    const saved = localStorage.getItem('gs_theme') || 'system'
    setThemeState(saved)
    applyTheme(saved)

    // Listen for system preference changes when in 'system' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onSystemChange() {
      const current = localStorage.getItem('gs_theme') || 'system'
      if (current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
