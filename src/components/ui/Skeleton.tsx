import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'

/**
 * Loading placeholders with a soft liquid shimmer. They follow the theme
 * (surface tokens) and stop shimmering when motion is off (global CSS rule).
 *
 *   <Skeleton className="h-6 w-40" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 */
export function Skeleton({ className, style, rounded = 'lg' }: { className?: string; style?: CSSProperties; rounded?: 'sm' | 'lg' | 'xl' | 'full' }) {
  const r = { sm: 'rounded-md', lg: 'rounded-xl', xl: 'rounded-[22px]', full: 'rounded-full' }[rounded]
  return (
    <span
      aria-hidden
      className={cn(
        'relative block overflow-hidden bg-[var(--surface-2)]',
        'after:absolute after:inset-0 after:animate-shimmer after:bg-[linear-gradient(100deg,transparent_25%,color-mix(in_oklab,var(--surface)_80%,transparent)_45%,color-mix(in_oklab,var(--accent)_10%,transparent)_55%,transparent_75%)] after:bg-[length:200%_100%]',
        r,
        className,
      )}
      style={style}
    />
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} rounded="full" className="h-3" style={{ width: i === lines - 1 && lines > 1 ? '58%' : `${96 - i * 6}%` }} />
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton rounded="full" className={cn('shrink-0', className)} style={{ width: size, height: size }} />
}

/** Media card placeholder (cover + title + meta row). */
export function SkeletonCard({ className, media = true }: { className?: string; media?: boolean }) {
  const t = useT()
  return (
    <div className={cn('card p-4', className)} role="status" aria-busy aria-label={t('core.common.loading')}>
      {media && <Skeleton rounded="xl" className="mb-4 aspect-[4/3] w-full" />}
      <div className="flex items-center gap-3">
        <SkeletonCircle size={36} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton rounded="full" className="h-3.5 w-2/3" />
          <Skeleton rounded="full" className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} className="mt-4" />
    </div>
  )
}

/** Table/list placeholder: avatar + two lines + trailing pill, `rows` times. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  const t = useT()
  return (
    <div className={cn('divide-y divide-[var(--line)]', className)} role="status" aria-busy aria-label={t('core.common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3" style={{ opacity: 1 - i * (0.6 / rows) }}>
          <SkeletonCircle size={34} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton rounded="full" className="h-3 w-1/2" />
            <Skeleton rounded="full" className="h-2.5 w-1/4" />
          </div>
          <Skeleton rounded="full" className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}
