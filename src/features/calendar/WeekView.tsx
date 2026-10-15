import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { addDays, addMinutes, isSameDay, isToday, startOfDay } from 'date-fns'
import { ArrowUp, Plus } from 'lucide-react'
import { useApp } from '@/store'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { formatDuration } from '@/lib/format'
import { EASE_OUT, spring } from '@/lib/motion'
import { DisciplineIcon } from '@/components/ui/Badge'
import { DAY_END_H, DAY_START_H, SNAP_MIN, dayKey, groupByDay, isAuto, layoutColumns, weekDays, type CalItem } from './model'
import { KindDot, KindIcon, PersonAvatar, hhmm, kindSurface, usePersonLookup } from './ui'
import type { ViewCallbacks } from './MonthView'

const HOURS = Array.from({ length: DAY_END_H - DAY_START_H }, (_, i) => DAY_START_H + i)
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

type DragState = { id: string; mode: 'move' | 'resize'; dMin: number; dDay: number } | null

export function WeekView({
  cursor,
  dir,
  items,
  now,
  mobile,
  onPickDay,
  onResize,
  ...cb
}: ViewCallbacks & {
  cursor: Date
  dir: number
  items: CalItem[]
  now: Date
  mobile: boolean
  onPickDay: (d: Date) => void
  onResize: (item: CalItem, durationMin: number) => void
}) {
  const t = useT()
  const lang = useLang()
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const week = useMemo(() => weekDays(cursor, weekStartsOn), [cursor, weekStartsOn])
  const days = mobile ? [startOfDay(cursor)] : week
  const byDay = useMemo(() => groupByDay(items), [items])
  const hourH = mobile ? 60 : 54
  const totalH = HOURS.length * hourH
  const scrollRef = useRef<HTMLDivElement>(null)
  const colsRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState>(null)
  const dragRef = useRef<DragState>(null)
  const suppressClick = useRef(false)
  const [hover, setHover] = useState<{ day: number; min: number } | null>(null)
  const weekKey = dayKey(days[0])

  // scroll to "now - 1h" (or 08:00) when the week changes
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const showsToday = days.some((d) => isToday(d))
    const target = showsToday ? minutesOf(new Date()) - 90 : 8 * 60
    el.scrollTo({ top: Math.max(0, ((target - DAY_START_H * 60) / 60) * hourH), behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, mobile])

  const colWidth = () => {
    const el = colsRef.current
    return el ? el.getBoundingClientRect().width / days.length : 100
  }

  const yToMinutes = (y: number, snap = 30) => {
    const raw = DAY_START_H * 60 + (y / hourH) * 60
    return Math.max(DAY_START_H * 60, Math.min(DAY_END_H * 60 - snap, Math.floor(raw / snap) * snap))
  }

  const startDrag = (e: RPointerEvent<HTMLElement>, item: CalItem, mode: 'move' | 'resize') => {
    if (e.pointerType === 'touch' || e.button !== 0 || !item.editable) return
    e.stopPropagation()
    const sx = e.clientX
    const sy = e.clientY
    const cw = colWidth()
    let started = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!started && Math.hypot(dx, dy) < 4) return
      started = true
      const dMin = Math.round(((dy / hourH) * 60) / SNAP_MIN) * SNAP_MIN
      const dayIdx = days.findIndex((d) => isSameDay(d, item.start))
      const dDay = mode === 'move' ? Math.max(-dayIdx, Math.min(days.length - 1 - dayIdx, Math.round(dx / cw))) : 0
      const next: DragState = { id: item.id, mode, dMin: mode === 'resize' ? Math.max(SNAP_MIN - item.durationMin, dMin) : dMin, dDay }
      dragRef.current = next
      setDrag(next)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!started || !d) return
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
      if (d.mode === 'move' && (d.dMin || d.dDay)) cb.onMove(item, addMinutes(addDays(item.start, d.dDay), d.dMin))
      if (d.mode === 'resize' && d.dMin) onResize(item, item.durationMin + d.dMin)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const nowMin = minutesOf(now)
  const nowInRange = nowMin >= DAY_START_H * 60 && nowMin <= DAY_END_H * 60
  const nowTop = ((nowMin - DAY_START_H * 60) / 60) * hourH
  const gridCols = { gridTemplateColumns: `${mobile ? 44 : 56}px repeat(${days.length}, minmax(0, 1fr))` }

  return (
    <div>
      {/* mobile: day strip */}
      {mobile && (
        <div className="mb-3 grid grid-cols-7 gap-1">
          {week.map((d) => {
            const active = isSameDay(d, cursor)
            const count = byDay.get(dayKey(d))?.length ?? 0
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => onPickDay(d)}
                className={cn('relative flex h-[58px] flex-col items-center justify-center rounded-2xl transition-colors', active ? 'text-[var(--surface)] dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2')}
              >
                {active && <motion.span layoutId="week-day-pill" className="absolute inset-0 rounded-2xl bg-ink dark:bg-accent" transition={spring.pill} />}
                <span className="relative font-mono text-[10px] uppercase opacity-70">{fmt(d, 'EEEEE', lang)}</span>
                <span className={cn('relative font-mono text-[15px] font-medium', isToday(d) && !active && 'text-accent-text')}>{d.getDate()}</span>
                <span className="relative mt-0.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(3, count) }, (_, i) => (
                    <span key={i} className="size-1 rounded-full bg-current opacity-70" />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* header */}
      <div className={cn('grid border-b border-line pb-2', mobile && 'hidden')} style={gridCols}>
        <div className="self-end pr-2 text-right font-mono text-[10px] text-ink-3">{fmt(days[0], 'O', lang).replace('GMT', 'UTC')}</div>
        {days.map((d) => {
          const today = isToday(d)
          const count = byDay.get(dayKey(d))?.length ?? 0
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPickDay(d)}
              className="group flex flex-col items-center gap-0.5 rounded-xl py-1 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.08em]', today ? 'text-accent-text' : 'text-ink-3')}>{fmt(d, mobile ? 'EEEE' : 'EEE', lang)}</span>
              <span
                className={cn(
                  'inline-flex size-8 items-center justify-center rounded-full font-mono text-[15px] font-medium tabular-nums transition-transform group-hover:scale-105',
                  today ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'text-ink',
                )}
              >
                {d.getDate()}
              </span>
              <span className="h-3 font-mono text-[9.5px] text-ink-3">{count ? t('calendar.eventsShort', { count }) : ''}</span>
            </button>
          )
        })}
      </div>

      {/* grid */}
      <div ref={scrollRef} className="relative max-h-[min(640px,62vh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]" style={{ scrollbarGutter: 'stable' }}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={weekKey + (mobile ? 'm' : '')}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } }}
            exit={{ opacity: 0, x: dir * -40, filter: 'blur(6px)', transition: { duration: 0.15 } }}
            className="relative grid"
            style={{ ...gridCols, height: totalH + 12 }}
          >
            {/* hour gutter */}
            <div className="relative">
              {HOURS.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[10.5px] text-ink-3" style={{ top: (h - DAY_START_H) * hourH + 6 }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
              {days.some((d) => isToday(d)) && nowInRange && (
                <motion.span
                  className="absolute right-1 z-[3] -translate-y-1/2 rounded-full bg-danger px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow-[0_4px_12px_-4px_var(--danger)]"
                  initial={false}
                  animate={{ top: nowTop + 6 }}
                  transition={spring.smooth}
                >
                  {hhmm(now, lang)}
                </motion.span>
              )}
            </div>

            {/* day columns */}
            <div ref={colsRef} className="relative grid" style={{ gridColumn: '2 / -1', gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, marginTop: 6 }}>
              {days.map((d, di) => {
                const list = byDay.get(dayKey(d)) ?? []
                const layout = layoutColumns(list)
                const today = isToday(d)
                const past = d.getTime() < startOfDay(now).getTime()
                return (
                  <div
                    key={d.toISOString()}
                    className={cn('relative border-l border-line', today && 'bg-accent-softer', past && 'bg-[repeating-linear-gradient(-45deg,transparent_0_8px,color-mix(in_oklab,var(--ink)_3%,transparent)_8px_9px)]')}
                    style={{
                      height: totalH,
                      backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px ${hourH / 2}px, color-mix(in oklab, var(--line) 45%, transparent) ${hourH / 2}px ${hourH / 2 + 1}px, transparent ${hourH / 2 + 1}px ${hourH}px)`,
                    }}
                    onPointerMove={(e) => {
                      if (drag || e.pointerType === 'touch') return
                      if ((e.target as HTMLElement).closest('[data-block]')) return setHover(null)
                      const r = e.currentTarget.getBoundingClientRect()
                      setHover({ day: di, min: yToMinutes(e.clientY - r.top) })
                    }}
                    onPointerLeave={() => setHover(null)}
                    onClick={(e) => {
                      if (suppressClick.current || (e.target as HTMLElement).closest('[data-block]')) return
                      const r = e.currentTarget.getBoundingClientRect()
                      cb.onCreateAt(addMinutes(startOfDay(d), yToMinutes(e.clientY - r.top)))
                    }}
                  >
                    {/* hover slot */}
                    <AnimatePresence>
                      {hover?.day === di && !drag && (
                        <motion.div
                          className="pointer-events-none absolute inset-x-1 z-[1] flex items-start gap-1 rounded-xl border border-dashed border-[var(--accent-line)] bg-accent-softer px-2 py-1 font-mono text-[10.5px] text-accent-text"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1, top: ((hover.min - DAY_START_H * 60) / 60) * hourH }}
                          exit={{ opacity: 0 }}
                          transition={{ top: spring.snappy, opacity: { duration: 0.12 } }}
                          style={{ height: hourH / 2 }}
                        >
                          <Plus className="size-3" />
                          {hhmm(addMinutes(startOfDay(d), hover.min), lang)}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {list.map((it, ii) => (
                      <WeekBlock
                        key={it.id}
                        item={it}
                        index={ii}
                        pos={layout.get(it.id) ?? { col: 0, cols: 1 }}
                        hourH={hourH}
                        totalH={totalH}
                        drag={drag?.id === it.id ? drag : null}
                        colW={colWidth}
                        onPointerDown={(e, mode) => startDrag(e, it, mode)}
                        onOpen={(el) => !suppressClick.current && cb.onOpenItem(it, el)}
                      />
                    ))}

                    {today && nowInRange && (
                      <motion.div className="pointer-events-none absolute inset-x-0 z-[4] h-0" initial={false} animate={{ top: nowTop }} transition={spring.smooth}>
                        <div className="absolute -left-[5px] -top-[5px] size-2.5 rounded-full bg-danger shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_25%,transparent)]" />
                        <div className="h-[2px] -translate-y-1/2 bg-danger shadow-[0_0_12px_var(--danger)]" />
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function WeekBlock({
  item,
  index,
  pos,
  hourH,
  totalH,
  drag,
  colW,
  onPointerDown,
  onOpen,
}: {
  item: CalItem
  index: number
  pos: { col: number; cols: number }
  hourH: number
  totalH: number
  drag: DragState
  colW: () => number
  onPointerDown: (e: RPointerEvent<HTMLElement>, mode: 'move' | 'resize') => void
  onOpen: (el: Element) => void
}) {
  const lang = useLang()
  const t = useT()
  const person = usePersonLookup()(item.withId)
  const startMin = minutesOf(item.start)
  const early = startMin < DAY_START_H * 60
  const rawTop = ((startMin - DAY_START_H * 60) / 60) * hourH
  const pointLike = item.kind === 'deadline' || item.kind === 'milestone'
  const dur = item.durationMin + (drag?.mode === 'resize' ? drag.dMin : 0)
  const height = pointLike ? 26 : Math.max(24, (dur / 60) * hourH - 3)
  const top = Math.min(Math.max(0, rawTop), totalH - height)
  const moveY = drag?.mode === 'move' ? (drag.dMin / 60) * hourH : 0
  const moveX = drag?.mode === 'move' ? drag.dDay * colW() : 0
  const preview = drag ? addMinutes(addDays(item.start, drag.mode === 'move' ? drag.dDay : 0), drag.mode === 'move' ? drag.dMin : 0) : item.start
  const tall = height >= 52
  const width = `calc(${100 / pos.cols}% - 6px)`
  const left = `calc(${(pos.col / pos.cols) * 100}% + 3px)`

  return (
    <motion.div
      data-block
      role="button"
      tabIndex={0}
      aria-label={`${hhmm(item.start, lang)} ${item.title}`}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{
        opacity: 1,
        scale: drag ? 1.03 : 1,
        x: moveX,
        y: moveY,
        boxShadow: drag ? '0 22px 44px -16px rgba(0,0,0,.45)' : '0 1px 2px rgba(0,0,0,.04)',
      }}
      transition={{
        opacity: { delay: index * 0.03, duration: 0.3 },
        scale: spring.snappy,
        x: drag ? { duration: 0 } : spring.snappy,
        y: drag ? { duration: 0 } : spring.snappy,
      }}
      whileHover={drag ? undefined : { scale: 1.02, zIndex: 5 }}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onClick={(e) => onOpen(e.currentTarget)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(e.currentTarget)}
      className={cn(
        'group absolute z-[2] flex flex-col overflow-hidden rounded-xl px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]',
        item.editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        pointLike && 'flex-row items-center gap-1.5 py-0',
        !pointLike && height < 40 && !drag && 'justify-center py-0',
        drag && 'z-[6]',
      )}
      style={{ top, height, left, width, ...kindSurface(item.kind, isAuto(item)) }}
    >
      {pointLike ? (
        <>
          <KindIcon kind={item.kind} className="size-3 shrink-0" />
          <span className="shrink-0 font-mono text-[10px] opacity-70">{hhmm(item.start, lang)}</span>
          <span className="min-w-0 truncate text-[11.5px] font-medium">{item.title}</span>
        </>
      ) : height < 40 && !drag ? (
        <div className="flex min-w-0 items-center gap-1.5">
          {early && <ArrowUp className="size-3 shrink-0" />}
          <span className="shrink-0 font-mono text-[10px] opacity-70">{hhmm(item.start, lang)}</span>
          <span className="truncate text-[12px] font-medium leading-tight">{item.title}</span>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-1">
            {early && <ArrowUp className="size-3 shrink-0" />}
            <span className="truncate text-[12px] font-medium leading-tight">{item.title}</span>
          </div>
          <span className="mt-0.5 font-mono text-[10.5px] opacity-70">
            {hhmm(preview, lang)}
            {tall || drag ? ` – ${hhmm(addMinutes(preview, dur), lang)}` : ''}
            {drag?.mode === 'resize' ? ` · ${formatDuration(dur)}` : ''}
          </span>
          {tall && (
            <div className="mt-auto flex items-center gap-1.5 pb-0.5">
              {item.job && <DisciplineIcon id={item.job.discipline} size={16} />}
              {item.jobId && <span className="truncate font-mono text-[10px] opacity-70">{item.jobId}</span>}
              <span className="ml-auto flex items-center gap-1">
                <KindDot kind={item.kind} size={6} />
                {person && <PersonAvatar person={person} size={18} />}
              </span>
            </div>
          )}
        </>
      )}
      {item.editable && !pointLike && (
        <div
          aria-label={t('calendar.resize')}
          onPointerDown={(e) => onPointerDown(e, 'resize')}
          className="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
        >
          <span className="h-[3px] w-6 rounded-full bg-current opacity-40" />
        </div>
      )}
    </motion.div>
  )
}
