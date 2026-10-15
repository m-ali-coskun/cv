import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useAnimationControls, type HTMLMotionProps } from 'motion/react'
import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, spring } from '@/lib/motion'
import { Glass } from '@/components/ui/Glass'

/** Which setting row should flash (set by the settings search). */
export const FlashContext = createContext<{ anchor: string | null; nonce: number }>({ anchor: null, nonce: 0 })

/** Liquid-glass card that joins the section's staggered entrance. */
export function SettingsCard({
  className,
  children,
  variant = 'card',
  ...rest
}: HTMLMotionProps<'div'> & { variant?: 'card' | 'night' | 'accent' | 'strong'; spotlight?: boolean; tilt?: boolean | number }) {
  return (
    <Glass variants={item} variant={variant} className={cn('relative min-w-0 p-4 sm:p-6', className)} {...rest}>
      {children}
    </Glass>
  )
}

/** Coloured app-style icon tile. */
export function IconTile({ icon: Icon, color, size = 40, className }: { icon: LucideIcon; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-[30%]', !color && 'bg-[var(--surface-2)] text-ink', className)}
      style={{
        width: size,
        height: size,
        ...(color
          ? {
              background: `linear-gradient(150deg, color-mix(in oklab, ${color} 22%, var(--surface)), color-mix(in oklab, ${color} 12%, var(--surface)))`,
              color: `color-mix(in oklab, ${color} 78%, var(--ink))`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 22%, transparent)`,
            }
          : null),
      }}
    >
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} />
    </span>
  )
}

/** Section title block shown at the top of each settings section. */
export function SectionHeader({ icon, color, title, description, right }: { icon: LucideIcon; color: string; title: ReactNode; description?: ReactNode; right?: ReactNode }) {
  return (
    <motion.div variants={item} className="flex flex-wrap items-center gap-4 px-1 pb-1">
      <motion.span initial={{ rotate: -14, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={spring.bouncy}>
        <IconTile icon={icon} color={color} size={52} />
      </motion.span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[24px] font-medium leading-tight tracking-[-0.03em] text-ink sm:text-[28px]">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-3 sm:text-[14px]">{description}</p>}
      </div>
      {right}
    </motion.div>
  )
}

/** Small uppercase label above a group of controls. */
export function GroupLabel({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative z-[1] mb-3 flex items-center justify-between gap-3', className)}>
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-ink-3">{children}</h3>
      {right}
    </div>
  )
}

/** Flashes a ring when the settings search jumps to this anchor. */
export function useFlash(anchor?: string) {
  const ctx = useContext(FlashContext)
  const controls = useAnimationControls()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!anchor || ctx.anchor !== anchor || !ctx.nonce) return
    const t = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      void controls.start({
        boxShadow: ['0 0 0 0px var(--accent-line)', '0 0 0 6px var(--accent-line)', '0 0 0 0px var(--accent-line)'],
        transition: { duration: 1.4, times: [0, 0.3, 1], delay: 0.25 },
      })
    }, 120)
    return () => window.clearTimeout(t)
  }, [anchor, ctx.anchor, ctx.nonce, controls])
  return { ref, controls }
}

/** One setting: icon · title/description · control. Stacks on phones when `stack`. */
export function SettingRow({
  id,
  icon,
  color,
  title,
  description,
  control,
  children,
  stack,
  className,
}: {
  id?: string
  icon?: LucideIcon
  color?: string
  title: ReactNode
  description?: ReactNode
  control?: ReactNode
  children?: ReactNode
  stack?: boolean
  className?: string
}) {
  const { ref, controls } = useFlash(id)
  return (
    <motion.div ref={ref} id={id ? `set-${id}` : undefined} animate={controls} className={cn('relative z-[1] -mx-2 rounded-[20px] px-2 py-3', className)}>
      <div className={cn('flex gap-3.5', stack ? 'flex-col sm:flex-row sm:items-center' : 'items-center')}>
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          {icon && <IconTile icon={icon} color={color} size={40} />}
          <div className="min-w-0">
            <p className="text-[14.5px] font-medium tracking-[-0.01em] text-ink">{title}</p>
            {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{description}</p>}
          </div>
        </div>
        {control && <div className={cn('flex shrink-0 items-center gap-2', stack && 'sm:justify-end')}>{control}</div>}
      </div>
      {children}
    </motion.div>
  )
}

/** Hairline between rows. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('relative z-[1] h-px bg-[var(--line)]', className)} />
}

/** Animated check badge for selected option cards. */
export function CheckBadge({ show, className }: { show: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 45, transition: { duration: 0.15 } }}
          transition={spring.bouncy}
          className={cn(
            'absolute right-3 top-3 z-[3] flex size-7 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_6px_16px_-6px_var(--accent),inset_0_1px_0_rgba(255,255,255,.5)]',
            className,
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/** Selectable big card (theme, motion, role, language…). */
export function OptionCard({
  selected,
  onClick,
  children,
  className,
  ariaLabel,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      className={cn(
        'group relative overflow-hidden rounded-[22px] border text-left outline-none transition-[border-color,box-shadow,background-color] duration-300 focus-visible:ring-4 focus-visible:ring-[var(--accent-softer)]',
        selected
          ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] shadow-[0_0_0_3px_var(--accent-softer),0_18px_40px_-22px_var(--accent)]'
          : 'border-line bg-[var(--surface)]/70 hover:border-line-2 hover:shadow-[0_18px_40px_-26px_rgba(0,0,0,.35)]',
        className,
      )}
    >
      <CheckBadge show={selected} />
      {children}
    </motion.button>
  )
}

/** Stagger container for a section's cards. */
export function SectionStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>
}
