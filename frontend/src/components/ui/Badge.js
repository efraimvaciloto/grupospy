'use client'

const bgStyles = {
  success: { background: 'rgba(16,185,129,0.15)',  color: 'var(--color-success)' },
  warning: { background: 'rgba(245,158,11,0.15)',  color: 'var(--color-warning)' },
  danger:  { background: 'rgba(239,68,68,0.15)',   color: 'var(--color-danger)' },
  info:    { background: 'rgba(59,130,246,0.15)',   color: 'var(--color-info)' },
  neutral: { background: 'rgba(74,74,106,0.20)',   color: 'var(--color-text-secondary)' },
}

const dotBgStyles = {
  success: { background: 'var(--color-success)' },
  warning: { background: 'var(--color-warning)' },
  danger:  { background: 'var(--color-danger)' },
  info:    { background: 'var(--color-info)' },
  neutral: { background: 'var(--color-text-muted)' },
}

export default function Badge({ children, variant = 'neutral', animated = false, className = '' }) {
  return (
    <span
      className={['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', className].join(' ')}
      style={bgStyles[variant] || bgStyles.neutral}
    >
      {animated && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={dotBgStyles[variant] || dotBgStyles.neutral}
        />
      )}
      {children}
    </span>
  )
}
