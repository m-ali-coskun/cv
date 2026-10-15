import { forwardRef, type ReactNode } from 'react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT, item, FILTER_TWEEN } from '@/lib/motion'
import { Avatar } from '@/components/ui/Avatar'
import { Glass, type GlassVariant } from '@/components/ui/Glass'
import type { PersonLite } from './context'

/** Page card: liquid-glass surface that joins the staggered page entrance. */
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

/** Small heading used inside cards and tabs. */
export function SectionTitle({ icon, title, sub, right, className }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative z-[1] flex flex-wrap items-center justify-between gap-x-3 gap-y-2', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-ink [&_svg]:size-4">{icon}</span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-medium tracking-[-0.02em] text-ink">{title}</h3>
          {sub && <p className="truncate text-[12.5px] text-ink-3">{sub}</p>}
        </div>
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

/** Avatar for any person — clients render as brand monograms. */
export function PersonAvatar({ person, size = 32, ring, status, className }: { person?: PersonLite; size?: number; ring?: boolean; status?: 'online' | 'away' | 'offline'; className?: string }) {
  if (!person) return <Avatar seed="unknown" size={size} className={className} />
  if (person.kind === 'client')
    return <Avatar kind="brand" name={person.name} color={person.color} seed={person.avatarSeed} size={size} ring={ring} status={status} className={className} />
  return <Avatar seed={person.avatarSeed} media={person.media} size={size} ring={ring} status={status} className={className} />
}

/** Text where every character rolls vertically when it changes (clocks, countdowns). */
export function RollingText({ value, className, charClassName }: { value: string; className?: string; charClassName?: string }) {
  return (
    <span className={cn('inline-flex font-mono tabular-nums', className)} aria-label={value} role="timer">
      {value.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden className={cn('relative inline-block h-[1.15em] w-[0.62em] overflow-hidden', charClassName)}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ y: '-80%', opacity: 0, filter: 'blur(3px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: '80%', opacity: 0, filter: 'blur(3px)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 30, filter: FILTER_TWEEN }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={i} aria-hidden className={cn('inline-flex h-[1.15em] items-center px-[0.03em]', ch === ':' && 'opacity-50')}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ),
      )}
    </span>
  )
}

/** Round checkbox whose tick draws itself. */
export function CheckDot({ checked, onClick, label, disabled, size = 22, tone = 'accent' }: { checked: boolean; onClick?: () => void; label: string; disabled?: boolean; size?: number; tone?: 'accent' | 'success' }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 disabled:cursor-default',
        checked
          ? tone === 'success'
            ? 'border-transparent bg-success text-white'
            : 'border-transparent bg-accent text-accent-ink'
          : 'border-line-2 bg-[var(--surface)] hover:border-[var(--ink-4)]',
      )}
      style={{ width: size, height: size }}
    >
      <AnimatePresence initial={false}>
        {checked && (
          <motion.svg key="c" viewBox="0 0 24 24" className="size-[70%]" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.12 } }} transition={{ type: 'spring', stiffness: 520, damping: 20 }}>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.32, ease: EASE_OUT }} />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/** Pulsing "live" dot. */
export function LiveDot({ className, color = 'var(--success)' }: { className?: string; color?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

/** Label/value tile (reference: "System · 8.2 kW"). */
export function StatTile({ label, value, sub, icon, className, tone = 'tile' }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; className?: string; tone?: 'tile' | 'night' | 'accent' }) {
  return (
    <div
      className={cn(
        'relative min-w-0 rounded-[18px] p-3.5',
        tone === 'tile' && 'bg-[var(--surface-2)]',
        tone === 'night' && 'bg-night text-on-night',
        tone === 'accent' && 'bg-accent text-accent-ink',
        className,
      )}
    >
      <div className={cn('flex items-center gap-1.5 text-[12px]', tone === 'tile' ? 'text-ink-3' : 'opacity-70')}>
        {icon && <span className="[&_svg]:size-3.5">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-[19px] font-medium tracking-[-0.02em]">{value}</div>
      {sub && <div className={cn('mt-0.5 truncate text-[12px]', tone === 'tile' ? 'text-ink-3' : 'opacity-70')}>{sub}</div>}
    </div>
  )
}

/** Mono, pill-shaped id/date chip. */
export function MonoChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-6 items-center rounded-full bg-[var(--surface-2)] px-2.5 font-mono text-[11.5px] tabular-nums text-ink-2', className)}>{children}</span>
}

/** Animated count badge (swaps number with a little pop). */
export function TabCount({ value, active }: { value: number; active?: boolean }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-5 min-w-5 items-center justify-center overflow-hidden rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums',
        active ? 'bg-white/20 text-current dark:bg-black/15' : 'bg-[var(--surface-3)] text-ink-2',
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Fade-up list item used with AnimatePresence + layout for live lists. */
export const listItem = {
  initial: { opacity: 0, y: 12, scale: 0.98, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.96, filter: 'blur(4px)', transition: { duration: 0.18 } },
  transition: { type: 'spring', stiffness: 380, damping: 32, filter: FILTER_TWEEN },
} as const
