import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface MarqueeProps {
  children: ReactNode
  /** Pixels per second. */
  speed?: number
  direction?: 'left' | 'right'
  pauseOnHover?: boolean
  /** Space between items and between repeats (px). */
  gap?: number
  /** Fade the edges with a mask. */
  fade?: boolean
  className?: string
  /** Accessible label for the region. */
  ariaLabel?: string
}

const FADE = 'linear-gradient(90deg, transparent, #000 56px, #000 calc(100% - 56px), transparent)'
const KEYFRAMES = '@keyframes dt-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(var(--dt-mq-shift),0,0)}}'

/**
 * Infinite horizontal ticker. Measures one copy of the content and repeats it
 * just enough to fill the row, then slides by exactly one copy so the loop is
 * seamless. CSS-driven (cheap) and paused on hover / when motion is off.
 */
export function Marquee({ children, speed = 40, direction = 'left', pauseOnHover = true, gap = 16, fade = true, className, ariaLabel }: MarqueeProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ copy: 0, box: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const copy = first.current?.getBoundingClientRect().width ?? 0
      const box = wrap.current?.getBoundingClientRect().width ?? 0
      setDims((d) => (Math.abs(d.copy - copy) < 0.5 && Math.abs(d.box - box) < 0.5 ? d : { copy, box }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrap.current) ro.observe(wrap.current)
    if (first.current) ro.observe(first.current)
    return () => ro.disconnect()
  }, [])

  const unit = dims.copy + gap
  const copies = unit > 0 ? Math.max(2, Math.ceil(dims.box / unit) + 1) : 2
  const duration = unit > 0 ? unit / Math.max(4, speed) : 20

  const trackStyle = {
    gap,
    '--dt-mq-shift': `${-unit}px`,
    // longhands (not the shorthand) so the hover class can pause it
    animationName: unit > 0 ? 'dt-marquee' : 'none',
    animationDuration: `${duration}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
  } as CSSProperties

  return (
    <div
      ref={wrap}
      role="region"
      aria-label={ariaLabel}
      className={cn('group/mq relative w-full overflow-hidden', className)}
      style={fade ? { maskImage: FADE, WebkitMaskImage: FADE } : undefined}
    >
      <style>{KEYFRAMES}</style>
      <div className={cn('flex w-max will-change-transform', pauseOnHover && 'group-hover/mq:[animation-play-state:paused]')} style={trackStyle}>
        {Array.from({ length: copies }, (_, i) => (
          <div key={i} ref={i === 0 ? first : undefined} className="flex shrink-0 items-center" style={{ gap }} aria-hidden={i > 0 || undefined}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}
