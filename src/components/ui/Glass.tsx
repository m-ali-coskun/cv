import { forwardRef, useRef, type CSSProperties, type HTMLAttributes, type PointerEvent } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store'

export type GlassVariant = 'card' | 'glass' | 'strong' | 'night' | 'accent' | 'tile' | 'plain'

const VARIANT: Record<GlassVariant, string> = {
  card: 'card',
  glass: 'glass rounded-[var(--radius-xl)]',
  strong: 'glass glass-strong rounded-[var(--radius-xl)]',
  night: 'glass-night rounded-[var(--radius-xl)]',
  accent: 'glass-accent rounded-[var(--radius-xl)]',
  tile: 'tile',
  plain: '',
}

type GlassProps = HTMLMotionProps<'div'> & {
  variant?: GlassVariant
  /** Cursor-following specular light — the "liquid" sheen. */
  spotlight?: boolean
  /** Subtle 3D tilt toward the cursor. */
  tilt?: boolean | number
  /** Lift + glow on hover. */
  interactive?: boolean
}

/**
 * The building block of the UI: a liquid-glass surface.
 * Layers: frosted backdrop (CSS) → specular rim (CSS ::before) →
 * optional pointer spotlight + tilt (motion values, no re-renders).
 */
export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { variant = 'card', spotlight = false, tilt = false, interactive = false, className, children, style, onPointerMove, onPointerLeave, ...rest },
  ref,
) {
  const motionLevel = useApp((s) => s.settings.motion)
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const rx = useSpring(0, { stiffness: 220, damping: 22 })
  const ry = useSpring(0, { stiffness: 220, damping: 22 })
  const glow = useMotionValue(0)
  const glowS = useSpring(glow, { stiffness: 200, damping: 30 })
  const bg = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, color-mix(in oklab, var(--accent) 22%, rgba(255,255,255,.35)), transparent 55%)`
  const enabledTilt = tilt && motionLevel === 'expressive'
  const maxTilt = typeof tilt === 'number' ? tilt : 6

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e)
    if (!spotlight && !enabledTilt) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * 100
    const py = ((e.clientY - r.top) / r.height) * 100
    mx.set(px)
    my.set(py)
    glow.set(1)
    if (enabledTilt) {
      ry.set(((px - 50) / 50) * maxTilt)
      rx.set(-((py - 50) / 50) * maxTilt)
    }
  }
  const handleLeave = (e: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e)
    glow.set(0)
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={cn(VARIANT[variant], interactive && 'transition-shadow duration-300', className)}
      style={{
        ...(enabledTilt ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : null),
        ...(style as object),
      }}
      whileHover={interactive ? { y: -4, transition: { type: 'spring', stiffness: 400, damping: 26 } } : undefined}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {spotlight && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] mix-blend-soft-light dark:mix-blend-screen"
          style={{ background: bg, opacity: glowS }}
        />
      )}
      {children as React.ReactNode}
    </motion.div>
  )
})

/** Static (non-motion) glass for cheap, deeply nested surfaces. */
export function GlassDiv({ variant = 'glass', className, ...rest }: HTMLAttributes<HTMLDivElement> & { variant?: GlassVariant; style?: CSSProperties }) {
  return <div className={cn(VARIANT[variant], className)} {...rest} />
}

/** Section header used inside cards: title + optional subtitle + right slot. */
export function CardHeader({
  title,
  subtitle,
  action,
  className,
  icon,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <div className={cn('relative z-[1] flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[19px] font-medium tracking-[-0.02em] text-ink">
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

/** Hook for ad-hoc pointer spotlight on any element. */
export function useSpotlight() {
  const ref = useRef<HTMLElement | null>(null)
  return ref
}
