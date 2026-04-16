'use client'

const sizes = {
  sm: { outer: 'w-7 h-7', text: 'text-xs', dot: 'w-2 h-2' },
  md: { outer: 'w-9 h-9', text: 'text-sm', dot: 'w-2.5 h-2.5' },
  lg: { outer: 'w-12 h-12', text: 'text-base', dot: 'w-3 h-3' },
}

const statusColors = {
  online:  'bg-success',
  offline: 'bg-text-muted',
  busy:    'bg-danger',
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function Avatar({ src, name, size = 'md', status, className = '' }) {
  const s = sizes[size]
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${s.outer} rounded-full object-cover bg-bg-elevated`}
        />
      ) : (
        <div className={`${s.outer} ${s.text} rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-semibold`}>
          {initials(name)}
        </div>
      )}
      {status && (
        <span
          className={[
            `${s.dot} absolute bottom-0 right-0 rounded-full border-2 border-bg-primary`,
            statusColors[status],
          ].join(' ')}
        />
      )}
    </div>
  )
}
