import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, MoreHorizontal, SlidersHorizontal } from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Sparkline } from '@/components/charts/Sparkline'
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
    <Glass ref={ref} variants={item} variant={variant} className={cn('relative min-w-0 has-[[role=menu]]:z-30', pad && 'p-4 sm:p-5', className)} {...rest}>
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

// ───────────────────────── KPI tile ─────────────────────────


export type KpiTone = 'tile' | 'night' | 'accent'

/**
 * Stat tile from the reference ("Active projects 128 · 7 jurisdictions").
 * The number rolls like an odometer; a faint sparkline breathes underneath.
 */
export function KpiTile({
  label,
  value,
  sub,
  tone = 'tile',
  onClick,
  spark,
  decimals,
  currency,
  suffix,
  trend,
  icon,
  className,
}: {
  label: ReactNode
  value: number
  sub?: ReactNode
  tone?: KpiTone
  onClick?: () => void
  spark?: number[]
  decimals?: number
  currency?: 'EUR' | 'USD'
  suffix?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: ReactNode
  className?: string
}) {
  const toneCls = {
    tile: 'bg-[var(--surface-2)] text-ink hover:bg-[color-mix(in_oklab,var(--surface-2)_70%,var(--surface-3))]',
    night: 'bg-night text-on-night shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_14px_30px_-16px_rgba(0,0,0,.6)]',
    accent: 'glass-accent',
  }[tone]
  const subCls = tone === 'night' ? 'text-white/55' : tone === 'accent' ? 'text-accent-ink/70' : 'text-ink-3'
  const sparkColor = tone === 'night' ? 'var(--accent)' : tone === 'accent' ? 'var(--accent-ink)' : 'var(--ink-3)'
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={listItem}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 460, damping: 28 }}
      className={cn(
        'group/kpi relative flex min-h-[118px] min-w-0 flex-col overflow-hidden rounded-[18px] p-3.5 text-left transition-colors duration-200 sm:p-4',
        toneCls,
        className,
      )}
    >
      <span className={cn('relative z-[1] flex items-center justify-between gap-2 text-[12.5px]', tone === 'night' ? 'text-white/70' : tone === 'accent' ? 'text-accent-ink/80' : 'text-ink-2')}>
        <span className="truncate">{label}</span>
        {icon ?? (
          <ArrowRight className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-200 group-hover/kpi:translate-x-0 group-hover/kpi:opacity-70" />
        )}
      </span>
      <span className="relative z-[1] mt-1 text-[30px] font-medium leading-none tracking-[-0.04em] sm:text-[34px]">
        <AnimatedCounter value={value} decimals={decimals} currency={currency} suffix={suffix} />
      </span>
      {sub && (
        <span className={cn('relative z-[1] mt-auto flex min-w-0 items-center gap-1 pt-2 text-[12px]', subCls)}>
          {trend === 'up' && <ArrowUpRight className="size-3.5 shrink-0" />}
          {trend === 'down' && <ArrowDownRight className="size-3.5 shrink-0" />}
          <span className="truncate">{sub}</span>
        </span>
      )}
      {spark && spark.length > 1 && (
        <span className="pointer-events-none absolute bottom-1 left-[45%] right-0 h-9 opacity-30 transition-opacity duration-300 group-hover/kpi:opacity-60">
          <Sparkline data={spark} height={40} color={sparkColor} dot={false} strokeWidth={1.5} />
        </span>
      )}
    </motion.button>
  )
}

/** "Open ›" style inline link button. */
export function LinkButton({ children, onClick, className, tone = 'ink' }: { children: ReactNode; onClick?: () => void; className?: string; tone?: 'ink' | 'night' }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'group/link inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[13px] font-medium transition-colors',
        tone === 'night' ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-ink hover:bg-[var(--surface-2)]',
        className,
      )}
    >
      {children}
      <ChevronRight className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover/link:translate-x-0.5" />
    </motion.button>
  )
}

/** Round soft icon trigger used for card "filter" / "more" menus. */
export const CardIconTrigger = forwardRef<HTMLButtonElement, { label: string; onClick: () => void; open?: boolean; kind?: 'filter' | 'more'; active?: boolean; tone?: 'soft' | 'night' }>(
  function CardIconTrigger({ label, onClick, open, kind = 'more', active, tone = 'soft' }, ref) {
    return (
      <motion.button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={onClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        className={cn(
          'relative inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
          tone === 'night' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
          open && (tone === 'night' ? 'bg-white/20' : 'bg-[var(--surface-3)]'),
        )}
      >
        {kind === 'filter' ? <SlidersHorizontal className="size-4" /> : <MoreHorizontal className="size-4" />}
        {active && <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[var(--surface)] bg-accent" />}
      </motion.button>
    )
  },
)
