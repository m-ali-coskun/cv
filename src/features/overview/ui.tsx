import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item } from '@/lib/motion'
import { Glass, type GlassVariant } from '@/components/ui/Glass'
import { Avatar } from '@/components/ui/Avatar'
import type { PersonLite } from './hooks'

/** Dashboard card: a liquid-glass surface that joins the page's staggered entrance. */
export const Card = forwardRef<
  HTMLDivElement,
  HTMLMotionProps<'div'> & { variant?: GlassVariant; spotlight?: boolean; tilt?: boolean | number; interactive?: boolean; pad?: boolean }
>(function Card({ className, children, variant = 'card', pad = true, ...rest }, ref) {
  return (
    <Glass ref={ref} variants={item} variant={variant} className={cn('relative min-w-0', pad && 'p-4 sm:p-5', className)} {...rest}>
      {children}
    </Glass>
  )
})

/** Round "↗" button like the reference's card corner action. */
export function ArrowButton({
  label,
  onClick,
  tone = 'soft',
  className,
  size = 40,
}: {
  label: string
  onClick?: () => void
  tone?: 'soft' | 'glass' | 'night' | 'ink' | 'white'
  className?: string
  size?: number
}) {
  const toneCls = {
    soft: 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
    glass: 'glass text-ink',
    night: 'bg-white/10 text-white hover:bg-white/20',
    ink: 'bg-ink text-[var(--surface)]',
    white: 'bg-white/85 text-[#0b0b0c] shadow-[inset_0_1px_0_#fff,0_6px_18px_-8px_rgba(0,0,0,.35)] backdrop-blur',
  }[tone]
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn('group/arrow relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors', toneCls, className)}
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
    >
      <span className="relative z-[1] block overflow-hidden" style={{ width: size * 0.45, height: size * 0.45 }}>
        <ArrowUpRight className="absolute inset-0 size-full transition-transform duration-300 ease-[var(--ease-out)] group-hover/arrow:-translate-y-full group-hover/arrow:translate-x-full" />
        <ArrowUpRight className="absolute inset-0 size-full -translate-x-full translate-y-full transition-transform duration-300 ease-[var(--ease-out)] group-hover/arrow:translate-x-0 group-hover/arrow:translate-y-0" />
      </span>
    </motion.button>
  )
}

export function MonoId({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[12.5px] tracking-[-0.01em] tabular-nums', className)}>{children}</span>
}

/** Avatar for any person — clients render as brand monograms. */
export function PersonAvatar({ person, size = 32, ring, status }: { person?: PersonLite; size?: number; ring?: boolean; status?: 'online' | 'away' | 'offline' }) {
  if (!person) return <Avatar seed="unknown" size={size} />
  if (person.kind === 'client')
    return <Avatar kind="brand" name={person.name} color={person.color} seed={person.avatarSeed} size={size} ring={ring} status={status} />
  return <Avatar seed={person.avatarSeed} media={person.media} size={size} ring={ring} status={status} />
}

/** Pulsing live dot. */
export function LiveDot({ color = 'var(--success)', className }: { color?: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

/** Small uppercase-ish label used inside tiles. */
export function TileLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('block truncate text-[12px] text-ink-3', className)}>{children}</span>
}

/** Animated list item used for feeds (enter: rise + de-blur; exit: collapse). */
export const listItem = {
  hidden: { opacity: 0, y: 12, filter: 'blur(6px)' },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: Math.min(i, 10) * 0.045, duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
  }),
  exit: { opacity: 0, x: 24, filter: 'blur(4px)', transition: { duration: 0.22 } },
}
