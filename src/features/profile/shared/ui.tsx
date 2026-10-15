import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2, Lock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, item, spring } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { Glass } from '@/components/ui/Glass'
import { DisciplineIcon } from '@/components/ui/Badge'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { disciplineTheme } from '@/theme/disciplines'
import { DISCIPLINE_IDS, type Availability, type DisciplineId } from '@/store/types'
import { useDebouncedCommit, useSaveUI } from './saveState'

// ───────────────────────────── saved indicators ─────────────────────────────

/** "Saving… → ✓ Saved" capsule for one section. Fades out a moment after saving. */
export function SavedPill({ section, className }: { section: string; className?: string }) {
  const t = useT()
  const entry = useSaveUI((s) => s.sections[section])
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!entry) return
    setVisible(true)
    if (entry.status === 'saved') {
      const id = window.setTimeout(() => setVisible(false), 1900)
      return () => window.clearTimeout(id)
    }
  }, [entry])
  const saving = entry?.status === 'saving'
  return (
    <AnimatePresence>
      {visible && entry && (
        <motion.span
          key="pill"
          initial={{ opacity: 0, y: -6, scale: 0.85, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -4, scale: 0.9, filter: 'blur(4px)', transition: { duration: 0.25 } }}
          transition={spring.bouncy}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium',
            saving ? 'bg-[var(--surface-2)] text-ink-3' : 'bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,.5)]',
            className,
          )}
          aria-live="polite"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {saving ? (
              <motion.span key="s" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }}>
                <Loader2 className="size-3.5 animate-spin" />
              </motion.span>
            ) : (
              <motion.svg key="c" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }} />
              </motion.svg>
            )}
          </AnimatePresence>
          <span>{saving ? t('profile.save.saving') : t('profile.save.saved')}</span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/** Page-level "All changes saved · 2 min ago" line with a breathing dot. */
export function LastSaved({ className, onDark }: { className?: string; onDark?: boolean }) {
  const t = useT()
  const lang = useLang()
  const at = useSaveUI((s) => s.lastSavedAt)
  const saving = useSaveUI((s) => Object.values(s.sections).some((x) => x.status === 'saving'))
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className={cn('inline-flex items-center gap-2 text-[12.5px]', onDark ? 'text-white/70' : 'text-ink-3', className)}>
      <span className="relative flex size-2">
        <span className={cn('absolute inline-flex size-full rounded-full opacity-60', saving ? 'animate-ping bg-warning' : 'bg-success')} />
        <span className={cn('relative inline-flex size-2 rounded-full', saving ? 'bg-warning' : 'bg-success')} />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saving ? 'saving' : at ? 'at' : 'auto'}
          initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -4, filter: 'blur(3px)' }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {saving ? t('profile.save.saving') : at ? t('profile.save.allSaved', { ago: timeAgo(new Date(at), lang) }) : t('profile.save.autosave')}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// ───────────────────────────── section card ─────────────────────────────

export function SectionCard({
  id,
  icon,
  title,
  subtitle,
  action,
  children,
  className,
  saveKey,
  variant = 'card',
}: {
  id: string
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Autosave pill key (defaults to id). Pass false to hide the pill. */
  saveKey?: string | false
  variant?: 'card' | 'night'
}) {
  const flash = useSaveUI((s) => (s.flash?.id === id ? s.flash.n : 0))
  return (
    <motion.section id={`sec-${id}`} variants={item} className="scroll-mt-20">
      <Glass variant={variant} className={cn('relative p-4 sm:p-6', className)}>
        {/* flash ring when the strength checklist jumps here */}
        <AnimatePresence>
          {flash > 0 && (
            <motion.span
              key={flash}
              aria-hidden
              className="pointer-events-none absolute -inset-px z-[2] rounded-[inherit]"
              style={{ boxShadow: '0 0 0 2px var(--accent), 0 0 0 8px var(--accent-soft), 0 0 50px -6px var(--accent)' }}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [1.02, 1, 1, 1] }}
              transition={{ duration: 1.8, times: [0, 0.15, 0.7, 1], ease: EASE_OUT }}
            />
          )}
        </AnimatePresence>
        <header className="relative z-[1] mb-4 flex items-start justify-between gap-3 sm:mb-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-[18px]',
                  variant === 'night' ? 'bg-white/10 text-accent' : 'bg-accent-soft text-accent-text',
                )}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-[18px] font-medium leading-tight tracking-[-0.02em] sm:text-[19px]">{title}</h3>
              {subtitle && <p className={cn('mt-0.5 text-[13px]', variant === 'night' ? 'text-white/60' : 'text-ink-3')}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saveKey !== false && <SavedPill section={saveKey ?? id} className="hidden sm:inline-flex" />}
            {action}
          </div>
        </header>
        <div className="relative z-[1] @container">{children}</div>
        {saveKey !== false && (
          <div className="pointer-events-none absolute right-4 top-4 z-[3] sm:hidden">
            <SavedPill section={saveKey ?? id} />
          </div>
        )}
      </Glass>
    </motion.section>
  )
}

// ───────────────────────────── fields ─────────────────────────────

/** Character counter that turns warning/danger near the limit. */
export function CharCount({ value, max, min, className }: { value: number; max: number; min?: number; className?: string }) {
  const tone = value > max ? 'text-danger' : value > max * 0.9 ? 'text-warning' : min && value < min ? 'text-ink-3' : 'text-ink-3'
  return (
    <span className={cn('font-mono text-[11.5px] tabular-nums transition-colors', tone, className)}>
      <motion.span key={value > max ? 'over' : 'ok'} initial={value > max ? { x: [-3, 3, -2, 2, 0] } : false} animate={{ x: 0 }} className="inline-block">
        {value}
      </motion.span>
      /{max}
    </span>
  )
}

interface TextFieldProps {
  label: ReactNode
  value: string
  onCommit: (v: string) => void
  section: string
  placeholder?: string
  max?: number
  min?: number
  multiline?: boolean
  rows?: number
  hint?: ReactNode
  icon?: ReactNode
  right?: ReactNode
  prefix?: string
  transform?: (v: string) => string
  error?: (v: string) => ReactNode | null
  list?: string
  type?: string
  inputMode?: 'text' | 'url' | 'email' | 'numeric'
  className?: string
  autoComplete?: string
}

/** Labelled input/textarea that autosaves (debounced) to the store. */
export function TextField({ label, value, onCommit, section, placeholder, max, min, multiline, rows = 4, hint, icon, right, transform, error, list, type, inputMode, className, autoComplete }: TextFieldProps) {
  const id = useId()
  const [local, setLocal, flush] = useDebouncedCommit(value, onCommit, section)
  const err = error?.(local) ?? null
  const counter = max ? <CharCount value={local.length} max={max} min={min} /> : hint
  return (
    <div className={className}>
      <Label htmlFor={id} hint={counter}>
        {label}
      </Label>
      {multiline ? (
        <Textarea id={id} value={local} rows={rows} placeholder={placeholder} onChange={(e) => setLocal(transform ? transform(e.target.value) : e.target.value)} onBlur={flush} />
      ) : (
        <Input
          id={id}
          value={local}
          placeholder={placeholder}
          icon={icon}
          right={right}
          list={list}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => setLocal(transform ? transform(e.target.value) : e.target.value)}
          onBlur={flush}
          aria-invalid={!!err}
          className={cn(err && 'border-danger focus:border-danger focus:shadow-[0_0_0_4px_var(--danger-soft)]')}
        />
      )}
      <AnimatePresence initial={false}>
        {err && (
          <motion.p
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 overflow-hidden text-[12px] text-danger"
          >
            {err}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Datalist helper for city / industry suggestions. */
export function DataList({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  )
}

// ───────────────────────────── discipline pickers ─────────────────────────────

/** Big tiles to choose ONE discipline (primary craft). */
export function PrimaryDisciplinePicker({ value, onChange, className }: { value: DisciplineId | null; onChange: (d: DisciplineId) => void; className?: string }) {
  const t = useT()
  const lid = useId()
  return (
    <div role="radiogroup" className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {DISCIPLINE_IDS.map((d, i) => {
        const th = disciplineTheme(d)
        const active = value === d
        return (
          <motion.button
            key={d}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: i * 0.03, duration: 0.45, ease: EASE_OUT }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'relative flex min-h-[64px] items-center gap-2.5 overflow-hidden rounded-[18px] border p-3 text-left transition-colors',
              active ? 'border-transparent' : 'border-line bg-[var(--surface-2)]/60 hover:border-line-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={`prim-${lid}`}
                className="absolute inset-0 rounded-[18px]"
                style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${th.accent} 32%, var(--surface)), color-mix(in oklab, ${th.accent} 14%, var(--surface)))`, boxShadow: `inset 0 0 0 1.5px ${th.accent}, 0 12px 26px -16px ${th.accent}` }}
                transition={spring.pill}
              />
            )}
            <motion.span className="relative z-[1]" animate={active ? { rotate: [0, -10, 8, 0], scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.5 }}>
              <DisciplineIcon id={d} size={32} />
            </motion.span>
            <span className="relative z-[1] min-w-0">
              <span className="block truncate text-[13.5px] font-medium leading-tight">{t(th.labelKey)}</span>
              <span className="block truncate font-mono text-[10.5px] text-ink-3">{th.inspiredBy}</span>
            </span>
            {active && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="absolute right-2 top-2 z-[1] flex size-5 items-center justify-center rounded-full text-white" style={{ background: th.deep }}>
                <Check className="size-3" strokeWidth={3} style={{ color: th.accent }} />
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Multi-select discipline chips. `locked` ones can't be removed (the primary). */
export function DisciplineChips({ value, onChange, locked, className }: { value: DisciplineId[]; onChange: (v: DisciplineId[]) => void; locked?: DisciplineId | null; className?: string }) {
  const t = useT()
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {DISCIPLINE_IDS.map((d) => {
        const th = disciplineTheme(d)
        const on = value.includes(d)
        const isLocked = locked === d
        return (
          <motion.button
            key={d}
            type="button"
            aria-pressed={on}
            disabled={isLocked}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
            whileTap={{ scale: 0.94 }}
            layout
            transition={spring.snappy}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full border pl-1 pr-3 text-[13px] font-medium transition-[background-color,border-color,color] duration-200 disabled:cursor-default',
              on ? 'border-transparent text-ink' : 'border-line-2 text-ink-3 hover:text-ink',
            )}
            style={on ? { background: `color-mix(in oklab, ${th.accent} 22%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${th.accent} 55%, transparent)` } : undefined}
            title={isLocked ? t('profile.craft.primaryLocked') : undefined}
          >
            <motion.span animate={{ opacity: on ? 1 : 0.45, scale: on ? 1 : 0.9 }}>
              <DisciplineIcon id={d} size={26} />
            </motion.span>
            {t(th.labelKey)}
            <AnimatePresence initial={false}>
              {on && (
                <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
                  {isLocked ? <Lock className="ml-0.5 size-3 text-ink-3" /> : <Check className="ml-0.5 size-3.5" strokeWidth={2.6} />}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}

// ───────────────────────────── availability ─────────────────────────────

export const AVAIL_COLOR: Record<Availability, string> = { available: '#2fb36b', limited: '#f5a524', booked: '#e5484d' }

export function AvailDot({ value, size = 8, pulse }: { value: Availability; size?: number; pulse?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {pulse && value === 'available' && <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: AVAIL_COLOR[value] }} />}
      <span className="relative inline-flex size-full rounded-full" style={{ background: AVAIL_COLOR[value], boxShadow: `0 0 8px ${AVAIL_COLOR[value]}` }} />
    </span>
  )
}

/** Three big availability options with coloured dots and a sliding highlight. */
export function AvailabilityPicker({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
  const t = useT()
  const lid = useId()
  const opts: Availability[] = ['available', 'limited', 'booked']
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-[20px] bg-[var(--surface-2)] p-1">
      {opts.map((o) => {
        const active = value === o
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o)}
            className={cn('relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[16px] px-1.5 text-center transition-colors', active ? 'text-ink' : 'text-ink-3 hover:text-ink')}
          >
            {active && (
              <motion.span
                layoutId={`avail-${lid}`}
                className="absolute inset-0 rounded-[16px] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_20px_-10px_rgba(0,0,0,.25)]"
                style={{ boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${AVAIL_COLOR[o]} 55%, transparent), 0 10px 24px -14px ${AVAIL_COLOR[o]}` }}
                transition={spring.pill}
              />
            )}
            <span className="relative z-[1] flex items-center gap-1.5 text-[13px] font-medium">
              <AvailDot value={o} pulse={active} />
              <span className="truncate">{t(`core.availability.${o}`)}</span>
            </span>
            <span className="relative z-[1] hidden text-[11px] text-ink-3 sm:block">{t(`profile.avail.${o}Hint`)}</span>
          </button>
        )
      })}
    </div>
  )
}

// ───────────────────────────── small bits ─────────────────────────────

/** Animated check/cross row used by checklists. */
export function CheckRow({ ok, children, onClick, hint }: { ok: boolean; children: ReactNode; onClick?: () => void; hint?: ReactNode }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileHover={onClick ? { x: 3 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn('group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px]', onClick && 'hover:bg-[var(--surface-2)]')}
    >
      <motion.span
        className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', ok ? 'bg-accent text-accent-ink' : 'border-[1.5px] border-dashed border-line-2 text-transparent')}
        initial={false}
        animate={{ scale: ok ? [0.6, 1.15, 1] : 1 }}
        transition={{ duration: 0.4 }}
      >
        {ok && <Check className="size-3" strokeWidth={3.2} />}
      </motion.span>
      <span className={cn('min-w-0 flex-1 truncate', ok ? 'text-ink-3 line-through decoration-[var(--line-2)]' : 'text-ink')}>{children}</span>
      {hint && <span className="shrink-0 font-mono text-[11px] text-ink-3">{hint}</span>}
    </Comp>
  )
}

/** Horizontal scroll-spy navigation for long editor pages. */
export function SectionNav({ sections, className }: { sections: { id: string; label: ReactNode; icon?: ReactNode; done?: boolean }[]; className?: string }) {
  const [active, setActive] = useState(sections[0]?.id)
  const lid = useId()
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`sec-${s.id}`)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id.replace(/^sec-/, ''))
      },
      { rootMargin: '-20% 0px -65% 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [sections])
  // keep the active pill visible on phones
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`)
    if (el && scroller.current) {
      const s = scroller.current
      const left = el.offsetLeft - s.clientWidth / 2 + el.clientWidth / 2
      s.scrollTo({ left, behavior: 'smooth' })
    }
  }, [active])
  return (
    <nav className={cn('glass glass-strong sticky top-2 z-20 rounded-full p-1', className)}>
      <div ref={scroller} className="no-scrollbar flex gap-0.5 overflow-x-auto">
        {sections.map((s) => {
          const on = active === s.id
          return (
            <button
              key={s.id}
              data-nav={s.id}
              type="button"
              onClick={() => {
                setActive(s.id)
                document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={cn('relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors', on ? 'text-[var(--surface)] dark:text-ink' : 'text-ink-2 hover:text-ink')}
            >
              {on && <motion.span layoutId={`nav-${lid}`} className="absolute inset-0 rounded-full bg-ink dark:bg-[var(--surface-3)]" transition={spring.pill} />}
              <span className="relative z-[1] inline-flex items-center gap-1.5 [&_svg]:size-3.5">
                {s.icon}
                {s.label}
                {s.done !== undefined && (
                  <span className={cn('size-1.5 rounded-full', s.done ? 'bg-success' : 'bg-warning')} aria-hidden />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Small mono label above grouped controls. */
export function GroupLabel({ children, className, right }: { children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-2', className)}>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{children}</span>
      {right}
    </div>
  )
}
