import { useMemo, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
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
  niceTicks,
  roundedTopBar,
  seriesColor,
  useElementSize,
} from './shared'

export interface BarSeries {
  id: string
  label: string
  data: number[]
  color?: string
}

export interface BarChartProps {
  labels: string[]
  series: BarSeries[]
  /** grouped = side by side · stacked = segments on top of each other (2px surface gaps). */
  mode?: 'grouped' | 'stacked'
  height?: number
  format?: (v: number) => string
  /** Formats y-axis ticks (defaults to `format`). */
  formatAxis?: (v: number) => string
  /** Single-series only: per-bar colour overrides. */
  barColors?: (string | undefined)[]
  /** Emphasise one category: it keeps its colour, the others go neutral. */
  highlightIndex?: number
  /** Cap for a bar's thickness in px. */
  maxBarWidth?: number
  /** Corner radius of the data-end. */
  radius?: number
  showYAxis?: boolean
  showGrid?: boolean
  /** Print the value on each column cap. */
  showValues?: boolean
  legend?: boolean
  ariaLabel?: string
  className?: string
  onBarClick?: (index: number, seriesId: string) => void
}

const PAD = { top: 18, right: 6, bottom: 28 }
const GAP = 2

/**
 * Vertical bar chart (grouped or stacked). Columns spring up from the
 * baseline with a stagger, data changes morph in place; hovering a column
 * lifts it, dims the rest and shows one tooltip with every series.
 */
export function BarChart({
  labels,
  series,
  mode = 'grouped',
  height = 240,
  format,
  formatAxis,
  barColors,
  highlightIndex,
  maxBarWidth = 28,
  radius = 7,
  showYAxis = true,
  showGrid = true,
  showValues = false,
  legend,
  ariaLabel = 'Bar chart',
  className,
  onBarClick,
}: BarChartProps) {
  const lang = useLang()
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)
  const fmt = format ?? ((v: number) => compactNumber(v, lang))
  const fmtAxis = formatAxis ?? fmt
  const n = Math.max(1, labels.length)
  const stacked = mode === 'stacked' && series.length > 1

  const { max, ticks } = useMemo(() => {
    const totals = labels.map((_, i) =>
      stacked ? series.reduce((a, s) => a + Math.max(0, s.data[i] ?? 0), 0) : Math.max(0, ...series.map((s) => s.data[i] ?? 0)),
    )
    return niceTicks(0, Math.max(1, ...totals), 4)
  }, [labels, series, stacked])

  const yLabelW = showYAxis ? Math.max(...ticks.map((t) => fmtAxis(t).length)) * 6.6 + 12 : 2
  const left = yLabelW
  const plotW = Math.max(10, width - left - PAD.right)
  const plotH = Math.max(10, height - PAD.top - PAD.bottom)
  const band = plotW / n
  const y = (v: number) => PAD.top + plotH - (v / (max || 1)) * plotH
  const baseY = PAD.top + plotH
  const groupCount = stacked ? 1 : series.length
  const innerGap = groupCount > 1 ? 3 : 0
  const barW = Math.max(3, Math.min(maxBarWidth, (band * 0.62 - innerGap * (groupCount - 1)) / groupCount))
  const groupW = barW * groupCount + innerGap * (groupCount - 1)
  const stride = labelStride(n, plotW, 40)

  const colorFor = (si: number, i: number) => {
    const base = series.length === 1 && barColors?.[i] ? barColors[i]! : seriesColor(si, series[si].color)
    if (highlightIndex !== undefined && highlightIndex !== i && hover !== i) return 'var(--surface-3)'
    return base
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setHover((h) => clamp((h ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1))
    } else if (e.key === 'Escape') setHover(null)
    else if (e.key === 'Enter' && hover !== null) onBarClick?.(hover, series[0]?.id)
  }

  const showLegend = legend ?? series.length > 1
  const hoverTotal = hover !== null ? series.reduce((a, s) => a + (s.data[hover] ?? 0), 0) : 0
  const tipY = hover !== null ? (stacked ? y(hoverTotal) : y(Math.max(...series.map((s) => s.data[hover] ?? 0)))) : 0

  return (
    <div className={cn('relative w-full', className)}>
      {showLegend && (
        <ChartLegend
          className="mb-3"
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
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={ariaLabel}>
            <title>{ariaLabel}</title>
            {ticks.map((t) => (
              <g key={t}>
                {showGrid && <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} strokeWidth={1} style={{ stroke: t === 0 ? 'var(--line-2)' : 'var(--line)' }} />}
                {showYAxis && (
                  <text x={left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--ink-3)] font-mono text-[10.5px] tabular-nums">
                    {fmtAxis(t)}
                  </text>
                )}
              </g>
            ))}

            {labels.map((l, i) => {
              const cx = left + band * i + band / 2
              const x0 = cx - groupW / 2
              let acc = 0
              const dim = (hover !== null && hover !== i) || false
              return (
                <g key={i}>
                  {/* hover band */}
                  <motion.rect
                    x={left + band * i + 2}
                    y={PAD.top - 8}
                    width={Math.max(0, band - 4)}
                    height={plotH + 8}
                    rx={10}
                    style={{ fill: 'var(--surface-2)' }}
                    initial={false}
                    animate={{ opacity: hover === i ? 1 : 0 }}
                    transition={{ duration: 0.18 }}
                  />
                  <motion.g
                    style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: dim ? 0.45 : 1 }}
                    transition={{
                      scaleY: { type: 'spring', stiffness: 160, damping: 17, delay: 0.08 + i * 0.045 },
                      opacity: { duration: 0.2 },
                    }}
                  >
                    {series.map((s, si) => {
                      const v = Math.max(0, s.data[i] ?? 0)
                      let bx: number
                      let by: number
                      let bh: number
                      let r = radius
                      if (stacked) {
                        const top = y(acc + v)
                        const bottom = y(acc)
                        acc += v
                        bx = x0
                        by = top
                        bh = Math.max(0, bottom - top - (si > 0 ? GAP : 0))
                        const isTop = series.slice(si + 1).every((o) => !(o.data[i] > 0))
                        r = isTop ? radius : 0
                      } else {
                        bx = x0 + si * (barW + innerGap)
                        by = y(v)
                        bh = baseY - by
                      }
                      const faded = activeSeries && activeSeries !== s.id
                      return (
                        <motion.path
                          key={s.id}
                          initial={false}
                          animate={{ d: roundedTopBar(bx, by, barW, Math.max(bh, v > 0 ? 1.5 : 0), r), opacity: faded ? 0.2 : 1 }}
                          transition={{ d: { type: 'spring', stiffness: 200, damping: 24 }, opacity: { duration: 0.25 } }}
                          style={{ fill: colorFor(si, i) }}
                          className="transition-[fill] duration-300"
                        />
                      )
                    })}
                  </motion.g>
                  {showValues && (
                    <motion.text
                      x={cx}
                      y={(stacked ? y(series.reduce((a, s) => a + Math.max(0, s.data[i] ?? 0), 0)) : y(Math.max(...series.map((s) => s.data[i] ?? 0)))) - 7}
                      textAnchor="middle"
                      className="fill-[var(--ink-2)] font-mono text-[10.5px] font-medium tabular-nums"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: dim ? 0.4 : 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.045, duration: 0.4 }}
                    >
                      {fmt(stacked ? series.reduce((a, s) => a + (s.data[i] ?? 0), 0) : Math.max(...series.map((s) => s.data[i] ?? 0)))}
                    </motion.text>
                  )}
                  {i % stride === 0 && (
                    <text
                      x={cx}
                      y={height - 8}
                      textAnchor="middle"
                      className={cn('font-mono text-[10.5px] transition-[fill] duration-150', hover === i || highlightIndex === i ? 'fill-[var(--ink)]' : 'fill-[var(--ink-3)]')}
                    >
                      {l}
                    </text>
                  )}
                  {/* hit target: the whole band, bigger than the mark */}
                  <rect
                    x={left + band * i}
                    y={0}
                    width={band}
                    height={height}
                    fill="transparent"
                    style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                    onPointerEnter={() => setHover(i)}
                    onPointerDown={() => setHover(i)}
                    onClick={() => onBarClick?.(i, series[0]?.id)}
                  />
                </g>
              )
            })}
          </svg>
        )}
        <ChartTooltip
          open={hover !== null}
          placement="above"
          x={hover !== null ? clamp(left + band * hover + band / 2, 70, Math.max(70, width - 70)) : 0}
          y={Math.max(tipY - 4, 36)}
          containerWidth={width}
        >
          {hover !== null && (
            <>
              <TooltipTitle>{labels[hover]}</TooltipTitle>
              {series.map((s, si) => (
                <TooltipRow
                  key={s.id}
                  shape="rect"
                  color={series.length === 1 && barColors?.[hover] ? barColors[hover]! : seriesColor(si, s.color)}
                  value={fmt(s.data[hover] ?? 0)}
                  label={series.length > 1 ? s.label : undefined}
                />
              ))}
              {stacked && (
                <div className="mt-1 flex justify-between border-t border-line pt-1 text-ink-3">
                  <span>Σ</span>
                  <span className="font-mono font-semibold text-ink">{fmt(hoverTotal)}</span>
                </div>
              )}
            </>
          )}
        </ChartTooltip>
      </div>
      <SrTable caption={ariaLabel} columns={['', ...series.map((s) => s.label)]} rows={labels.map((l, i) => [l, ...series.map((s) => fmt(s.data[i] ?? 0))])} />
    </div>
  )
}
