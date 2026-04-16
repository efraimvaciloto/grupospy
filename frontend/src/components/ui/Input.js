'use client'
import { useState } from 'react'
import { IMaskInput } from 'react-imask'

const maskDefs = {
  phone:    { mask: '(00) 00000-0000' },
  cpf:      { mask: '000.000.000-00' },
  cnpj:     { mask: '00.000.000/0000-00' },
  cep:      { mask: '00000-000' },
  date:     { mask: '00/00/0000' },
  currency: { mask: Number, scale: 2, signed: false, thousandsSeparator: '.', radix: ',', prefix: 'R$ ' },
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  mask,
  className = '',
  ...props
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = Boolean(props.value || props.defaultValue)

  const baseClass = [
    'w-full bg-bg-secondary border rounded-md px-3 py-2.5 text-text-primary text-sm font-sans',
    'outline-none transition-all duration-150 placeholder:text-text-muted',
    leftIcon ? 'pl-9' : '',
    rightIcon ? 'pr-9' : '',
    error
      ? 'border-danger focus:border-danger focus:outline-none'
      : 'border-border focus:border-accent-primary focus:outline-none',
    className,
  ].join(' ')

  return (
    <div className="relative flex flex-col gap-1">
      {label && (
        <label
          className={[
            'text-xs font-medium transition-colors duration-150',
            focused ? 'text-accent-primary' : 'text-text-secondary',
          ].join(' ')}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{leftIcon}</span>
        )}
        {mask && maskDefs[mask] ? (
          <IMaskInput
            {...maskDefs[mask]}
            className={baseClass}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={focused ? {
              boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.25)' : '0 0 0 3px var(--color-accent-glow)'
            } : undefined}
            {...props}
          />
        ) : (
          <input
            className={baseClass}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={focused ? {
              boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.25)' : '0 0 0 3px var(--color-accent-glow)'
            } : undefined}
            {...props}
          />
        )}
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
