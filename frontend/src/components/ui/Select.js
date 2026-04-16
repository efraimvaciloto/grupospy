'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Select({ label, options = [], value, onChange, placeholder = 'Selecione...', error, className = '' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const openDropdown = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const close = (e) => {
      if (!triggerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`} onKeyDown={handleKeyDown}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        style={open ? { boxShadow: '0 0 0 3px var(--color-accent-glow)' } : undefined}
        className={[
          'w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-left',
          'bg-bg-secondary border transition-all duration-150 outline-none',
          open ? 'border-accent-primary' : 'border-border',
          error ? 'border-danger' : '',
        ].join(' ')}
      >
        <span className={selected ? 'text-text-primary' : 'text-text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}

      {open && typeof window !== 'undefined' && rect && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
            className="bg-bg-elevated border border-border rounded-lg shadow-elevated overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-bg-secondary border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-muted"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-text-muted">Nenhum resultado</li>
              ) : filtered.map(o => (
                <li
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  style={o.value === value ? { background: 'rgba(124,58,237,0.12)' } : undefined}
                  className={[
                    'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                    o.value === value ? 'text-accent-primary' : 'text-text-primary hover:bg-bg-secondary',
                  ].join(' ')}
                >
                  <span>{o.label}</span>
                  {o.value === value && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
