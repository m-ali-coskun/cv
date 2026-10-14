import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView } from 'motion/react'
import { cn } from '@/lib/cn'
import { AnimatedCounter } from './AnimatedCounter'

export interface GaugeProps {
  /** 0–100 */
  value: number
  /** Caption under the number (reference: "ready to submit"). */
  label?: ReactNode
  /** Second, smaller caption line. */
  sublabel?: ReactNode
  /** Max width in px (the gauge scales down to its container). */
  size?: number
  /**
   * Tick colour. 'ink' = black ticks (for accent/lime panels, like the
   * reference), 'accent' = theme accent ticks (for white cards),
   * 'night' = light ticks for dark cards.
   */
  tone?: 'ink' | 'accent' | 'night'
  /** Explicit tick colour (overrides tone). */
  color?: string
  /** Number of radial ticks (reference ≈ 44). */
  ticks?: number
  /** Render "0" and "100" at the ends of the arc. */
  showScale?: boolean
  /** Footer slot (reference: "1254 Oak Street · 23/23 done" pill). */
  footer?: ReactNode
  /** Number suffix (default "%"). */
  suffix?: string
  className?: string
  ariaLabel?: string
}

/**
 * The reference's "94% ready to submit" gauge: a semicircle of radial tick
 * marks that fill one after another, with an odometer number in the middle.
 * The leading tick is longer and glows, like a needle.
 */
export function Gauge({
  value,
  label,
  sublabel,
  size = 260,
  tone = 'ink',
  color,
  ticks = 44,
  showScale = false,
  footer,
  suffix = '%',
  className,
  ariaLabel,
}: GaugeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const v = Math.max(0, Math.min(100, value))
  const target = Math.round((v / 100) * ticks)
  const [filled, setFilled] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    if (!inView) return
    prev.current = filled
    setFilled(target)
  }, [target, inView])

  const ink = color ?? (tone === 'accent' ? 'var(--accent)' : tone === 'night' ? 'var(--on-night)' : 'var(--ink)')
  const faint = tone === 'night' ? 'rgba(255,255,255,.14)' : tone === 'accent' ? 'var(--surface-3)' : 'color-mix(in oklab, var(--ink) 14%, transparent)'
  const W = 240
  const cx = W / 2
  const cy = 124
  const rOuter = 112
  const rInner = 86
  const up = filled >= prev.current

  return (
    <div
      ref={ref}
      className={cn('relative mx-auto w-full', className)}
      style={{ maxWidth: size, containerType: 'inline-size' }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Progress')}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} 132`} className="block w-full overflow-visible">
          {Array.from({ length: ticks }, (_, i) => {
            const a = Math.PI + (i / (ticks - 1)) * Math.PI
            const isLead = i === filled - 1 && filled > 0
            const on = i < filled
            const ro = isLead ? rOuter + 7 : rOuter
            const x1 = cx + Math.cos(a) * rInner
            const y1 = cy + Math.sin(a) * rInner
            const x2 = cx + Math.cos(a) * ro
            const y2 = cy + Math.sin(a) * ro
            // stagger only the ticks that change
            const lo = Math.min(prev.current, filled)
            const hi = Math.max(prev.current, filled)
            const changing = i >= lo && i < hi
            const order = up ? i - lo : hi - 1 - i
            const delay = changing ? 0.08 + order * 0.022 : 0
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={cx + Math.cos(a) * rOuter} y2={cy + Math.sin(a) * rOuter} strokeWidth={3.6} strokeLinecap="round" style={{ stroke: faint }} />
                <motion.line
                  strokeWidth={3.6}
                  strokeLinecap="round"
                  style={{ stroke: ink }}
                  x1={x1}
                  y1={y1}
                  initial={false}
                  animate={{ x2, y2, opacity: on ? 1 : 0 }}
                  transition={{
                    opacity: { duration: 0.18, delay },
                    x2: { type: 'spring', stiffness: 420, damping: 18, delay: isLead ? delay + 0.05 : 0 },
                    y2: { type: 'spring', stiffness: 420, damping: 18, delay: isLead ? delay + 0.05 : 0 },
                  }}
                />
                {isLead && (
                  <motion.circle
                    r={3.4}
                    style={{ fill: ink }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ cx: cx + Math.cos(a) * (rOuter + 15), cy: cy + Math.sin(a) * (rOuter + 15), opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
                  />
                )}
              </g>
            )
          })}
          {showScale && (
            <>
              <text x={cx - (rInner + rOuter) / 2} y={cy + 14} textAnchor="middle" className="font-mono text-[9px]" style={{ fill: faint === 'var(--surface-3)' ? 'var(--ink-3)' : ink, opacity: 0.55 }}>
                0
              </text>
              <text x={cx + (rInner + rOuter) / 2} y={cy + 14} textAnchor="middle" className="font-mono text-[9px]" style={{ fill: faint === 'var(--surface-3)' ? 'var(--ink-3)' : ink, opacity: 0.55 }}>
                100
              </text>
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center" style={{ color: tone === 'night' ? 'var(--on-night)' : undefined }}>
          <span className="flex items-start font-medium leading-none tracking-[-0.045em]" style={{ fontSize: 'clamp(26px, 19cqw, 60px)' }}>
            <AnimatedCounter value={inView ? Math.round(v) : 0} startOnView={false} />
            {suffix && <span className="ml-[0.06em] mt-[0.18em] text-[0.32em] font-medium tracking-normal">{suffix}</span>}
          </span>
          {label && (
            <span className={cn('mt-1.5 text-center leading-tight', tone === 'night' ? 'text-white/60' : 'text-ink-2')} style={{ fontSize: 'clamp(11px, 5.2cqw, 14px)' }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className={cn('mt-0.5 font-mono', tone === 'night' ? 'text-white/45' : 'text-ink-3')} style={{ fontSize: 'clamp(10px, 4.4cqw, 12px)' }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  )
}
