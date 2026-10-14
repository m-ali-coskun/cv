import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useLang } from '@/i18n'
import type { Lang } from '@/store/types'

const STR: Record<Lang, { step: string; of: string }> = {
  en: { step: 'Step', of: 'of' },
  de: { step: 'Schritt', of: 'von' },
  tr: { step: 'Adım', of: '/' },
}

export interface StepItem {
  id: string
  label: ReactNode
  description?: ReactNode
  /** Replaces the number in the circle. */
  icon?: ReactNode
}

export interface StepperProps {
  steps: StepItem[]
  /** Index of the current step. */
  current: number
  /** Indices that are complete (default: every step before `current`). */
  completed?: number[]
  /** Called for clickable (completed or current) steps. Omit to make it read-only. */
  onStepClick?: (index: number) => void
  /** Allow jumping to any step, not just completed ones. */
  freeNavigation?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/** Check mark that draws itself. */
function DrawCheck() {
  return (
    <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }} />
    </svg>
  )
}

function StepCircle({ st, label, size }: { st: 'current' | 'done' | 'todo'; label: ReactNode; size: number }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {st === 'current' && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[var(--accent)] opacity-60" />}
      <motion.span
        className={cn(
          'relative flex size-full items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-300',
          st === 'done' && 'bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,.5)]',
          st === 'current' && 'bg-ink text-[var(--surface)] shadow-[0_8px_20px_-8px_rgba(0,0,0,.5)] dark:bg-[var(--surface)] dark:text-ink dark:ring-2 dark:ring-[var(--accent)]',
          st === 'todo' && 'bg-[var(--surface-2)] text-ink-3 ring-1 ring-inset ring-[var(--line-2)]',
        )}
        initial={false}
        animate={{ scale: st === 'current' ? 1.08 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      >
        {st === 'done' ? <DrawCheck /> : label}
      </motion.span>
    </span>
  )
}

/**
 * Wizard progress. Desktop: numbered circles joined by a track whose fill
 * springs to the current step; completed steps show a self-drawing check.
 * Phones get a compact header ("Step 2 of 6 · Label") with capsule segments.
 */
export function Stepper({ steps, current, completed, onStepClick, freeNavigation, orientation = 'horizontal', className }: StepperProps) {
  const lang = useLang()
  const s = STR[lang]
  const done = new Set(completed ?? steps.map((_, i) => i).filter((i) => i < current))
  const n = steps.length
  const progress = n > 1 ? Math.min(1, Math.max(0, current / (n - 1))) : 1

  const state = (i: number) => (i === current ? 'current' : done.has(i) ? 'done' : 'todo')
  const clickable = (i: number) => !!onStepClick && (freeNavigation || done.has(i) || i === current)

  const circle = (i: number, size = 34) => <StepCircle st={state(i)} label={steps[i].icon ?? i + 1} size={size} />

  if (orientation === 'vertical') {
    return (
      <ol className={cn('relative', className)}>
        {steps.map((step, i) => (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < n - 1 && (
              <span className="absolute left-[16px] top-[38px] h-[calc(100%-42px)] w-[2px] overflow-hidden rounded-full bg-[var(--surface-3)]">
                <motion.span
                  className="absolute inset-0 origin-top rounded-full bg-accent"
                  initial={false}
                  animate={{ scaleY: done.has(i) ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                />
              </span>
            )}
            <button
              type="button"
              disabled={!clickable(i)}
              onClick={() => onStepClick?.(i)}
              aria-current={i === current ? 'step' : undefined}
              className="flex min-w-0 items-start gap-3 text-left disabled:cursor-default"
            >
              {circle(i)}
              <span className="min-w-0 pt-1.5">
                <span className={cn('block text-[14px] font-medium', state(i) === 'todo' ? 'text-ink-3' : 'text-ink')}>{step.label}</span>
                {step.description && <span className="mt-0.5 block text-[12.5px] text-ink-3">{step.description}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* compact (phones) */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <motion.div key={current} initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} transition={{ duration: 0.35, ease: EASE_OUT }} className="flex min-w-0 items-center gap-2.5">
            {circle(Math.min(current, n - 1), 30)}
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium">{steps[Math.min(current, n - 1)]?.label}</div>
              {steps[current]?.description && <div className="truncate text-[12px] text-ink-3">{steps[current]?.description}</div>}
            </div>
          </motion.div>
          <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[12px] tabular-nums text-ink-2">
            {lang === 'tr' ? `${Math.min(current + 1, n)}/${n}` : `${s.step} ${Math.min(current + 1, n)} ${s.of} ${n}`}
          </span>
        </div>
        <div className="mt-3 flex gap-1">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              disabled={!clickable(i)}
              onClick={() => onStepClick?.(i)}
              aria-label={typeof step.label === 'string' ? step.label : `${s.step} ${i + 1}`}
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)] disabled:cursor-default"
            >
              <motion.span
                className={cn('absolute inset-0 origin-left rounded-full', i === current ? 'bg-ink dark:bg-[var(--on-night)]' : 'bg-accent')}
                initial={false}
                animate={{ scaleX: done.has(i) || i === current ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.03 }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* full (≥ sm) */}
      <ol className="relative hidden sm:flex">
        <span className="absolute top-[17px] h-[3px] overflow-hidden rounded-full bg-[var(--surface-3)]" style={{ left: `${50 / n}%`, right: `${50 / n}%` }}>
          <motion.span
            className="absolute inset-0 origin-left rounded-full bg-[linear-gradient(90deg,var(--accent),color-mix(in_oklab,var(--accent)_70%,var(--ink)))]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </span>
        {steps.map((step, i) => (
          <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
            <motion.button
              type="button"
              disabled={!clickable(i)}
              onClick={() => onStepClick?.(i)}
              aria-current={i === current ? 'step' : undefined}
              whileHover={clickable(i) ? { y: -2 } : undefined}
              whileTap={clickable(i) ? { scale: 0.94 } : undefined}
              className="group flex min-w-0 max-w-full flex-col items-center gap-2 px-1 text-center disabled:cursor-default"
            >
              {circle(i)}
              <span className={cn('max-w-full truncate text-[13px] font-medium transition-colors', state(i) === 'todo' ? 'text-ink-3' : 'text-ink', clickable(i) && 'group-hover:text-ink')}>
                {step.label}
              </span>
              {step.description && <span className="-mt-1.5 hidden max-w-full truncate text-[11.5px] text-ink-3 lg:block">{step.description}</span>}
            </motion.button>
          </li>
        ))}
      </ol>
    </div>
  )
}
