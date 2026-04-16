'use client'
import { motion } from 'framer-motion'

const colorMap = {
  accent:  { on: 'var(--color-accent-primary)', glow: 'var(--color-accent-glow)' },
  success: { on: 'var(--color-success)',         glow: 'rgba(16,185,129,0.25)' },
  danger:  { on: 'var(--color-danger)',           glow: 'rgba(239,68,68,0.25)' },
}

export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  color = 'accent',
  className = '',
}) {
  const sizes = {
    sm: { track: [36, 20], thumb: 14, offset: [3, 17], text: 12 },
    md: { track: [44, 24], thumb: 18, offset: [3, 23], text: 13 },
    lg: { track: [52, 28], thumb: 22, offset: [3, 27], text: 14 },
  }
  const s = sizes[size] || sizes.md
  const c = colorMap[color] || colorMap.accent

  function toggle() {
    if (!disabled && onChange) onChange(!checked)
  }

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: label ? 'flex-start' : 'center',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
      className={className}
    >
      {/* Track */}
      <motion.div
        onClick={toggle}
        whileTap={!disabled ? { scale: 0.94 } : {}}
        style={{
          position: 'relative',
          width: s.track[0],
          height: s.track[1],
          borderRadius: s.track[1],
          background: checked ? c.on : 'var(--color-border)',
          flexShrink: 0,
          marginTop: label ? 2 : 0,
          transition: 'background 200ms ease, box-shadow 200ms ease',
          boxShadow: checked ? `0 0 0 3px ${c.glow}` : 'none',
        }}
      >
        {/* Thumb */}
        <motion.div
          animate={{ x: checked ? s.offset[1] : s.offset[0] }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute',
            top: '50%',
            translateY: '-50%',
            width: s.thumb,
            height: s.thumb,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
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
