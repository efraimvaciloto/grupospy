'use client'
import Button from './Button'

export default function EmptyState({ icon, title, description, ctaLabel, onCta, className = '' }) {
  return (
    <div className={['flex flex-col items-center justify-center py-16 px-6 text-center gap-4', className].join(' ')}>
      {icon && (
        <div className="w-14 h-14 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary text-2xl">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {description && <p className="text-sm text-text-secondary max-w-xs">{description}</p>}
      </div>
      {ctaLabel && onCta && (
        <Button variant="primary" size="sm" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
