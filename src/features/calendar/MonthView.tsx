import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { isSameDay, isSameMonth, isToday, isWeekend, setHours, setMinutes, startOfDay } from 'date-fns'
import { CalendarPlus, GripVertical, Plus } from 'lucide-react'
import { useApp } from '@/store'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { EASE_OUT, spring } from '@/lib/motion'
import { disciplineColor } from '@/theme/disciplines'
import { Button } from '@/components/ui/Button'
import { dayKey, groupByDay, isAuto, monthGrid, type CalItem } from './model'
import { KindDot, KindIcon, PersonAvatar, hhmm, kindSurface, timeRange, usePersonLookup } from './ui'

export interface ViewCallbacks {
  onCreateAt: (at: Date) => void
  onOpenItem: (item: CalItem, el: Element) => void
  onMore: (day: Date, items: CalItem[], el: Element) => void
  onMove: (item: CalItem, start: Date) => void
}

const MAX_CHIPS = 3

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 70, filter: 'blur(10px)', scale: 0.985 }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -50, filter: 'blur(8px)', transition: { duration: 0.16, ease: EASE_OUT } }),
}

export function MonthView({
  cursor,
  dir,
  items,
  selectedDay,
  onSelectDay,
  mobile,
  ...cb
}: ViewCallbacks & { cursor: Date; dir: number; items: CalItem[]; selectedDay: Date; onSelectDay: (d: Date) => void; mobile: boolean }) {
  const t = useT()
  const lang = useLang()
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const days = useMemo(() => monthGrid(cursor, weekStartsOn), [cursor, weekStartsOn])
  const byDay = useMemo(() => groupByDay(items), [items])
  const drag = useMonthDrag(cb.onMove)
  const monthKey = fmt(cursor, 'yyyy-MM')

  return (
    <div className="relative">
      <div className="grid grid-cols-7 gap-1 px-0.5 pb-2 sm:gap-1.5">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className={cn('px-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3', mobile && 'text-center')}>
            {fmt(d, mobile ? 'EEEEE' : 'EEE', lang)}
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div key={monthKey} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {days.map((day, i) => {
            const key = dayKey(day)
            const list = byDay.get(key) ?? []
            const inMonth = isSameMonth(day, cursor)
            const today = isToday(day)
            const sel = isSameDay(day, selectedDay)
            const over = drag.overKey === key
            return (
              <motion.div
                key={key}
                data-day={key}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: over ? 1.03 : 1 }}
                transition={{ opacity: { delay: i * 0.008, duration: 0.3 }, y: { delay: i * 0.008, ...spring.smooth }, scale: spring.snappy }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-chip]')) return
                  if (mobile) onSelectDay(day)
                  else cb.onCreateAt(setMinutes(setHours(startOfDay(day), 10), 0))
                }}
                className={cn(
                  'group relative flex cursor-pointer flex-col rounded-[14px] transition-colors duration-200 sm:rounded-[18px]',
                  mobile ? 'h-[58px] items-center pt-1.5' : 'min-h-[118px] p-1.5',
                  inMonth ? 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]' : 'bg-transparent hover:bg-[var(--surface-2)]',
                  inMonth && isWeekend(day) && 'bg-[color-mix(in_oklab,var(--surface-2)_70%,var(--surface-3))]',
                  over && 'bg-accent-soft ring-2 ring-[var(--accent)]',
                  mobile && sel && 'ring-2 ring-[var(--ink)]',
                )}
              >
                <div className={cn('flex items-center', mobile ? 'justify-center' : 'justify-between px-0.5')}>
                  <span
                    className={cn(
                      'relative inline-flex size-7 items-center justify-center rounded-full font-mono text-[12.5px] tabular-nums',
                      !inMonth && 'text-ink-4',
                      inMonth && !today && 'text-ink-2',
                      today && 'bg-ink font-semibold text-[var(--surface)] dark:bg-accent dark:text-accent-ink',
                    )}
                  >
                    {today && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-30 [animation-duration:2.4s]" />}
                    <span className="relative">{day.getDate()}</span>
                  </span>
                  {!mobile && (
                    <span className="flex items-center gap-1">
                      {list.length > 0 && (
                        <span className="font-mono text-[10.5px] text-ink-3 transition-opacity group-hover:opacity-0">{list.length}</span>
                      )}
                      <span className="absolute right-2 top-2 flex size-6 scale-75 items-center justify-center rounded-full bg-ink text-[var(--surface)] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 dark:bg-accent dark:text-accent-ink">
                        <Plus className="size-3.5" />
                      </span>
                    </span>
                  )}
                </div>
                {mobile ? (
                  <div className="mt-1 flex h-2 items-center gap-0.5">
                    {list.slice(0, 3).map((it) => (
                      <KindDot key={it.id} kind={it.kind} size={5} />
                    ))}
                    {list.length > 3 && <span className="text-[8px] leading-none text-ink-3">+</span>}
                  </div>
                ) : (
                  <div className="@container mt-1 flex min-w-0 flex-col gap-1">
                    {list.slice(0, list.length > MAX_CHIPS ? MAX_CHIPS - 1 : MAX_CHIPS).map((it) => (
                      <MonthChip key={it.id} item={it} drag={drag} onOpen={cb.onOpenItem} />
                    ))}
                    {list.length > MAX_CHIPS && (
                      <motion.button
                        data-chip
                        type="button"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={(e) => cb.onMore(day, list, e.currentTarget)}
                        className="h-[22px] rounded-lg px-1.5 text-left text-[11.5px] font-medium text-ink-2 hover:bg-[var(--surface)] hover:text-ink"
                      >
                        {t('calendar.more', { count: list.length - (MAX_CHIPS - 1) })}
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {mobile && <MobileDayList day={selectedDay} items={byDay.get(dayKey(selectedDay)) ?? []} onCreateAt={cb.onCreateAt} onOpenItem={cb.onOpenItem} />}

      {createPortal(
        <AnimatePresence>
          {drag.ghost && (
            <motion.div
              className="pointer-events-none fixed left-0 top-0 z-[90] flex h-7 max-w-[220px] items-center gap-1.5 rounded-xl px-2 text-[12px] font-medium shadow-[0_18px_40px_-12px_rgba(0,0,0,.45)]"
              style={{ ...kindSurface(drag.ghost.item.kind), x: drag.ghost.x + 10, y: drag.ghost.y - 14 }}
              initial={{ scale: 0.8, rotate: 0, opacity: 0 }}
              animate={{ scale: 1.06, rotate: -3, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15 } }}
              transition={spring.bouncy}
            >
              <GripVertical className="size-3 opacity-50" />
              <span className="truncate">{drag.ghost.item.title}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

function MonthChip({ item, drag, onOpen }: { item: CalItem; drag: MonthDrag; onOpen: (it: CalItem, el: Element) => void }) {
  const lang = useLang()
  const dragging = drag.ghost?.item.id === item.id
  return (
    <motion.button
      data-chip
      type="button"
      layout="position"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: dragging ? 0.35 : 1, x: 0 }}
      whileHover={{ y: -1.5, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      onPointerDown={(e) => drag.start(e, item)}
      onClick={(e) => {
        if (drag.consumeClick()) return
        onOpen(item, e.currentTarget)
      }}
      className={cn('flex h-[22px] w-full min-w-0 items-center gap-1 rounded-lg pl-2 pr-1 text-left text-[11.5px] font-medium', item.editable && 'cursor-grab active:cursor-grabbing')}
      style={kindSurface(item.kind, isAuto(item))}
      title={`${timeRange(item, lang)} · ${item.title}`}
    >
      <span className="hidden shrink-0 font-mono text-[10px] opacity-60 @min-[128px]:inline">{hhmm(item.start, lang)}</span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.discipline && <span className="size-1.5 shrink-0 rounded-full" style={{ background: disciplineColor(item.discipline) }} />}
    </motion.button>
  )
}

interface MonthDrag {
  ghost: { item: CalItem; x: number; y: number } | null
  overKey: string | null
  start: (e: RPointerEvent, item: CalItem) => void
  consumeClick: () => boolean
}

/** Pointer-based drag of month chips onto another day (mouse / pen only — touch keeps scrolling). */
function useMonthDrag(onMove: (item: CalItem, start: Date) => void): MonthDrag {
  const [ghost, setGhost] = useState<MonthDrag['ghost']>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const moved = useRef(false)

  const start = (e: RPointerEvent, item: CalItem) => {
    if (e.pointerType === 'touch' || e.button !== 0 || !item.editable) return
    const sx = e.clientX
    const sy = e.clientY
    moved.current = false
    let over: string | null = null
    const move = (ev: PointerEvent) => {
      if (!moved.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
      moved.current = true
      setGhost({ item, x: ev.clientX, y: ev.clientY })
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-day]') as HTMLElement | null
      over = el?.dataset.day ?? null
      setOverKey(over)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved.current && over && over !== dayKey(item.start)) {
        const [y, m, d] = over.split('-').map(Number)
        const next = new Date(item.start)
        next.setFullYear(y, m - 1, d)
        onMove(item, next)
      }
      setGhost(null)
      setOverKey(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const consumeClick = () => {
    if (moved.current) {
      moved.current = false
      return true
    }
    return false
  }
  return { ghost, overKey, start, consumeClick }
}

function MobileDayList({ day, items, onCreateAt, onOpenItem }: { day: Date; items: CalItem[]; onCreateAt: (d: Date) => void; onOpenItem: (it: CalItem, el: Element) => void }) {
  const t = useT()
  const lang = useLang()
  const person = usePersonLookup()
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[15px] font-medium tracking-[-0.01em]">{fmt(day, 'EEEE, d MMMM', lang)}</h4>
        <Button size="xs" variant="soft" icon={<CalendarPlus className="size-3.5" />} onClick={() => onCreateAt(setMinutes(setHours(startOfDay(day), 10), 0))}>
          {t('calendar.add')}
        </Button>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.length === 0 ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl bg-[var(--surface-2)] px-4 py-5 text-center text-[13px] text-ink-3">
            {t('calendar.dayEmpty')}
          </motion.p>
        ) : (
          <motion.ul key={dayKey(day)} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="space-y-1.5">
            {items.map((it) => {
              const p = person(it.withId)
              return (
                <motion.li key={it.id} variants={{ hidden: { opacity: 0, y: 10, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } }}>
                  <button
                    type="button"
                    onClick={(e) => onOpenItem(it, e.currentTarget)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:scale-[.98]"
                    style={kindSurface(it.kind, isAuto(it))}
                  >
                    <span className="w-11 shrink-0 font-mono text-[12px]">{hhmm(it.start, lang)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{it.title}</span>
                      <span className="flex items-center gap-1 text-[11.5px] opacity-70">
                        <KindIcon kind={it.kind} className="size-3" />
                        {t(`calendar.kind.${it.kind}`)}
                        {it.jobId && <span className="font-mono">· {it.jobId}</span>}
                      </span>
                    </span>
                    {p && <PersonAvatar person={p} size={26} />}
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

