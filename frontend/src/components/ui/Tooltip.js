'use client'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

export default function Tooltip({ children, content, delay = 300, placement = 'top' }) {
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState(null)
  const timer = useRef(null)
  const ref = useRef(null)

  const show = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect())
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setVisible(false)
  }

  const getStyle = () => {
    if (!rect) return {}
    const gap = 8
    if (placement === 'top') return { bottom: window.innerHeight - rect.top + gap, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
    if (placement === 'bottom') return { top: rect.bottom + gap, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
    if (placement === 'left') return { top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + gap, transform: 'translateY(-50%)' }
    return { top: rect.top + rect.height / 2, left: rect.right + gap, transform: 'translateY(-50%)' }
  }

  if (typeof window === 'undefined') return <>{children}</>

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
        {children}
      </span>
      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{ position: 'fixed', zIndex: 10000, pointerEvents: 'none', ...getStyle() }}
              className="bg-bg-elevated border border-border text-text-primary text-xs rounded-md px-2.5 py-1.5 shadow-elevated whitespace-nowrap"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
