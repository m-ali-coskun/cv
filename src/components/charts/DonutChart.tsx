import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT, FILTER_TWEEN } from '@/lib/motion'
import { useLang } from '@/i18n'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { SrTable, compactNumber, seriesColor } from './shared'

export interface DonutDatum {
  id: string
  label: string
  value: number
  color?: string
}

export interface DonutChartProps {
  data: DonutDatum[]
  /** Diameter in px (the chart scales down to fit narrow containers). */
  size?: number
  thickness?: number
  /** Gap between segments, in degrees (visible gap after round caps). */
  gap?: number
  /** Replace the centre content entirely. */
  center?: ReactNode
  /** Default centre caption under the total. */
  centerLabel?: ReactNode
  format?: (v: number) => string
  /** Legend placement. */
  legend?: 'right' | 'bottom' | false
  /** Show percentages in the legend. */
  showPercent?: boolean
  /** Controlled active segment. */
  activeId?: string | null
  onSegmentClick?: (id: string) => void
  ariaLabel?: string
  className?: string
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const [x0, y0] = polar(cx, cy, r, start)
  const [x1, y1] = polar(cx, cy, r, end)
  const large = end - start > 180 ? 1 : 0
  return `M${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}`
}

/**
 * Donut with gapped, round-capped segments that sweep in one after another.
 * Hovering a segment (or its legend row) thickens it, dims the rest and swaps
 * the centre readout to that segment.
 */
export function DonutChart({
  data,
  size = 200,
  thickness = 22,
  gap = 3,
  center,
  centerLabel,
  format,
  legend = 'bottom',
  showPercent = true,
  activeId,
  onSegmentClick,
  ariaLabel = 'Donut chart',
  className,
}: DonutChartProps) {
  const lang = useLang()
  const uid = useId().replace(/[:«»]/g, '')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const active = activeId !== undefined && activeId !== null ? activeId : hoverId
  const fmt = format ?? ((v: number) => compactNumber(v, lang))
  const total = data.reduce((a, d) => a + Math.max(0, d.value), 0)
  const pad = 8
  const r = size / 2 - thickness / 2 - pad
  const c = size / 2
  const capDeg = ((thickness / 2) / r) * (180 / Math.PI)
  const visible = data.filter((d) => d.value > 0)
  const single = visible.length === 1

  let cursor = 0
  const segs = data.map((d, i) => {
    const span = total > 0 ? (Math.max(0, d.value) / total) * 360 : 0
    const start = cursor
    cursor += span
    const inset = single ? 0 : gap / 2 + capDeg
    let s = start + inset
    let e = start + span - inset
    if (e <= s) {
      const mid = start + span / 2
      s = mid - 0.01
      e = mid + 0.01
    }
    if (single) {
      s = 0
      e = 359.99
    }
    return { ...d, color: seriesColor(i, d.color), start: s, end: e, span, pct: total ? (d.value / total) * 100 : 0 }
  })
  const activeSeg = segs.find((s) => s.id === active)

  const legendEl = legend ? (
    <ul className={cn('min-w-0 space-y-0.5', legend === 'bottom' ? 'mt-4 w-full' : 'w-full flex-1')}>
      {segs.map((s, i) => (
        <motion.li
          key={s.id}
          initial={{ opacity: 0, x: legend === 'right' ? 10 : 0, y: legend === 'bottom' ? 6 : 0 }}
          animate={{ opacity: active && active !== s.id ? 0.4 : 1, x: 0, y: 0 }}
          transition={{ delay: 0.3 + i * 0.06, duration: 0.45, ease: EASE_OUT }}
        >
          <button
            type="button"
            onPointerEnter={() => setHoverId(s.id)}
            onPointerLeave={() => setHoverId(null)}
            onFocus={() => setHoverId(s.id)}
            onBlur={() => setHoverId(null)}
            onClick={() => onSegmentClick?.(s.id)}
            className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[12.5px] transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
            <span className="font-mono text-[12px] tabular-nums text-ink">{fmt(s.value)}</span>
            {showPercent && <span className="w-9 text-right font-mono text-[11px] tabular-nums text-ink-3">{Math.round(s.pct)}%</span>}
          </button>
        </motion.li>
      ))}
    </ul>
  ) : null

  return (
    <div className={cn(legend === 'right' ? 'flex flex-col items-center gap-5 sm:flex-row' : 'flex flex-col items-stretch', className)}>
      <div className="relative mx-auto aspect-square w-full shrink-0" style={{ maxWidth: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="block size-full overflow-visible" role="img" aria-label={ariaLabel}>
          <title>{ariaLabel}</title>
          <defs>
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          {/* track */}
          <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} style={{ stroke: 'var(--surface-2)' }} />
          {/* active glow */}
          {activeSeg && (
            <path
              d={arcPath(c, c, r, activeSeg.start, activeSeg.end)}
              fill="none"
              strokeWidth={thickness}
              strokeLinecap="round"
              filter={`url(#${uid}-glow)`}
              style={{ stroke: activeSeg.color, opacity: 0.45 }}
            />
          )}
          {segs.map((s, i) =>
            s.value <= 0 ? null : (
              <motion.path
                key={s.id}
                d={arcPath(c, c, r, s.start, s.end)}
                fill="none"
                strokeLinecap={single ? 'butt' : 'round'}
                style={{ stroke: s.color, cursor: onSegmentClick ? 'pointer' : 'default' }}
                initial={{ pathLength: 0, strokeWidth: thickness }}
                animate={{
                  pathLength: 1,
                  strokeWidth: active === s.id ? thickness + 7 : thickness,
                  opacity: active && active !== s.id ? 0.35 : 1,
                }}
                transition={{
                  pathLength: { duration: 0.75, ease: EASE_OUT, delay: 0.1 + (s.start / 360) * 0.9 },
                  strokeWidth: { type: 'spring', stiffness: 420, damping: 22 },
                  opacity: { duration: 0.2 },
                }}
                onPointerEnter={() => setHoverId(s.id)}
                onPointerLeave={() => setHoverId(null)}
                onClick={() => onSegmentClick?.(s.id)}
                aria-label={`${s.label}: ${fmt(s.value)}`}
                data-index={i}
              />
            ),
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center ?? (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activeSeg?.id ?? 'total'}
                initial={{ opacity: 0, y: 8, filter: 'blur(6px)', scale: 0.92 }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, y: -8, filter: 'blur(6px)', scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30, filter: FILTER_TWEEN }}
                className="flex flex-col items-center px-4"
              >
                {activeSeg ? (
                  <>
                    <span className="text-[clamp(20px,4vw,28px)] font-medium leading-none tracking-[-0.03em]">{fmt(activeSeg.value)}</span>
                    <span className="mt-1.5 max-w-[9rem] truncate text-[12px] text-ink-3">
                      {activeSeg.label} · {Math.round(activeSeg.pct)}%
                    </span>
                  </>
                ) : (
                  <>
                    {format ? (
                      <span className="text-[clamp(20px,4vw,28px)] font-medium leading-none tracking-[-0.03em]">{fmt(total)}</span>
                    ) : (
                      <AnimatedCounter value={total} className="text-[clamp(22px,4.4vw,30px)] font-medium tracking-[-0.03em]" />
                    )}
                    {centerLabel && <span className="mt-1.5 text-[12px] text-ink-3">{centerLabel}</span>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
      {legendEl}
      <SrTable caption={ariaLabel} columns={['', 'Value', '%']} rows={segs.map((s) => [s.label, fmt(s.value), `${Math.round(s.pct)}%`])} />
    </div>
  )
}
