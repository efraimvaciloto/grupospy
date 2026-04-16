'use client'
import { motion, AnimatePresence } from 'framer-motion'

export default function Checkbox({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  indeterminate = false,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: { box: 16, icon: 10, text: 12 },
    md: { box: 18, icon: 11, text: 13 },
    lg: { box: 20, icon: 13, text: 14 },
  }
  const s = sizes[size] || sizes.md

  function toggle() {
    if (!disabled && onChange) onChange(!checked)
  }

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: label ? 'flex-start' : 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
      className={className}
    >
      {/* Hidden native checkbox for a11y */}
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Custom visual checkbox */}
      <motion.div
        onClick={toggle}
        whileTap={!disabled ? { scale: 0.9 } : {}}
        style={{
          width: s.box,
          height: s.box,
          borderRadius: 5,
          border: `2px solid ${checked || indeterminate ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
          background: checked || indeterminate ? 'var(--color-accent-primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: label ? 1 : 0,
          transition: 'border-color 150ms ease, background 150ms ease, box-shadow 150ms ease',
          boxShadow: checked || indeterminate ? '0 0 0 3px var(--color-accent-glow)' : 'none',
        }}
      >
        <AnimatePresence>
          {indeterminate && !checked ? (
            <motion.div
              key="dash"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                width: s.icon - 2,
                height: 2,
                background: '#fff',
                borderRadius: 1,
              }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, duration: 0.2 }}
              width={s.icon}
              height={s.icon}
              viewBox="0 0 12 12"
              fill="none"
            >
              <motion.path
                d="M2 6l3 3 5-5"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Label */}
      {label && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: s.text, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
            {label}
          </span>
          {description && (
            <span style={{ fontSize: s.text - 1, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  )
}
