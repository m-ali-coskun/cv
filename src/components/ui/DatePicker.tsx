import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { DATE_LOCALES } from '@/lib/dates'
import { localeOf } from '@/lib/format'
import { EASE_IOS, FILTER_TWEEN } from '@/lib/motion'
import { useLang } from '@/i18n'
import { useApp } from '@/store'
import type { Lang } from '@/store/types'

const STR: Record<Lang, Record<string, string>> = {
  en: {
    placeholder: 'Pick a date',
    today: 'Today',
    prev: 'Previous month',
    next: 'Next month',
    time: 'Time',
    clear: 'Clear',
    done: 'Done',
    p3: '+3 days',
    p7: '+1 week',
    p14: '+2 weeks',
    p30: '+1 month',
    hour: 'Hour',
    minute: 'Minute',
    pastDisabled: 'Not available',
  },
  de: {
    placeholder: 'Datum wählen',
    today: 'Heute',
    prev: 'Vorheriger Monat',
    next: 'Nächster Monat',
    time: 'Uhrzeit',
    clear: 'Leeren',
    done: 'Fertig',
    p3: '+3 Tage',
    p7: '+1 Woche',
    p14: '+2 Wochen',
    p30: '+1 Monat',
    hour: 'Stunde',
    minute: 'Minute',
    pastDisabled: 'Nicht verfügbar',
  },
  tr: {
    placeholder: 'Tarih seç',
    today: 'Bugün',
    prev: 'Önceki ay',
    next: 'Sonraki ay',
    time: 'Saat',
    clear: 'Temizle',
    done: 'Tamam',
    p3: '+3 gün',
    p7: '+1 hafta',
    p14: '+2 hafta',
    p30: '+1 ay',
    hour: 'Saat',
    minute: 'Dakika',
    pastDisabled: 'Uygun değil',
  },
}

const toDate = (v: string | Date | null | undefined) => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return isValid(d) ? d : null
}
const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** "today", "tomorrow", "in 9 days", "in 3 months", "2 days ago" — localised via Intl. */
function relativeDay(d: Date, lang: Lang) {
  const days = differenceInCalendarDays(d, new Date())
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: 'auto' })
  return Math.abs(days) > 60 ? rtf.format(Math.round(days / 30), 'month') : rtf.format(days, 'day')
}

// ─────────────────────────── Month calendar ───────────────────────────

export interface MonthCalendarProps {
  value: Date | null
  onSelect: (day: Date) => void
  min?: Date | null
  max?: Date | null
  /** Coloured dots under days, keyed 'yyyy-MM-dd' (e.g. deadlines). */
  markers?: Record<string, string | string[]>
  /** Initial month shown (defaults to value or today). */
  initialMonth?: Date
  className?: string
}

/**
 * Month grid with slide transitions between months, a sliding selection pill
 * (shared layout), today ring, disabled days and full keyboard support
 * (arrows, PageUp/PageDown, Home/End, Enter).
 */
export function MonthCalendar({ value, onSelect, min, max, markers, initialMonth, className }: MonthCalendarProps) {
  const lang = useLang()
  const s = STR[lang]
  const locale = DATE_LOCALES[lang]
  const weekStartsOn = useApp((st) => st.settings.weekStartsOn)
  const uid = useId()
  const [month, setMonth] = useState(() => startOfMonth(initialMonth ?? value ?? new Date()))
  const [dir, setDir] = useState(0)
  const [focusDay, setFocusDay] = useState<Date>(() => value ?? new Date())
  const gridRef = useRef<HTMLDivElement>(null)
  const kbFocus = useRef(false)

  const minD = min ? startOfDay(min) : null
  const maxD = max ? startOfDay(max) : null
  const disabled = useCallback((d: Date) => (minD ? isBefore(d, minD) : false) || (maxD ? isAfter(d, maxD) : false), [minD, maxD])

  const days = useMemo(() => {
    const start = startOfWeek(month, { weekStartsOn })
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [month, weekStartsOn])
  const weekdays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn })
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'EEEEEE', { locale }))
  }, [weekStartsOn, locale])

  const go = (delta: number) => {
    setDir(delta)
    setMonth((m) => addMonths(m, delta))
  }

  useEffect(() => {
    if (!kbFocus.current) return
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${dayKey(focusDay)}"]`)
    el?.focus()
  }, [focusDay, month])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, -1),
      PageDown: () => addMonths(focusDay, 1),
      Home: () => startOfWeek(focusDay, { weekStartsOn }),
      End: () => endOfWeek(focusDay, { weekStartsOn }),
    }
    const fn = map[e.key]
    if (!fn) return
    e.preventDefault()
    kbFocus.current = true
    const next = fn()
    if (!isSameMonth(next, month)) {
      setDir(isAfter(next, month) ? 1 : -1)
      setMonth(startOfMonth(next))
    }
    setFocusDay(next)
  }

  // follow external value changes (presets, typing elsewhere)
  const monthRef = useRef(month)
  monthRef.current = month
  const valueTime = value?.getTime()
  useEffect(() => {
    if (valueTime === undefined) return
    const v = new Date(valueTime)
    setFocusDay(v)
    const m = monthRef.current
    if (!isSameMonth(v, m)) {
      setDir(isAfter(v, m) ? 1 : -1)
      setMonth(startOfMonth(v))
    }
  }, [valueTime])

  const monthKey = format(month, 'yyyy-MM')

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="relative h-7 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={monthKey}
              custom={dir}
              initial={{ opacity: 0, y: dir >= 0 ? 14 : -14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: dir >= 0 ? -14 : 14, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: EASE_IOS }}
              className="absolute inset-0 flex items-center pl-1 text-[15px] font-medium capitalize tracking-[-0.01em]"
              aria-live="polite"
            >
              {format(month, 'LLLL yyyy', { locale })}
            </motion.div>
          </AnimatePresence>
        </div>
        <NavBtn label={s.prev} onClick={() => go(-1)}>
          <ChevronLeft className="size-4" />
        </NavBtn>
        <NavBtn label={s.next} onClick={() => go(1)}>
          <ChevronRight className="size-4" />
        </NavBtn>
      </div>

      <div className="grid grid-cols-7 pb-1">
        {weekdays.map((w) => (
          <span key={w} className="py-1 text-center font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-3">
            {w}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden" style={{ height: 6 * 42 }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={monthKey}
            ref={gridRef}
            role="grid"
            aria-label={format(month, 'LLLL yyyy', { locale })}
            className="grid grid-cols-7 gap-y-0.5"
            initial={{ opacity: 0, x: dir >= 0 ? 60 : -60, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: dir >= 0 ? -60 : 60, filter: 'blur(6px)' }}
            transition={{ duration: 0.34, ease: EASE_IOS }}
            onKeyDown={onKey}
          >
            {days.map((d) => {
              const k = dayKey(d)
              const out = !isSameMonth(d, month)
              const sel = !!value && isSameDay(d, value)
              const dis = disabled(d)
              const today = isToday(d)
              const focusable = isSameDay(d, focusDay) && isSameMonth(focusDay, month)
              const mk = markers?.[k]
              const dots = mk ? (Array.isArray(mk) ? mk : [mk]).slice(0, 3) : []
              return (
                <div key={k} role="gridcell" aria-selected={sel} className="flex h-10 items-center justify-center">
                  <button
                    type="button"
                    data-day={k}
                    tabIndex={focusable || (!isSameMonth(focusDay, month) && !out && d.getDate() === 1) ? 0 : -1}
                    disabled={dis}
                    aria-label={format(d, 'PPPP', { locale }) + (dis ? ` — ${s.pastDisabled}` : '')}
                    aria-current={today ? 'date' : undefined}
                    onClick={() => {
                      setFocusDay(d)
                      if (out) {
                        setDir(isAfter(d, month) ? 1 : -1)
                        setMonth(startOfMonth(d))
                      }
                      onSelect(d)
                    }}
                    onFocus={() => setFocusDay(d)}
                    className={cn(
                      'relative flex size-[38px] items-center justify-center rounded-full text-[13.5px] tabular-nums outline-none transition-[color,background-color,transform] duration-150 active:scale-90',
                      sel ? 'text-[var(--surface)] dark:text-[var(--accent-ink)]' : out ? 'text-ink-4' : 'text-ink',
                      !sel && !dis && 'hover:bg-[var(--surface-2)]',
                      dis && 'cursor-not-allowed text-ink-4 line-through decoration-[var(--ink-4)]',
                      today && !sel && 'font-semibold',
                      'focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    )}
                  >
                    {sel && (
                      <motion.span
                        layoutId={`${uid}-sel`}
                        className="absolute inset-0 rounded-full bg-ink shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)] dark:bg-accent"
                        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                      />
                    )}
                    {today && !sel && <span className="absolute inset-[3px] rounded-full ring-[1.5px] ring-[var(--accent)]" />}
                    <span className="relative z-[1]">{d.getDate()}</span>
                    {dots.length > 0 && (
                      <span className="absolute bottom-[3px] left-1/2 z-[1] flex -translate-x-1/2 gap-[2px]">
                        {dots.map((c, i) => (
                          <span key={i} className="size-[4px] rounded-full" style={{ background: sel ? 'currentColor' : c }} />
                        ))}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]"
    >
      {children}
    </motion.button>
  )
}

// ─────────────────────────── DatePicker ───────────────────────────

export interface DatePickerProps {
  /** ISO string (or null/undefined for empty). */
  value?: string | null
  onChange: (iso: string) => void
  /** Days before this are disabled (ISO or Date). */
  min?: string | Date
  max?: string | Date
  /** Also pick a time (hour + 5-minute steps). */
  withTime?: boolean
  /** Time used when a day is picked and there was no previous value ('HH:mm'). */
  defaultTime?: string
  /** Quick presets row (+3 days, +1 week, +2 weeks, +1 month). Default true. */
  presets?: boolean
  /** Show a "Clear" button; calls onClear. */
  onClear?: () => void
  /** Dots under days, keyed 'yyyy-MM-dd'. */
  markers?: Record<string, string | string[]>
  placeholder?: string
  disabled?: boolean
  /** Popover alignment relative to the field. */
  align?: 'start' | 'end'
  /** Show "in 7 days" next to the date. Default true. */
  showRelative?: boolean
  id?: string
  className?: string
  /** Compact field height. */
  size?: 'sm' | 'md'
}

/**
 * Date field + liquid-glass calendar popover (bottom sheet on phones).
 * Value in/out is an ISO string. Locale & week start follow the app settings.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  withTime = false,
  defaultTime = '17:00',
  presets = true,
  onClear,
  markers,
  placeholder,
  disabled,
  align = 'start',
  showRelative = true,
  id,
  className,
  size = 'md',
}: DatePickerProps) {
  const lang = useLang()
  const s = STR[lang]
  const locale = DATE_LOCALES[lang]
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; origin: string }>({ left: 0, top: 0, origin: 'top left' })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const date = toDate(value)
  const minD = toDate(min ?? null)
  const maxD = toDate(max ?? null)
  const W = 332

  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const isMobile = vw < 640
    setMobile(isMobile)
    if (isMobile) return
    const r = t.getBoundingClientRect()
    const estH = popRef.current?.offsetHeight ?? (withTime ? 520 : 470)
    let left = align === 'end' ? r.right - W : r.left
    left = Math.max(8, Math.min(left, vw - W - 8))
    const below = vh - r.bottom
    const side = align === 'end' ? 'right' : 'left'
    if (below < estH + 16 && r.top > below) setPos({ left, bottom: vh - r.top + 8, origin: `bottom ${side}` })
    else setPos({ left, top: r.bottom + 8, origin: `top ${side}` })
  }, [align, withTime])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const withClock = (d: Date) => {
    const out = new Date(d)
    if (date) out.setHours(date.getHours(), date.getMinutes(), 0, 0)
    else {
      const [h, m] = defaultTime.split(':').map(Number)
      out.setHours(h || 0, m || 0, 0, 0)
    }
    return out
  }
  const pick = (d: Date, close = !withTime) => {
    onChange(withClock(d).toISOString())
    if (close) setOpen(false)
  }
  const setTime = (h: number, m: number) => {
    const base = date ?? withClock(new Date())
    const out = new Date(base)
    out.setHours(h, m, 0, 0)
    onChange(out.toISOString())
  }

  const presetList = [
    { k: 'today', label: s.today, d: 0 },
    { k: 'p3', label: s.p3, d: 3 },
    { k: 'p7', label: s.p7, d: 7 },
    { k: 'p14', label: s.p14, d: 14 },
    { k: 'p30', label: s.p30, m: 1 },
  ]
  const presetDate = (p: { d?: number; m?: number }) => (p.m ? addMonths(new Date(), p.m) : addDays(new Date(), p.d ?? 0))

  const relative = date ? relativeDay(date, lang) : null
  const overdue = date ? isBefore(startOfDay(date), startOfDay(new Date())) : false
  const label = date ? format(date, lang === 'en' ? 'EEE, MMM d, yyyy' : lang === 'de' ? 'EEE, d. MMM yyyy' : 'd MMM yyyy, EEE', { locale }) : (placeholder ?? s.placeholder)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

  const panel = (
    <div className="relative z-[1] p-4">
      {presets && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presetList.map((p, i) => {
            const pd = presetDate(p)
            const dis = (minD && isBefore(startOfDay(pd), startOfDay(minD))) || (maxD && isAfter(startOfDay(pd), startOfDay(maxD)))
            const active = !!date && isSameDay(pd, date)
            return (
              <motion.button
                key={p.k}
                type="button"
                disabled={!!dis}
                onClick={() => pick(pd)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.3 }}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'h-7.5 shrink-0 rounded-full px-2.5 text-[12px] font-medium transition-colors disabled:opacity-40',
                  active ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)] hover:text-ink',
                )}
              >
                {p.label}
              </motion.button>
            )
          })}
        </div>
      )}
      <MonthCalendar value={date} onSelect={(d) => pick(d)} min={minD} max={maxD} markers={markers} />
      {withTime && (
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
            <Clock className="size-4 text-ink-3" />
            {s.time}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <TimeSelect
              label={s.hour}
              value={date?.getHours() ?? Number(defaultTime.split(':')[0])}
              options={Array.from({ length: 24 }, (_, i) => i)}
              onChange={(h) => setTime(h, date?.getMinutes() ?? Number(defaultTime.split(':')[1]))}
            />
            <span className="font-mono text-ink-3">:</span>
            <TimeSelect
              label={s.minute}
              value={date ? date.getMinutes() - (date.getMinutes() % 5) : Number(defaultTime.split(':')[1])}
              options={minutes}
              onChange={(m) => setTime(date?.getHours() ?? Number(defaultTime.split(':')[0]), m)}
            />
          </div>
        </div>
      )}
      {(onClear || withTime || mobile) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {onClear && date ? (
            <button
              type="button"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
              className="h-9 rounded-full px-3 text-[13px] font-medium text-ink-3 hover:bg-[var(--surface-2)] hover:text-danger"
            >
              {s.clear}
            </button>
          ) : (
            <span />
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(false)}
            className="h-9 rounded-full bg-ink px-4 text-[13px] font-medium text-[var(--surface)] dark:bg-accent dark:text-accent-ink"
          >
            {s.done}
          </motion.button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <motion.button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) place()
          setOpen((o) => !o)
        }}
        whileTap={{ scale: 0.985 }}
        className={cn(
          'group flex w-full min-w-0 items-center gap-2.5 rounded-2xl border bg-[var(--surface)]/70 px-3.5 text-left text-[14px] outline-none transition-[border-color,box-shadow,background-color] duration-200 disabled:opacity-60',
          size === 'sm' ? 'h-9' : 'h-11',
          open ? 'border-[var(--accent-line)] bg-[var(--surface)] shadow-[0_0_0_4px_var(--accent-softer)]' : 'border-line hover:border-line-2',
          'focus-visible:border-[var(--accent-line)] focus-visible:shadow-[0_0_0_4px_var(--accent-softer)]',
          className,
        )}
      >
        <motion.span animate={{ rotate: open ? -8 : 0, scale: open ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="text-ink-3">
          <CalendarDays className="size-4" />
        </motion.span>
        <span className={cn('min-w-0 flex-1 truncate', date ? 'text-ink' : 'text-ink-3')}>
          {label}
          {withTime && date && <span className="ml-1.5 font-mono text-[12.5px] text-ink-2">{format(date, 'HH:mm')}</span>}
        </span>
        {showRelative && relative && (
          <span
            className={cn(
              'hidden shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] min-[380px]:inline',
              overdue ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-text',
            )}
          >
            {relative}
          </span>
        )}
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open &&
            (mobile ? (
              <div className="fixed inset-0 z-[85]" key="sheet">
                <motion.div
                  className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  ref={popRef}
                  role="dialog"
                  aria-modal
                  className="glass glass-strong safe-bottom absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[30px] !bg-[color-mix(in_oklab,var(--surface)_92%,transparent)]"
                  initial={{ y: '100%' }}
                  animate={{ y: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } }}
                  exit={{ y: '100%', transition: { duration: 0.22, ease: EASE_IOS } }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_, info) => info.offset.y > 100 && setOpen(false)}
                >
                  <div className="relative z-[1] mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-[var(--line-2)]" />
                  <button type="button" aria-label={s.done} onClick={() => setOpen(false)} className="absolute right-3 top-3 z-[2] flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)]">
                    <X className="size-4" />
                  </button>
                  <div className="mx-auto max-w-[400px] pt-2">{panel}</div>
                </motion.div>
              </div>
            ) : (
              <motion.div
                key="pop"
                ref={popRef}
                role="dialog"
                className="glass glass-strong fixed z-[85] overflow-hidden rounded-[24px] !bg-[color-mix(in_oklab,var(--surface)_90%,transparent)] shadow-[0_30px_80px_-20px_rgba(0,0,0,.35)]"
                style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: W, transformOrigin: pos.origin }}
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)', y: pos.bottom !== undefined ? 8 : -8 }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', transition: { duration: 0.14 } }}
                transition={{ type: 'spring', stiffness: 460, damping: 32, filter: FILTER_TWEEN }}
              >
                {panel}
              </motion.div>
            ))}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function TimeSelect({ value, options, onChange, label }: { value: number; options: number[]; onChange: (v: number) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 cursor-pointer appearance-none rounded-xl border border-line bg-[var(--surface-2)] px-2.5 text-center font-mono text-[13px] text-ink outline-none focus:border-[var(--accent-line)]"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {String(o).padStart(2, '0')}
        </option>
      ))}
    </select>
  )
}
