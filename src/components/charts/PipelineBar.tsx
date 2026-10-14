import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useLang } from '@/i18n'
import { formatNumber } from '@/lib/format'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

export interface PipelineSegment {
  id: string
  label: string
  count: number
  /** Override the segment fill. */
  color?: string
}

export interface PipelineBarProps {
  segments: PipelineSegment[]
  /** Segment painted in the accent colour (reference: the lime "Permit" stage). */
  highlightId?: string
  /** Paint the last segment ink/black like the reference ("PTO"). Default true. */
  darkLast?: boolean
  /** Currently selected segment (e.g. an active filter) — gets a ring. */
  activeId?: string | null
  onSegmentClick?: (id: string) => void
  height?: number
  /** Optional header row (reference: "Project pipeline · Average approval 8.4 days · Open ›"). */
  title?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  /** Show the share percentage under each label. */
  showPercent?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * The reference's "Project pipeline": one horizontal row of rounded segments
 * sized by their counts, separated by gaps, with the count and stage label
 * underneath. Segments grow in from the left with a springy stagger and
 * re-flow smoothly when counts change. Each segment is a button.
 */
export function PipelineBar({
  segments,
  highlightId,
  darkLast = true,
  activeId,
  onSegmentClick,
  height = 30,
  title,
  meta,
  action,
  showPercent = false,
  className,
  ariaLabel = 'Pipeline',
}: PipelineBarProps) {
  const lang = useLang()
  const [hover, setHover] = useState<string | null>(null)
  const total = segments.reduce((a, s) => a + Math.max(0, s.count), 0)

  const fillFor = (s: PipelineSegment, i: number) => {
    if (s.color) return { bg: s.color, text: 'var(--ink)' }
    if (s.id === highlightId) return { bg: 'var(--accent)', text: 'var(--accent-ink)' }
    if (darkLast && i === segments.length - 1) return { bg: 'var(--ink)', text: 'var(--surface)' }
    return { bg: 'var(--surface-3)', text: 'var(--ink-2)' }
  }

  return (
    <div className={cn('w-full', className)}>
      {(title || meta || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {title && <h4 className="text-[15px] font-medium tracking-[-0.01em] text-ink">{title}</h4>}
          <div className="flex items-center gap-3 text-[12.5px] text-ink-3">
            {meta}
            {action}
          </div>
        </div>
      )}
      <div role="list" aria-label={ariaLabel} className="flex w-full items-start gap-1.5">
        {segments.map((s, i) => {
          const share = total ? s.count / total : 1 / segments.length
          const { bg } = fillFor(s, i)
          const isHover = hover === s.id
          const isActive = activeId === s.id
          const dim = (hover && !isHover) || (activeId && !isActive && !hover)
          return (
            <div
              role="listitem"
              key={s.id}
              className="min-w-[46px] transition-[flex-grow] duration-700 ease-[var(--ease-out)]"
              style={{ flexGrow: Math.max(share * 100, 0.0001), flexBasis: 0 }}
            >
              <motion.button
                type="button"
                onClick={() => onSegmentClick?.(s.id)}
                onPointerEnter={() => setHover(s.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(s.id)}
                onBlur={() => setHover(null)}
                aria-label={`${s.label}: ${s.count} (${Math.round(share * 100)}%)`}
                aria-pressed={isActive || undefined}
                className={cn('group relative block w-full text-left outline-none', !onSegmentClick && 'cursor-default')}
                whileTap={onSegmentClick ? { scale: 0.97 } : undefined}
              >
                <span className="relative block w-full" style={{ height }}>
                  <motion.span
                    className={cn(
                      'absolute inset-0 origin-left overflow-hidden rounded-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,.35)] transition-[box-shadow,filter] duration-200',
                      isActive && 'ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--surface)]',
                      'group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent)]',
                    )}
                    style={{ background: bg }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: dim ? 0.55 : 1, y: isHover ? -3 : 0 }}
                    transition={{
                      scaleX: { type: 'spring', stiffness: 140, damping: 18, delay: 0.1 + i * 0.09 },
                      opacity: { duration: 0.2 },
                      y: { type: 'spring', stiffness: 500, damping: 26 },
                    }}
                  >
                    {/* liquid sheen sweeping across on hover */}
                    <span
                      className={cn(
                        'pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)] opacity-0 transition-[transform,opacity] duration-700',
                        isHover && 'translate-x-[300%] opacity-100',
                      )}
                    />
                  </motion.span>
                  <AnimatePresence>
                    {isHover && (
                      <motion.span
                        className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--surface)] shadow-lg"
                        initial={{ opacity: 0, y: 6, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.9, transition: { duration: 0.12 } }}
                        transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                      >
                        {Math.round(share * 100)}%
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <motion.span
                  className="mt-2.5 block min-w-0"
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: dim ? 0.5 : 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.25 + i * 0.09, duration: 0.5, ease: EASE_OUT }}
                >
                  <span className="block text-[17px] font-medium leading-tight tracking-[-0.02em] text-ink">
                    <AnimatedCounter value={s.count} />
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-3">{s.label}</span>
                  {showPercent && (
                    <span className="block font-mono text-[10.5px] text-ink-4">{formatNumber(share * 100, lang, { maximumFractionDigits: 0 })}%</span>
                  )}
                </motion.span>
              </motion.button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
