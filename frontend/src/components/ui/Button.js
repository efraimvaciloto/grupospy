'use client'
import { motion } from 'framer-motion'

const variants = {
  primary:   'bg-accent-primary hover:bg-accent-secondary text-white shadow-glow',
  secondary: 'bg-bg-elevated border border-border hover:border-accent-primary text-text-primary',
  ghost:     'bg-transparent border border-border hover:bg-bg-elevated text-text-secondary hover:text-text-primary',
  danger:    'bg-danger hover:bg-red-600 text-white',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-sm',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconOnly = false,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer',
        variants[variant],
        sizes[size],
        iconOnly ? 'p-2' : '',
        (disabled || loading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </motion.button>
  )
}
