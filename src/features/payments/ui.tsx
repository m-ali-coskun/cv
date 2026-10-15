import { forwardRef, type ReactNode } from 'react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, Check, Clock, FileText, Lock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, item, FILTER_TWEEN } from '@/lib/motion'
import { useT } from '@/i18n'
import { Glass, type GlassVariant } from '@/components/ui/Glass'
import { Avatar } from '@/components/ui/Avatar'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Sparkline } from '@/components/charts/Sparkline'
import { disciplineTheme } from '@/theme/disciplines'
import type { Client, Designer, DisciplineId, InvoiceStatus } from '@/store/types'

/** Page card that joins the staggered "focus pull" entrance. */
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

export function MonoId({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[12.5px] tracking-[-0.01em] tabular-nums', className)}>{children}</span>
}

export function PersonAvatar({ person, size = 32, className }: { person?: Designer | Client; size?: number; className?: string }) {
  if (!person) return <Avatar seed="unknown" size={size} className={className} />
  if ('logoColor' in person) return <Avatar kind="brand" name={person.name} color={person.logoColor} seed={person.avatarSeed} size={size} className={className} />
  return <Avatar seed={person.avatarSeed} media={person.avatar} size={size} className={className} />
}

export function DisciplineDot({ id, className }: { id?: DisciplineId; className?: string }) {
  if (!id) return null
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ background: disciplineTheme(id).accent, boxShadow: `0 0 0 3px color-mix(in oklab, ${disciplineTheme(id).accent} 22%, transparent)` }} />
}

const STATUS_STYLE: Record<InvoiceStatus, { cls: string; icon: ReactNode }> = {
  pending: { cls: 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_55%,var(--ink))]', icon: <Clock className="size-3" /> },
  overdue: { cls: 'bg-danger text-white shadow-[0_6px_16px_-8px_var(--danger)]', icon: <TriangleAlert className="size-3" /> },
  escrow: { cls: 'bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,.45)]', icon: <Lock className="size-3" /> },
  paid: { cls: 'bg-success-soft text-[color-mix(in_oklab,var(--success)_72%,var(--ink))]', icon: <Check className="size-3" strokeWidth={3} /> },
  draft: { cls: 'border border-line-2 text-ink-3', icon: <FileText className="size-3" /> },
}

/** Invoice status capsule. Changing status pops the pill (blur + spring). */
export function InvoiceStatusPill({ status, className, size = 'sm' }: { status: InvoiceStatus; className?: string; size?: 'xs' | 'sm' }) {
  const t = useT()
  const s = STATUS_STYLE[status]
  return (
    <span className={cn('relative inline-flex', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.6, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.6, filter: 'blur(6px)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 22, filter: FILTER_TWEEN }}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium',
            size === 'xs' ? 'h-5 px-2 text-[11px]' : 'h-6.5 px-2.5 text-[12px]',
            s.cls,
          )}
        >
          {s.icon}
          {t(`payments.status.${status}`)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function DeltaPill({ value, invert, className, suffix = '%' }: { value: number; invert?: boolean; className?: string; suffix?: string }) {
  const good = invert ? value <= 0 : value >= 0
  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center gap-0.5 rounded-full px-1.5 font-mono text-[11px] font-medium tabular-nums',
        good ? 'bg-accent-soft text-accent-text' : 'bg-danger-soft text-danger',
        className,
      )}
    >
      {value >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(value)}
      {suffix}
    </span>
  )
}

export type TileTone = 'tile' | 'night' | 'accent'

/** Reference-style stat tile: label, rolling number, sub line, breathing sparkline. */
export function StatTile({
  label,
  value,
  currency,
  decimals,
  suffix,
  sub,
  tone = 'tile',
  spark,
  sparkFormat,
  icon,
  onClick,
  active,
  className,
  children,
}: {
  label: ReactNode
  value: number
  currency?: 'EUR' | 'USD'
  decimals?: number
  suffix?: string
  sub?: ReactNode
  tone?: TileTone
  spark?: number[]
  sparkFormat?: (v: number) => string
  icon?: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
  children?: ReactNode
}) {
  const toneCls = {
    tile: 'bg-[var(--surface-2)] text-ink',
    night: 'bg-night text-on-night shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_14px_30px_-16px_rgba(0,0,0,.6)]',
    accent: 'glass-accent',
  }[tone]
  const subCls = tone === 'night' ? 'text-white/55' : tone === 'accent' ? 'text-accent-ink/70' : 'text-ink-3'
  const sparkColor = tone === 'night' ? 'var(--accent)' : tone === 'accent' ? 'var(--accent-ink)' : 'var(--ink-3)'
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      variants={item}
      whileHover={onClick ? { y: -3, transition: { type: 'spring', stiffness: 420, damping: 24 } } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] p-3.5 text-left transition-shadow sm:p-4',
        toneCls,
        active && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]',
        className,
      )}
    >
      <span className={cn('flex items-center justify-between gap-2 text-[12.5px] font-medium', tone === 'night' ? 'text-white/70' : tone === 'accent' ? 'text-accent-ink/80' : 'text-ink-2')}>
        <span className="truncate">{label}</span>
        {icon && <span className="shrink-0 opacity-70 [&_svg]:size-4">{icon}</span>}
      </span>
      <span className="mt-2.5 text-[clamp(22px,2.6vw,30px)] font-medium leading-none tracking-[-0.04em]">
        <AnimatedCounter value={value} currency={currency} decimals={decimals} suffix={suffix} />
      </span>
      {sub && <span className={cn('mt-2 truncate text-[12px]', subCls)}>{sub}</span>}
      {children}
      {spark && spark.length > 1 && (
        <div className="-mx-1 mt-auto pt-2 opacity-80 transition-opacity group-hover:opacity-100">
          <Sparkline data={spark} height={30} color={sparkColor} format={sparkFormat} />
        </div>
      )}
    </Comp>
  )
}

/** Pulsing live dot. */
export function LiveDot({ color = 'var(--success)', className }: { color?: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

/** Animated horizontal share bar. */
export function ShareBar({ value, color = 'var(--accent)', delay = 0, className }: { value: number; color?: string; delay?: number; className?: string }) {
  return (
    <div className={cn('relative h-2 overflow-hidden rounded-full bg-[var(--surface-3)]', className)}>
      <motion.div
        className="absolute inset-y-0 left-0 origin-left rounded-full"
        style={{ background: color, width: `${Math.max(2, Math.min(100, value))}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, ease: EASE_OUT, delay }}
      />
    </div>
  )
}

/** Tiny label above a section inside a card. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3', className)}>{children}</p>
}
