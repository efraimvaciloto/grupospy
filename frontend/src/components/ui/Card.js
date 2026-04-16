'use client'

const variantStyles = {
  default:  'bg-bg-secondary border border-border shadow-card',
  elevated: 'bg-bg-elevated border border-border shadow-elevated',
  bordered: 'bg-transparent border border-border',
  glass:    'bg-white/5 backdrop-blur-md border border-white/10',
}

export default function Card({ children, variant = 'default', header, footer, className = '', ...props }) {
  return (
    <div
      className={['rounded-lg overflow-hidden', variantStyles[variant], className].join(' ')}
      {...props}
    >
      {header && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  )
}
