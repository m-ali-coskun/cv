import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useDesigner } from '@/store/selectors'
import { useWizard } from './draftStore'
import { STEP_IDS } from './model'

/** The designer chosen in the draft. */
export function useBriefDesigner() {
  const id = useWizard((s) => s.draft.designerId)
  return useDesigner(id ?? undefined)
}

/** Big step heading: mono kicker, title, subtitle. */
export function StepHeader({ index, title, subtitle, icon, action }: { index: number; title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  const t = useT()
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-3">
          {icon && <span className="flex size-6 items-center justify-center rounded-lg bg-accent text-accent-ink [&_svg]:size-3.5">{icon}</span>}
          {t('brief.stepKicker', { n: String(index + 1).padStart(2, '0'), total: String(STEP_IDS.length).padStart(2, '0') })}
        </div>
        <h2 className="text-balance text-[26px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[30px]">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

/** A white card section inside a step. */
export function Section({
  title,
  hint,
  icon,
  action,
  children,
  className,
  id,
}: {
  title?: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <motion.section id={id} variants={sectionVariants} className={cn('card relative p-4 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.015em]">
                {icon && <span className="flex size-7 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-ink-2 [&_svg]:size-4">{icon}</span>}
                {title}
              </h3>
            )}
            {hint && <p className="mt-1 text-[13px] text-ink-3">{hint}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </motion.section>
  )
}

export const sectionVariants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
}

export const stepStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

/** Inline error that slides open. */
export function FieldError({ show, children, tone = 'danger' }: { show: boolean; children: ReactNode; tone?: 'danger' | 'warning' }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className={cn('flex items-center gap-1.5 overflow-hidden pt-1.5 text-[12.5px]', tone === 'danger' ? 'text-danger' : 'text-[color-mix(in_oklab,var(--warning)_70%,var(--ink))]')}
          role={tone === 'danger' ? 'alert' : undefined}
        >
          <AlertCircle className="size-3.5 shrink-0" />
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/** "32 / 80" counter that turns orange near the limit. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length
  return (
    <span className={cn('font-mono text-[11.5px] tabular-nums transition-colors', n > max * 0.9 ? 'text-[var(--warning)]' : 'text-ink-3')}>
      {n}/{max}
    </span>
  )
}

/** Field label row: label left, slot right. */
export function FieldLabel({ htmlFor, children, right, required }: { htmlFor?: string; children: ReactNode; right?: ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {children}
        {required && <span className="ml-0.5 text-[var(--accent-text)]">*</span>}
      </label>
      {right}
    </div>
  )
}

/** −/+ number stepper with dots (revision rounds). */
export function NumberStepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const t = useT()
  const [dir, setDir] = useState(1)
  const change = (d: number) => {
    const v = Math.max(min, Math.min(max, value + d))
    if (v === value) return
    setDir(d)
    onChange(v)
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] p-1" role="group" aria-label={label}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.86 }}
          onClick={() => change(-1)}
          disabled={value <= min}
          aria-label={t('brief.common.decrease')}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)] disabled:opacity-35"
        >
          <Minus className="size-4" />
        </motion.button>
        <span className="relative flex h-9 w-10 items-center justify-center overflow-hidden font-mono text-[18px] font-medium tabular-nums" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.span
              key={value}
              initial={{ y: dir > 0 ? 18 : -18, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: dir > 0 ? -18 : 18, opacity: 0, filter: 'blur(4px)' }}
              transition={spring.snappy}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.86 }}
          onClick={() => change(1)}
          disabled={value >= max}
          aria-label={t('brief.common.increase')}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)] disabled:opacity-35"
        >
          <Plus className="size-4" />
        </motion.button>
      </div>
      <div className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <motion.span
            key={i}
            className="h-2 rounded-full"
            initial={false}
            animate={{ width: i < value ? 18 : 8, backgroundColor: i < value ? 'var(--accent)' : 'var(--surface-3)' }}
            transition={spring.bouncy}
          />
        ))}
      </div>
    </div>
  )
}

/** Suggestion chip that flips to a check when added. */
export function SuggestChip({ children, added, onClick, color }: { children: ReactNode; added?: boolean; onClick: () => void; color?: string }) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={spring.snappy}
      aria-pressed={added}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-200',
        added ? 'border-transparent bg-accent text-accent-ink' : 'border-dashed border-line-2 text-ink-2 hover:border-solid hover:border-[var(--ink-4)] hover:text-ink',
      )}
      style={added && color ? { background: color } : undefined}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={added ? 'y' : 'n'} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring.bouncy} className="flex">
          {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
        </motion.span>
      </AnimatePresence>
      {children}
    </motion.button>
  )
}

/**
 * Typewriter: reveals `text` progressively (instantly when motion is off).
 * If the component unmounts mid-way (e.g. the user moves to the next step),
 * the full text is committed so nothing is left half-written.
 */
export function useTypewriter(onTick: (s: string) => void, onDone: () => void) {
  const timer = useRef<number | null>(null)
  const target = useRef('')
  const cb = useRef({ onTick, onDone })
  cb.current = { onTick, onDone }
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
  }
  useEffect(
    () => () => {
      if (timer.current) {
        stop()
        cb.current.onTick(target.current)
      }
    },
    [],
  )
  const start = (text: string, instant: boolean) => {
    stop()
    target.current = text
    if (instant) {
      cb.current.onTick(text)
      cb.current.onDone()
      return
    }
    let i = 0
    const chunk = Math.max(2, Math.round(text.length / 160))
    timer.current = window.setInterval(() => {
      i = Math.min(text.length, i + chunk + (Math.random() < 0.3 ? 1 : 0))
      cb.current.onTick(text.slice(0, i))
      if (i >= text.length) {
        stop()
        cb.current.onDone()
      }
    }, 14)
  }
  const finish = (text: string) => {
    stop()
    cb.current.onTick(text)
    cb.current.onDone()
  }
  return { start, stop, finish }
}
