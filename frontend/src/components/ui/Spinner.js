'use client'

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-9 h-9' }

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <svg
      className={['animate-spin', sizes[size], className].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="var(--color-accent-primary)"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="var(--color-accent-primary)"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}
