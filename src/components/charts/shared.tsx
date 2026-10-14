import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { localeOf } from '@/lib/format'
import type { Lang } from '@/store/types'

/**
 * Shared chart plumbing: measuring, scales, curves, tooltip + legend.
 *
 * Visual rules (dataviz method): 2px lines with round joins, ≤ ~28px bars with
 * rounded data-ends and square baselines, 2px surface gaps between touching
 * marks, hairline recessive grid, text always in ink tokens (never in the
 * series colour), legend for ≥ 2 series, one tooltip listing every series.
 */

/** Default categorical order — accent first, then the reference's neutrals. */
export const CHART_COLORS = [
  'var(--accent)',
  'var(--ink)',
  'var(--ink-4)',
  'color-mix(in oklab, var(--accent) 55%, var(--ink))',
  'color-mix(in oklab, var(--accent) 45%, var(--surface))',
  'var(--ink-3)',
] as const

export const seriesColor = (i: number, explicit?: string) => explicit ?? CHART_COLORS[i % CHART_COLORS.length]

/** Width/height of an element, kept in sync with a ResizeObserver. */
export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize((s) => (Math.abs(s.width - r.width) < 0.5 && Math.abs(s.height - r.height) < 0.5 ? s : { width: r.width, height: r.height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

/** "Nice" axis domain + ticks (0 / 250 / 500 / 750 …). */
export function niceTicks(min: number, max: number, count = 4): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] }
  if (max === min) {
    max = max === 0 ? 1 : max * 1.2
    if (min > 0) min = 0
  }
  const span = max - min
  const rough = span / Math.max(1, count)
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow
  const nMin = Math.floor(min / step) * step
  const nMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = nMin; v <= nMax + step / 2; v += step) ticks.push(Number(v.toFixed(10)))
  return { min: nMin, max: nMax, ticks }
}

/** Compact axis number: 1.2K, 3M … */
export function compactNumber(v: number, lang: Lang = 'en') {
  return new Intl.NumberFormat(localeOf(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson, same as d3.curveMonotoneX):
 * smooth, never overshoots the data — great for money/time series.
 */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    m[i] = dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  const t: number[] = new Array(n)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / m[i]
    const b = t[i + 1] / m[i]
    const s = a * a + b * b
    if (s > 9) {
      const tau = 3 / Math.sqrt(s)
      t[i] = tau * a * m[i]
      t[i + 1] = tau * b * m[i]
    }
  }
  let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${r2(pts[i][0] + h)},${r2(pts[i][1] + t[i] * h)},${r2(pts[i + 1][0] - h)},${r2(pts[i + 1][1] - t[i + 1] * h)},${r2(pts[i + 1][0])},${r2(pts[i + 1][1])}`
  }
  return d
}

export function linearPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${r2(p[0])},${r2(p[1])}`).join('')
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Path for a bar with rounded data-end (top) and square baseline. */
export function roundedTopBar(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h))
  const yb = y + h
  return `M${r2(x)},${r2(yb)}L${r2(x)},${r2(y + r)}Q${r2(x)},${r2(y)} ${r2(x + r)},${r2(y)}L${r2(x + w - r)},${r2(y)}Q${r2(x + w)},${r2(y)} ${r2(x + w)},${r2(y + r)}L${r2(x + w)},${r2(yb)}Z`
}

/** Every k-th label so x labels never collide. */
export function labelStride(count: number, plotWidth: number, minGap = 52) {
  if (count <= 1 || plotWidth <= 0) return 1
  return Math.max(1, Math.ceil((count * minGap) / plotWidth))
}

// ─────────────────────────── Tooltip ───────────────────────────

/**
 * Glass tooltip that glides between data points (spring on x/y) and flips to
 * the other side of the pointer near the right edge.
 */
export function ChartTooltip({
  open,
  x,
  y,
  containerWidth,
  children,
  className,
  placement = 'side',
}: {
  open: boolean
  x: number
  y: number
  containerWidth: number
  children: ReactNode
  className?: string
  /** 'side' = right/left of x (line charts) · 'above' = centred above the point (bars, cells). */
  placement?: 'side' | 'above'
}) {
  const flip = placement === 'side' && x > containerWidth * 0.62
  const tx = placement === 'above' ? '-50%' : flip ? 'calc(-100% - 14px)' : '14px'
  const ty = placement === 'above' ? 'calc(-100% - 12px)' : '-50%'
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-20"
          initial={{ opacity: 0, x, y, scale: 0.92, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x, y, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.95, filter: 'blur(3px)', transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
        >
          <div
            className={cn(
              'glass glass-strong min-w-[120px] whitespace-nowrap rounded-[14px] !bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] px-3 py-2 text-[12px] shadow-[0_18px_40px_-16px_rgba(0,0,0,.35)]',
              className,
            )}
            style={{ transform: `translate(${tx}, ${ty})` }}
          >
            <div className="relative z-[1]">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** One tooltip row: line key · bold value · muted label. */
export function TooltipRow({ color, value, label, shape = 'line' }: { color: string; value: ReactNode; label?: ReactNode; shape?: 'line' | 'dot' | 'rect' }) {
  return (
    <div className="flex items-center gap-2 py-[2px]">
      <span
        aria-hidden
        className={cn('shrink-0', shape === 'line' ? 'h-[3px] w-3 rounded-full' : shape === 'dot' ? 'size-2 rounded-full' : 'size-2.5 rounded-[3px]')}
        style={{ background: color }}
      />
      <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{value}</span>
      {label && <span className="ml-auto pl-3 text-ink-3">{label}</span>}
    </div>
  )
}

export function TooltipTitle({ children }: { children: ReactNode }) {
  return <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">{children}</div>
}

// ─────────────────────────── Legend ───────────────────────────

export interface LegendItem {
  id: string
  label: ReactNode
  color: string
  value?: ReactNode
}

/** Legend that mirrors the mark (line for lines, rect for bars/areas, dot for donut). */
export function ChartLegend({
  items,
  shape = 'rect',
  active,
  onHover,
  className,
}: {
  items: LegendItem[]
  shape?: 'line' | 'rect' | 'dot'
  active?: string | null
  onHover?: (id: string | null) => void
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]', className)}>
      {items.map((it) => (
        <li
          key={it.id}
          onPointerEnter={() => onHover?.(it.id)}
          onPointerLeave={() => onHover?.(null)}
          className={cn('flex items-center gap-1.5 transition-opacity duration-200', active && active !== it.id && 'opacity-40')}
        >
          <span
            aria-hidden
            className={cn('shrink-0', shape === 'line' ? 'h-[3px] w-3.5 rounded-full' : shape === 'dot' ? 'size-2.5 rounded-full' : 'size-2.5 rounded-[3px]')}
            style={{ background: it.color }}
          />
          <span className="text-ink-2">{it.label}</span>
          {it.value !== undefined && <span className="font-mono text-[12px] tabular-nums text-ink">{it.value}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Screen-reader data table — the "table view" every chart ships with. */
export function SrTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
