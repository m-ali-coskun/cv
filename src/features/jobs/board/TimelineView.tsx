import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { addDays, differenceInCalendarDays, getISOWeek, isSameDay, isWeekend, startOfDay } from 'date-fns'
import { CalendarRange, Crosshair, Diamond, Flag } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { BOARD_STATUSES, type Role } from '@/store/types'
import { dueLabel, fmt, shortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { EASE_OUT } from '@/lib/motion'
import { STATUS_COLOR, StatusBadge } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Segmented'
import { ProgressBar } from '@/components/ui/Progress'
import { CounterpartAvatar } from '../shared/JobCard'
import { URGENCY_TEXT, isClosed, useIsMobile, type JobRow } from '../shared/model'
import { useJobsPrefs, type TimelineZoom } from './prefs'

const DAY = 864e5
const ROW_H = 56

/**
 * Gantt: one bar per job from start (started/created) to deadline, coloured
 * by stage with a progress overlay, overdue tail, milestone diamonds and
 * delivery dots. Sticky job labels, week/day header, today marker.
 */
export function TimelineView({ rows, role }: { rows: JobRow[]; role: Role }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const zoom = useJobsPrefs((s) => s.zoom)
  const setPrefs = useJobsPrefs((s) => s.set)
  const mobile = useIsMobile()
  const LABEL = mobile ? 132 : 248
  const px = zoom === 'day' ? (mobile ? 34 : 42) : mobile ? 12 : 16
  const scroller = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ row: JobRow; x: number; y: number } | null>(null)
  const [leftDay, setLeftDay] = useState(0)

  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => {
    let min = addDays(today, -14).getTime()
    let max = addDays(today, 28).getTime()
    for (const r of rows) {
      const s = new Date(r.job.startedAt ?? r.job.createdAt).getTime()
      const e = new Date(r.job.dueAt).getTime()
      min = Math.min(min, s)
      max = Math.max(max, e)
    }
    const start = startOfDay(new Date(Math.max(min, addDays(today, -60).getTime()) - 3 * DAY))
    const end = startOfDay(new Date(Math.min(max, addDays(today, 120).getTime()) + 6 * DAY))
    const days = differenceInCalendarDays(end, start)
    return { start, days, list: Array.from({ length: days }, (_, i) => addDays(start, i)) }
  }, [rows, today])

  const x = (d: Date | string) => (differenceInCalendarDays(startOfDay(new Date(d)), range.start) + (typeof d === 'string' ? fracOfDay(d) : 0)) * px
  const width = range.days * px
  const todayX = x(new Date().toISOString())

  const scrollToToday = (smooth = true) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, todayX - (el.clientWidth - LABEL) * 0.3), behavior: smooth ? 'smooth' : 'auto' })
  }
  useLayoutEffect(() => {
    scrollToToday(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, LABEL])

  const months = useMemo(() => {
    const out: { d: Date; i: number }[] = []
    range.list.forEach((d, i) => {
      if (i === 0 || d.getDate() === 1) out.push({ d, i })
    })
    return out
  }, [range])

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } }} className="card relative overflow-hidden">
      {/* toolbar */}
      <div className="relative z-[2] flex flex-wrap items-center gap-2 px-4 pb-3 pt-4">
        <span className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em]">
          <CalendarRange className="size-4 text-ink-3" />
          {t('jobs.timeline.title')}
        </span>
        <span className="font-mono text-[11.5px] text-ink-3">
          {shortDate(range.start, lang)} → {shortDate(addDays(range.start, range.days), lang)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToToday()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink active:scale-95"
          >
            <Crosshair className="size-3.5" />
            {t('core.common.today')}
          </button>
          <Segmented<TimelineZoom>
            size="sm"
            value={zoom}
            onChange={(z) => setPrefs({ zoom: z })}
            options={[
              { value: 'day', label: t('jobs.timeline.days') },
              { value: 'week', label: t('jobs.timeline.weeks') },
            ]}
          />
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar relative overflow-x-auto overscroll-x-contain border-t border-line"
        onPointerLeave={() => setHover(null)}
        onScroll={(e) => setLeftDay(Math.max(0, Math.floor(e.currentTarget.scrollLeft / px)))}
      >
        <div className="relative" style={{ width: LABEL + width }}>
          {/* background: weekends, month lines, today */}
          <div className="pointer-events-none absolute inset-y-0" style={{ left: LABEL, width }}>
            {zoom === 'day' &&
              range.list.map((d, i) =>
                isWeekend(d) ? <div key={i} className="stripes absolute inset-y-0 opacity-50" style={{ left: i * px, width: px }} /> : null,
              )}
            {range.list.map((d, i) =>
              zoom === 'day' || d.getDay() === 1 ? (
                <div key={`l${i}`} className={cn('absolute inset-y-0 w-px', d.getDate() === 1 ? 'bg-[var(--line-2)]' : 'bg-[var(--line)]')} style={{ left: i * px }} />
              ) : null,
            )}
            <motion.div
              className="absolute inset-y-0 z-[3] w-[2px] -translate-x-1/2 bg-danger"
              style={{ left: todayX }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 }}
            />
          </div>

          {/* header */}
          <div className="relative z-[4] flex h-[58px] border-b border-line">
            <div
              className="sticky left-0 z-[5] flex shrink-0 flex-col justify-end bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] px-3 pb-2 backdrop-blur-md sm:px-4"
              style={{ width: LABEL }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={fmt(range.list[Math.min(leftDay, range.list.length - 1)] ?? today, 'yyyy-MM', lang)}
                  initial={{ y: 10, opacity: 0, filter: 'blur(4px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ y: -10, opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="truncate text-[13px] font-medium capitalize text-ink"
                >
                  {fmt(range.list[Math.min(leftDay, range.list.length - 1)] ?? today, 'LLLL yyyy', lang)}
                </motion.span>
              </AnimatePresence>
              <span className="text-[11px] text-ink-3">{t('core.common.job')}</span>
            </div>
            <div className="relative" style={{ width }}>
              {months.map(({ d, i }) => (
                <span key={i} className="absolute top-2 whitespace-nowrap pl-1.5 text-[12px] font-medium text-ink" style={{ left: i * px }}>
                  {fmt(d, 'LLLL yyyy', lang)}
                </span>
              ))}
              {range.list.map((d, i) => {
                const isToday = isSameDay(d, today)
                if (zoom === 'week' && d.getDay() !== 1 && !isToday) return null
                return (
                  <span
                    key={i}
                    className={cn(
                      'absolute bottom-1.5 flex flex-col items-center font-mono text-[10.5px] tabular-nums leading-tight',
                      isToday ? 'z-[1] text-white' : 'text-ink-3',
                    )}
                    style={{ left: i * px, width: zoom === 'day' ? px : 7 * px }}
                  >
                    {zoom === 'day' ? (
                      <>
                        <span className="text-[9px] uppercase opacity-70">{fmt(d, 'EEEEE', lang)}</span>
                        <span className={cn('mt-0.5 flex size-5 items-center justify-center rounded-full', isToday && 'bg-danger')}>{d.getDate()}</span>
                      </>
                    ) : isToday ? (
                      <span className="absolute -translate-x-1/2 rounded-full bg-danger px-1.5 py-0.5 text-[10px]" style={{ left: 0 }}>
                        {t('core.common.today')}
                      </span>
                    ) : (
                      <span className="self-start pl-1.5">
                        W{getISOWeek(d)} · {d.getDate()}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>

          {/* rows */}
          {rows.length === 0 && (
            <div className="py-14 text-center text-[13px] text-ink-3" style={{ width: `min(100%, calc(100vw - 40px))` }}>
              {t('jobs.empty.filtered')}
            </div>
          )}
          {rows.map((r, i) => {
            const start = r.job.startedAt ?? r.job.createdAt
            const left = x(start)
            const right = x(r.job.dueAt)
            const w = Math.max(px * 0.8, right - left)
            const color = STATUS_COLOR[r.job.status]
            const overdue = r.urgency === 'overdue'
            const tail = overdue ? Math.max(0, todayX - right) : 0
            const showInside = w > 150
            return (
              <div key={r.job.id} className="group relative flex border-b border-line last:border-b-0" style={{ height: ROW_H }}>
                <button
                  type="button"
                  onClick={() => navigate(`/jobs/${r.job.id}`)}
                  className="sticky left-0 z-[5] flex shrink-0 items-center gap-2.5 bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] px-3 text-left backdrop-blur-md transition-colors group-hover:bg-[var(--surface-2)] sm:px-4"
                  style={{ width: LABEL }}
                >
                  {!mobile && <CounterpartAvatar person={r.counterpart} isClient={r.counterpartIsClient} seed={r.counterpartId} size={26} />}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-3">
                      <span className="size-1.5 rounded-full" style={{ background: color }} />
                      {r.job.id}
                    </span>
                    <span className="block truncate text-[13px] font-medium leading-tight text-ink">{r.job.title}</span>
                  </span>
                </button>
                <div className="relative" style={{ width }}>
                  {/* overdue tail */}
                  {tail > 0 && (
                    <motion.div
                      className="absolute top-1/2 h-7 -translate-y-1/2 rounded-r-full bg-danger-soft"
                      style={{ left: right - 8, width: tail + 8, backgroundImage: 'repeating-linear-gradient(-45deg, color-mix(in oklab, var(--danger) 35%, transparent) 0 5px, transparent 5px 10px)' }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.35 + Math.min(i, 14) * 0.035, duration: 0.6, ease: EASE_OUT }}
                    />
                  )}
                  <motion.button
                    type="button"
                    onClick={() => navigate(`/jobs/${r.job.id}`)}
                    onPointerMove={(e) => e.pointerType === 'mouse' && setHover({ row: r, x: e.clientX, y: e.clientY })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={(e) => {
                      const b = e.currentTarget.getBoundingClientRect()
                      setHover({ row: r, x: b.left + b.width / 2, y: b.top })
                    }}
                    onBlur={() => setHover(null)}
                    aria-label={`${r.job.id} · ${r.job.title} · ${shortDate(start, lang)} – ${shortDate(r.job.dueAt, lang)}`}
                    className="absolute top-1/2 flex h-8 -translate-y-1/2 items-center overflow-hidden rounded-full text-left outline-none ring-offset-2 ring-offset-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      left,
                      width: w,
                      background: `color-mix(in oklab, ${color} 22%, var(--surface))`,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 55%, transparent)`,
                      opacity: isClosed(r.job.status) && r.job.status !== 'approved' ? 0.5 : 1,
                    }}
                    initial={{ scaleX: 0, opacity: 0, originX: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    whileHover={{ scaleY: 1.14 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.1 + Math.min(i, 14) * 0.035 }}
                  >
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${r.job.progress}%` }}
                      transition={{ duration: 1, ease: EASE_OUT, delay: 0.35 + Math.min(i, 14) * 0.035 }}
                    />
                    {/* delivery dots */}
                    {r.job.versions.map((v) => {
                      const vx = x(v.submittedAt) - left
                      if (vx < 4 || vx > w - 4) return null
                      return <span key={v.id} className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-ink" style={{ left: vx }} />
                    })}
                    {showInside && (
                      <span
                        className="relative z-[1] truncate px-3 text-[12px] font-medium"
                        style={{ color: r.job.progress > 40 && (r.job.status === 'in_progress' || r.job.status === 'final_touches') ? 'var(--accent-ink)' : 'var(--ink)' }}
                      >
                        {r.job.title}
                      </span>
                    )}
                    {showInside && <span className="relative z-[1] ml-auto shrink-0 pr-3 font-mono text-[11px] tabular-nums text-ink-2">{r.job.progress}%</span>}
                  </motion.button>
                  {!showInside && (
                    <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate whitespace-nowrap pl-2 font-mono text-[11px] text-ink-3" style={{ left: left + w + tail }}>
                      {r.job.progress}% · {shortDate(r.job.dueAt, lang)}
                    </span>
                  )}
                  {/* milestones */}
                  {r.job.milestones.map((m) => {
                    const mx = x(m.dueAt)
                    if (mx < 0 || mx > width) return null
                    return (
                      <span
                        key={m.id}
                        title={m.label}
                        className={cn(
                          'pointer-events-none absolute top-[7px] size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] border border-[var(--surface)]',
                          m.status === 'released' ? 'bg-success' : m.status === 'escrow' ? 'bg-ink' : 'bg-ink-4',
                        )}
                        style={{ left: mx }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[11.5px] text-ink-3">
        {BOARD_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {t(`core.status.${s}`)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <Diamond className="size-3 fill-current" /> {t('jobs.timeline.milestone')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink" /> {t('jobs.timeline.delivery')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flag className="size-3 text-danger" /> {t('jobs.timeline.overdue')}
        </span>
      </div>

      <TimelineTooltip hover={hover} role={role} />
    </motion.div>
  )
}

function fracOfDay(iso: string) {
  const d = new Date(iso)
  return (d.getHours() * 60 + d.getMinutes()) / 1440
}

function TimelineTooltip({ hover, role }: { hover: { row: JobRow; x: number; y: number } | null; role: Role }) {
  const t = useT()
  const lang = useLang()
  const [size, setSize] = useState({ w: 280, h: 160 })
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) setSize({ w: ref.current.offsetWidth, h: ref.current.offsetHeight })
  }, [hover?.row.job.id])
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const left = hover ? Math.max(8, Math.min(hover.x - size.w / 2, vw - size.w - 8)) : 0
  const top = hover ? (hover.y - size.h - 14 < 8 ? hover.y + 18 : hover.y - size.h - 14) : 0
  const r = hover?.row
  return createPortal(
    <AnimatePresence>
      {r && (
        <motion.div
          ref={ref}
          key="tt"
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', left, top }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
          transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.6 }}
          className="glass glass-strong pointer-events-none fixed z-[90] w-[280px] rounded-[18px] p-3.5"
          style={{ left, top }}
        >
          <div className="relative z-[1]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-ink-3">{r.job.id}</span>
              <StatusBadge status={r.job.status} size="xs" />
            </div>
            <p className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-snug">{r.job.title}</p>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-2">
              <CounterpartAvatar person={r.counterpart} isClient={r.counterpartIsClient} seed={r.counterpartId} size={18} />
              <span className="truncate">{r.name}</span>
              <span className="ml-auto font-mono text-[11.5px]">{formatMoney(r.job.budget, r.job.currency, lang, true)}</span>
            </div>
            <ProgressBar value={r.job.progress} height={5} className="mt-2.5" showLabel />
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-3">
              <span>
                {shortDate(r.job.startedAt ?? r.job.createdAt, lang)} → {shortDate(r.job.dueAt, lang)}
              </span>
              <span className={cn('font-sans font-medium', URGENCY_TEXT[r.urgency])}>{r.job.status === 'approved' ? t('core.status.approved') : dueLabel(r.job.dueAt, lang)}</span>
            </div>
            {role === 'client' && r.job.status === 'in_review' && <p className="mt-2 text-[11.5px] font-medium text-accent-text">{t('jobs.timeline.yourMove')}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
