import { useId, useState, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { clamp, linearPath, monotonePath, useElementSize } from './shared'

export interface SparklineProps {
  data: number[]
  height?: number
  /** CSS colour; defaults to the theme accent. */
  color?: string
  /** Gradient wash under the line. */
  area?: boolean
  /** Pulsing beacon on the last point. */
  dot?: boolean
  strokeWidth?: number
  curve?: 'monotone' | 'linear'
  /** Show a small value readout while hovering. */
  interactive?: boolean
  format?: (v: number) => string
  /** Optional labels shown in the hover readout. */
  labels?: string[]
  /** Fixed y-domain (otherwise min/max of the data). */
  domain?: [number, number]
  ariaLabel?: string
  className?: string
}

/**
 * Tiny trend line for stat tiles. Draws itself in, ends in a pulsing beacon,
 * and (optionally) scrubs on hover. Fills its container's width.
 */
export function Sparkline({
  data,
  height = 40,
  color = 'var(--accent)',
  area = true,
  dot = true,
  strokeWidth = 2,
  curve = 'monotone',
  interactive = false,
  format = (v) => String(Math.round(v * 10) / 10),
  labels,
  domain,
  ariaLabel,
  className,
}: SparklineProps) {
  const uid = useId().replace(/[:«»]/g, '')
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const n = data.length
  const lo = domain?.[0] ?? Math.min(...data)
  const hi = domain?.[1] ?? Math.max(...data)
  const pad = 4
  const x = (i: number) => pad + (n <= 1 ? (width - pad * 2) / 2 : (i / (n - 1)) * (width - pad * 2))
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - lo) / (hi - lo || 1))
  const pts = data.map((v, i) => [x(i), y(v)] as [number, number])
  const line = curve === 'monotone' ? monotonePath(pts) : linearPath(pts)
  const fill = pts.length ? `${line}L${pts[pts.length - 1][0]},${height}L${pts[0][0]},${height}Z` : ''
  const last = pts[pts.length - 1]
  const trendUp = n > 1 && data[n - 1] >= data[0]

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || n === 0) return
    const r = e.currentTarget.getBoundingClientRect()
    setHover(clamp(Math.round(((e.clientX - r.left - pad) / (r.width - pad * 2)) * (n - 1)), 0, n - 1))
  }

  return (
    <div
      ref={ref}
      className={cn('relative w-full', interactive && 'cursor-crosshair touch-pan-y', className)}
      style={{ height }}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={ariaLabel ?? `Trend ${trendUp ? 'up' : 'down'}: ${data.map((v) => format(v)).join(', ')}`}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          <defs>
            <linearGradient id={`${uid}-sg`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {area && (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, d: fill }}
              transition={{ opacity: { duration: 0.9, delay: 0.4 }, d: { type: 'spring', stiffness: 170, damping: 26 } }}
              style={{ fill: `url(#${uid}-sg)` }}
            />
          )}
          <motion.path
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: color }}
            initial={{ pathLength: 0, d: line }}
            animate={{ pathLength: 1, d: line }}
            transition={{ pathLength: { duration: 1.1, ease: EASE_OUT }, d: { type: 'spring', stiffness: 170, damping: 26 } }}
          />
          {hover !== null && pts[hover] && (
            <g pointerEvents="none">
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={height} strokeWidth={1} style={{ stroke: 'var(--line-2)' }} />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} strokeWidth={2} style={{ fill: color, stroke: 'var(--surface)' }} />
            </g>
          )}
        </svg>
      )}
      {dot && last && width > 0 && hover === null && (
        <motion.span
          className="pointer-events-none absolute"
          style={{ left: last[0], top: last[1] }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 420, damping: 16 }}
        >
          <span className="absolute -left-[4px] -top-[4px] size-2 animate-pulse-ring rounded-full" style={{ background: color }} />
          <span className="absolute -left-[4px] -top-[4px] size-2 rounded-full ring-2 ring-[var(--surface)]" style={{ background: color }} />
        </motion.span>
      )}
      {interactive && hover !== null && pts[hover] && (
        <span
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-[var(--surface)] shadow-lg"
          style={{ left: clamp(pts[hover][0], 24, width - 24) }}
        >
          {labels?.[hover] ? `${labels[hover]} · ` : ''}
          {format(data[hover])}
        </span>
      )}
    </div>
  )
}
