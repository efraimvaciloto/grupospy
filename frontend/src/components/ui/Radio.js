'use client'
import { motion, AnimatePresence } from 'framer-motion'

function RadioOption({ option, checked, onChange, disabled, size = 'md' }) {
  const sizes = {
    sm: { outer: 16, inner: 6, text: 12 },
    md: { outer: 18, inner: 7, text: 13 },
    lg: { outer: 20, inner: 8, text: 14 },
  }
  const s = sizes[size] || sizes.md

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: option.description ? 'flex-start' : 'center',
        gap: 10,
        cursor: disabled || option.disabled ? 'not-allowed' : 'pointer',
        opacity: disabled || option.disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <input
        type="radio"
        checked={checked}
        onChange={() => onChange && onChange(option.value)}
        disabled={disabled || option.disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Custom radio dot */}
      <motion.div
        onClick={() => !disabled && !option.disabled && onChange && onChange(option.value)}
        whileTap={!disabled && !option.disabled ? { scale: 0.88 } : {}}
        style={{
          width: s.outer,
          height: s.outer,
          borderRadius: '50%',
          border: `2px solid ${checked ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: option.description ? 1 : 0,
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          boxShadow: checked ? '0 0 0 3px var(--color-accent-glow)' : 'none',
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              key="dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                width: s.inner,
                height: s.inner,
                borderRadius: '50%',
                background: 'var(--color-accent-primary)',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Label */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: s.text, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
          {option.label}
        </span>
        {option.description && (
          <span style={{ fontSize: s.text - 1, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            {option.description}
          </span>
        )}
      </div>
    </label>
  )
}

export default function Radio({
  options = [],
  value,
  onChange,
  label,
  disabled = false,
  direction = 'vertical',
  size = 'md',
  className = '',
}) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
          {label}
        </span>
      )}
      <div style={{
        display: 'flex',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap: direction === 'horizontal' ? 20 : 10,
        flexWrap: direction === 'horizontal' ? 'wrap' : 'nowrap',
      }}>
        {options.map(opt => (
          <RadioOption
            key={opt.value}
            option={opt}
            checked={value === opt.value}
            onChange={onChange}
            disabled={disabled}
            size={size}
          />
        ))}
      </div>
    </div>
  )
}
