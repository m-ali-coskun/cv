import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useLang } from '@/i18n'
import {
  ChartLegend,
  ChartTooltip,
  SrTable,
  TooltipRow,
  TooltipTitle,
  clamp,
  compactNumber,
  labelStride,
  linearPath,
  monotonePath,
  niceTicks,
  seriesColor,
  useElementSize,
} from './shared'

export interface AreaSeries {
  id: string
  label: string
  data: number[]
  /** CSS colour (tokens welcome: `var(--accent)`). Defaults to the categorical order. */
  color?: string
  /** Draw only the line (no gradient wash) — handy for a comparison/"last period" series. */
  lineOnly?: boolean
  /** Dashed line for projections / previous period. */
  dashed?: boolean
}

export interface AreaChartProps {
  /** X-axis labels (one per data point). */
  labels: string[]
  series: AreaSeries[]
  height?: number
  /** Formats values in the tooltip (and the y-axis unless `formatAxis` is set). */
  format?: (v: number) => string
  /** Formats y-axis ticks (e.g. compact "€6k"). */
  formatAxis?: (v: number) => string
  /** Smooth monotone curve (default) or straight segments. */
  curve?: 'monotone' | 'linear'
  showYAxis?: boolean
  showGrid?: boolean
  /** Show a legend (defaults to true when there are ≥ 2 series). */
  legend?: boolean
  /** Start the y-axis at zero (default true). */
  zeroBased?: boolean
  /** Index of a point to mark permanently (e.g. "today"). */
  markIndex?: number
  /** Accessible name. */
  ariaLabel?: string
  className?: string
  /** Render something in the top-right of the plot (e.g. a total). */
  overlay?: ReactNode
  onPointClick?: (index: number) => void
}

const PAD = { top: 14, right: 12, bottom: 28 }

/**
 * Smooth, animated area chart.
 * – lines draw in (pathLength) while the gradient wash wipes in from the left
 * – data changes morph the curve in place
 * – crosshair snaps to the nearest x, one tooltip lists every series
 * – keyboard: focus the chart and use ← → to move the crosshair
 */
export function AreaChart({
  labels,
  series,
  height = 240,
  format,
  formatAxis,
  curve = 'monotone',
  showYAxis = true,
  showGrid = true,
  legend,
  zeroBased = true,
  markIndex,
  ariaLabel = 'Area chart',
  className,
  overlay,
  onPointClick,
}: AreaChartProps) {
  const lang = useLang()
  const uid = useId().replace(/[:«»]/g, '')
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)
  const fmt = format ?? ((v: number) => compactNumber(v, lang))
  const fmtAxis = formatAxis ?? fmt

  const n = Math.max(1, labels.length)
  const all = series.flatMap((s) => s.data)
  const { min, max, ticks } = useMemo(() => {
    const lo = all.length ? Math.min(...all) : 0
    const hi = all.length ? Math.max(...all) : 1
    return niceTicks(zeroBased ? Math.min(0, lo) : lo, hi, 4)
  }, [all.join(','), zeroBased])

  const yLabelW = showYAxis ? Math.max(...ticks.map((t) => fmtAxis(t).length)) * 6.6 + 12 : 4
  const left = yLabelW
  const plotW = Math.max(10, width - left - PAD.right)
  const plotH = Math.max(10, height - PAD.top - PAD.bottom)
  const x = (i: number) => left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH
  const baseY = y(Math.max(min, 0))

  const paths = useMemo(
    () =>
      series.map((s) => {
        const pts = s.data.map((v, i) => [x(i), y(v)] as [number, number])
        const line = curve === 'monotone' ? monotonePath(pts) : linearPath(pts)
        const area = pts.length ? `${line}L${pts[pts.length - 1][0]},${baseY}L${pts[0][0]},${baseY}Z` : ''
        return { line, area, pts }
      }),
    [series, width, height, min, max, curve, left],
  )

  const stride = labelStride(n, plotW)

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect()
    const px = e.clientX - r.left
    const i = n === 1 ? 0 : Math.round(((px - left) / plotW) * (n - 1))
    setHover(clamp(i, 0, n - 1))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setHover((h) => clamp((h ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1))
    } else if (e.key === 'Escape') setHover(null)
    else if (e.key === 'Enter' && hover !== null) onPointClick?.(hover)
  }

  const showLegend = legend ?? series.length > 1
  const tipY = hover !== null ? Math.min(...series.map((s) => y(s.data[hover] ?? 0))) : 0

  return (
    <div className={cn('relative w-full', className)}>
      {showLegend && (
        <ChartLegend
          className="mb-3"
          shape="line"
          active={activeSeries}
          onHover={setActiveSeries}
          items={series.map((s, i) => ({ id: s.id, label: s.label, color: seriesColor(i, s.color) }))}
        />
      )}
      <div
        ref={ref}
        className="relative w-full touch-pan-y select-none rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={ariaLabel}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {overlay && <div className="pointer-events-none absolute right-2 top-0 z-10">{overlay}</div>}
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={ariaLabel}>
            <title>{ariaLabel}</title>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.id} id={`${uid}-g${i}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" style={{ stopColor: seriesColor(i, s.color), stopOpacity: 0.32 }} />
                  <stop offset="70%" style={{ stopColor: seriesColor(i, s.color), stopOpacity: 0.06 }} />
                  <stop offset="100%" style={{ stopColor: seriesColor(i, s.color), stopOpacity: 0 }} />
                </linearGradient>
              ))}
              <clipPath id={`${uid}-clip`}>
                <motion.rect
                  x={0}
                  y={0}
                  height={height}
                  initial={{ width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 1.25, ease: EASE_OUT, delay: 0.1 }}
                />
              </clipPath>
            </defs>

            {/* grid + y labels */}
            {ticks.map((t, i) => (
              <g key={t}>
                {showGrid && (
                  <motion.line
                    x1={left}
                    x2={left + plotW}
                    y1={y(t)}
                    y2={y(t)}
                    style={{ stroke: 'var(--line-2)' }}
                    strokeWidth={1}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: t === 0 ? 1 : 0.7, pathLength: 1 }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: EASE_OUT }}
                  />
                )}
                {showYAxis && (
                  <text x={left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--ink-3)] font-mono text-[10.5px] tabular-nums">
                    {fmtAxis(t)}
                  </text>
                )}
              </g>
            ))}

            {/* x labels */}
            {labels.map((l, i) => {
              const isLast = i === n - 1
              const show = isLast || (i % stride === 0 && n - 1 - i >= stride * 0.7)
              if (!show) return null
              return (
                <text
                  key={i}
                  x={x(i)}
                  y={height - 8}
                  textAnchor={i === 0 && n > 1 ? 'start' : isLast && n > 1 ? 'end' : 'middle'}
                  className={cn('font-mono text-[10.5px] transition-[fill] duration-150', hover === i ? 'fill-[var(--ink)]' : 'fill-[var(--ink-3)]')}
                >
                  {l}
                </text>
              )
            })}

            {/* marked index */}
            {markIndex !== undefined && markIndex >= 0 && markIndex < n && (
              <line x1={x(markIndex)} x2={x(markIndex)} y1={PAD.top} y2={PAD.top + plotH} style={{ stroke: 'var(--ink-4)' }} strokeDasharray="2 4" strokeLinecap="round" />
            )}

            {/* areas (wiped in) */}
            <g clipPath={`url(#${uid}-clip)`}>
              {series.map((s, i) =>
                s.lineOnly ? null : (
                  <motion.path
                    key={s.id}
                    initial={false}
                    animate={{ d: paths[i].area, opacity: activeSeries && activeSeries !== s.id ? 0.25 : 1 }}
                    transition={{ type: 'spring', stiffness: 170, damping: 26 }}
                    style={{ fill: `url(#${uid}-g${i})` }}
                  />
                ),
              )}
            </g>

            {/* lines (drawn in) */}
            {series.map((s, i) => (
              <motion.path
                key={s.id}
                fill="none"
                strokeWidth={s.lineOnly ? 1.75 : 2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? '4 6' : undefined}
                style={{ stroke: seriesColor(i, s.color) }}
                initial={s.dashed ? { d: paths[i].line, opacity: 0 } : { pathLength: 0, d: paths[i].line, opacity: 1 }}
                animate={
                  s.dashed
                    ? { d: paths[i].line, opacity: activeSeries && activeSeries !== s.id ? 0.25 : 1 }
                    : { pathLength: 1, d: paths[i].line, opacity: activeSeries && activeSeries !== s.id ? 0.25 : 1 }
                }
                transition={{
                  pathLength: { duration: 1.3, ease: EASE_OUT, delay: 0.1 + i * 0.12 },
                  d: { type: 'spring', stiffness: 170, damping: 26 },
                  opacity: { duration: s.dashed ? 0.8 : 0.4, delay: s.dashed ? 0.6 : 0 },
                }}
              />
            ))}

            {/* last-point beacons */}
            {series.map((s, i) => {
              const last = paths[i].pts[paths[i].pts.length - 1]
              if (!last || s.lineOnly || hover !== null) return null
              return (
                <motion.g key={s.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 400, damping: 18 }}>
                  <circle cx={last[0]} cy={last[1]} r={4.5} strokeWidth={2} style={{ fill: seriesColor(i, s.color), stroke: 'var(--surface)' }} />
                </motion.g>
              )
            })}

            {/* crosshair + hover dots */}
            {hover !== null && (
              <g pointerEvents="none">
                <motion.line
                  initial={false}
                  animate={{ x1: x(hover), x2: x(hover) }}
                  transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                  y1={PAD.top - 4}
                  y2={PAD.top + plotH}
                  strokeWidth={1}
                  style={{ stroke: 'var(--ink-3)' }}
                />
                {series.map((s, i) =>
                  s.data[hover] === undefined ? null : (
                    <motion.circle
                      key={s.id}
                      r={5}
                      strokeWidth={2.5}
                      style={{ fill: seriesColor(i, s.color), stroke: 'var(--surface)' }}
                      initial={false}
                      animate={{ cx: x(hover), cy: y(s.data[hover]) }}
                      transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                    />
                  ),
                )}
              </g>
            )}

            {/* hit area */}
            <rect
              x={left - 6}
              y={0}
              width={plotW + 12}
              height={height}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
              onClick={() => hover !== null && onPointClick?.(hover)}
              style={{ cursor: onPointClick ? 'pointer' : 'crosshair' }}
            />
          </svg>
        )}

        <ChartTooltip open={hover !== null} x={hover !== null ? x(hover) : 0} y={clamp(tipY, 40, height - 40)} containerWidth={width}>
          {hover !== null && (
            <>
              <TooltipTitle>{labels[hover]}</TooltipTitle>
              {series.map((s, i) =>
                s.data[hover] === undefined ? null : (
                  <TooltipRow key={s.id} color={seriesColor(i, s.color)} value={fmt(s.data[hover])} label={series.length > 1 ? s.label : undefined} />
                ),
              )}
            </>
          )}
        </ChartTooltip>
      </div>
      <SrTable caption={ariaLabel} columns={['', ...series.map((s) => s.label)]} rows={labels.map((l, i) => [l, ...series.map((s) => fmt(s.data[i] ?? 0))])} />
    </div>
  )
}
