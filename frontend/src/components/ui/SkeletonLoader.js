'use client'

export default function Skeleton({ width = '100%', height = '16px', rounded = 'md', className = '' }) {
  const radius = { sm: '6px', md: '10px', lg: '16px', full: '9999px' }
  return (
    <span
      className={['skeleton block', className].join(' ')}
      style={{ width, height, borderRadius: radius[rounded] ?? rounded }}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={['flex flex-col gap-2', className].join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="14px" />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={['bg-bg-secondary border border-border rounded-lg p-5 flex flex-col gap-3', className].join(' ')}>
      <div className="flex items-center gap-3">
        <Skeleton width="36px" height="36px" rounded="full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton height="12px" width="40%" />
          <Skeleton height="10px" width="60%" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}
