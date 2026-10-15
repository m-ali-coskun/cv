import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { addDays, endOfWeek, isSameMonth, isWeekend, startOfDay, startOfWeek, subDays } from 'date-fns'
import { ArrowUpRight, CalendarCheck2, CalendarClock, MessageCircle, Sparkles, Target } from 'lucide-react'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID } from '@/store/types'
import { toast } from '@/store/toasts'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { item as itemV, stagger } from '@/lib/motion'
import { fireConfetti } from '@/lib/confetti'
import { Glass, CardHeader } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { MonthCalendar } from '@/components/ui/DatePicker'
import { DonutChart } from '@/components/charts/DonutChart'
import { Heatmap } from '@/components/charts/Heatmap'
import { KINDS, KIND_COLOR, findFreeSlot, markersFor, monthGrid, workloadByDay, type CalItem } from './model'
import { KindIcon, PersonAvatar, countdown, hhmm, usePersonLookup } from './ui'

// ─────────────────────────── Up next (night card) ───────────────────────────

export function NextUpCard({ items, now, onOpenItem }: { items: CalItem[]; now: Date; onOpenItem: (it: CalItem, el: Element) => void }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()
  const ensureConversation = useApp((s) => s.ensureConversation)
  const person = usePersonLookup()
  const upcoming = useMemo(() => items.filter((it) => it.end > now).slice(0, 5), [items, now])
  const next = upcoming[0]
  const rest = upcoming.slice(1)
  const p = person(next?.withId)
  const cd = next ? countdown(next.start, now) : null
  const live = next && next.start <= now

  return (
    <Glass variant="night" className="overflow-hidden p-5">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[var(--accent)] opacity-25 blur-3xl" />
      <div className="relative z-[1] flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-white/80">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
            <CalendarClock className="size-3.5" />
          </span>
          {t('calendar.upNext')}
        </span>
        <span className="font-mono text-[11px] text-white/50">{hhmm(now, lang)}</span>
      </div>
      <AnimatePresence mode="wait">
        {next ? (
          <motion.div key={next.id} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8 }} className="relative z-[1]">
            <button type="button" onClick={(e) => onOpenItem(next, e.currentTarget)} className="mt-4 block w-full text-left">
              <p className="font-mono text-[12px]" style={{ color: KIND_COLOR[next.kind] }}>
                {live
                  ? t('calendar.happeningNow')
                  : cd && cd.d > 0
                    ? t('calendar.inDays', { count: cd.d })
                    : cd && cd.h > 0
                      ? t('calendar.inHoursMinutes', { h: cd.h, m: cd.m })
                      : t('calendar.inMinutes', { count: cd?.m ?? 0 })}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[20px] font-medium leading-tight tracking-[-0.02em] text-white">{next.title}</h3>
              <p className="mt-1.5 font-mono text-[12px] text-white/55">
                {fmt(next.start, 'EEE d MMM', lang)} · {hhmm(next.start, lang)}
                {next.jobId && ` · ${next.jobId}`}
              </p>
            </button>
            <div className="mt-4 flex items-center gap-2">
              {p && <PersonAvatar person={p} size={30} />}
              <div className="min-w-0 flex-1 truncate text-[12.5px] text-white/70">{p?.name ?? t(`calendar.kind.${next.kind}`)}</div>
              {p && (
                <Button
                  size="xs"
                  variant="accent"
                  icon={<MessageCircle className="size-3.5" />}
                  onClick={() => navigate(`/messages/${role === 'client' ? ensureConversation(ME_CLIENT_ID, p.id) : ensureConversation(p.id, ME_DESIGNER_ID)}`)}
                >
                  {t('calendar.message')}
                </Button>
              )}
              {next.jobId && (
                <button
                  type="button"
                  aria-label={t('calendar.openJob')}
                  onClick={() => navigate(`/jobs/${next.jobId}`)}
                  className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ArrowUpRight className="size-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-[1] mt-4 text-[14px] text-white/70">
            {t('calendar.nothingUpcoming')}
          </motion.p>
        )}
      </AnimatePresence>
      {rest.length > 0 && (
        <motion.ul variants={stagger(0.05, 0.15)} initial="hidden" animate="show" className="relative z-[1] mt-4 space-y-1 border-t border-white/10 pt-3">
          {rest.map((it) => (
            <motion.li key={it.id} variants={itemV}>
              <button
                type="button"
                onClick={(e) => onOpenItem(it, e.currentTarget)}
                className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/5"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[it.kind] }} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">{it.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-white/45">{fmt(it.start, 'EEE HH:mm', lang)}</span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Glass>
  )
}

// ─────────────────────────── Mini month ───────────────────────────

export function MiniMonthCard({ cursor, items, onPick }: { cursor: Date; items: CalItem[]; onPick: (d: Date) => void }) {
  const markers = useMemo(() => markersFor(items), [items])
  return (
    <Glass className="p-3">
      <MonthCalendar key={fmt(cursor, 'yyyy-MM')} value={cursor} onSelect={onPick} markers={markers} initialMonth={cursor} />
    </Glass>
  )
}

// ─────────────────────────── AI focus planner ───────────────────────────

interface Plan {
  deadline: CalItem
  slot: Date
}

function planFocus(items: CalItem[], now: Date): Plan[] {
  const horizon = addDays(now, 10).getTime()
  const deadlines = items.filter((it) => it.kind === 'deadline' && it.jobId && it.start > now && it.start.getTime() < horizon)
  const working = [...items]
  const plans: Plan[] = []
  for (const d of deadlines) {
    const covered = items.some((x) => x.kind === 'focus' && x.jobId === d.jobId && x.start > subDays(d.start, 7) && x.start < d.start)
    if (covered || plans.some((p) => p.deadline.jobId === d.jobId)) continue
    let slot: Date | null = null
    for (let back = 1; back <= 4 && !slot; back++) {
      const day = subDays(startOfDay(d.start), back)
      if (day < startOfDay(now) || isWeekend(day)) continue
      const s = findFreeSlot(working, day, 120, 9, 18)
      if (s && s.getTime() + 120 * 60_000 <= d.start.getTime()) slot = s
    }
    if (!slot) {
      const s = findFreeSlot(working, d.start, 120, 9, 18)
      if (s && s.getTime() + 120 * 60_000 <= d.start.getTime()) slot = s
    }
    if (!slot) continue
    plans.push({ deadline: d, slot })
    working.push({ ...d, id: `plan:${d.id}`, kind: 'focus', start: slot, end: new Date(slot.getTime() + 120 * 60_000), durationMin: 120 })
    if (plans.length >= 4) break
  }
  return plans
}

export function PlannerCard({ items, now }: { items: CalItem[]; now: Date }) {
  const t = useT()
  const lang = useLang()
  const addEvent = useApp((s) => s.addEvent)
  const removeEvent = useApp((s) => s.removeEvent)
  const aiOn = useApp((s) => s.settings.aiAssistant)
  // recompute every 30 minutes of "now" (not every tick)
  const nowBucket = Math.floor(now.getTime() / 1_800_000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plans = useMemo(() => planFocus(items, now), [items, nowBucket])

  const book = (el: HTMLElement) => {
    const ids = plans.map((p) =>
      addEvent({ title: `Focus — ${p.deadline.job?.title ?? p.deadline.title}`, kind: 'focus', at: p.slot.toISOString(), durationMin: 120, jobId: p.deadline.jobId }).id,
    )
    fireConfetti({ from: el, particleCount: 90 })
    toast({
      title: t('calendar.planner.booked', { count: ids.length }),
      tone: 'success',
      action: { label: t('calendar.undo'), onClick: () => ids.forEach((id) => removeEvent(id)) },
    })
  }

  if (!aiOn) return null
  return (
    <Glass variant="accent" className="overflow-hidden p-5">
      <div className="relative z-[1] flex items-center gap-2 text-[13px] font-medium">
        <motion.span
          animate={{ rotate: [0, 14, -8, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2 }}
          className="flex size-7 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent)]"
        >
          <Sparkles className="size-3.5" />
        </motion.span>
        {t('calendar.planner.title')}
      </div>
      <AnimatePresence mode="wait">
        {plans.length ? (
          <motion.div key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative z-[1]">
            <h3 className="mt-3 text-[18px] font-medium leading-snug tracking-[-0.02em]">{t('calendar.planner.headline', { count: plans.length })}</h3>
            <ul className="mt-3 space-y-1.5">
              {plans.map((p) => (
                <li key={p.deadline.id} className="flex items-center gap-2 text-[12.5px]">
                  <Target className="size-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">{p.deadline.job?.title ?? p.deadline.title}</span>
                  <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--accent-ink)_12%,transparent)] px-2 py-0.5 font-mono text-[11px]">
                    {fmt(p.slot, 'EEE HH:mm', lang)}
                  </span>
                </li>
              ))}
            </ul>
            <Button size="sm" className="mt-4" icon={<CalendarCheck2 className="size-4" />} onClick={(e) => book(e.currentTarget)}>
              {t('calendar.planner.cta', { count: plans.length })}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1]">
            <h3 className="mt-3 text-[18px] font-medium leading-snug tracking-[-0.02em]">{t('calendar.planner.allSet')}</h3>
            <p className="mt-1 text-[12.5px] opacity-75">{t('calendar.planner.allSetBody')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Glass>
  )
}

// ─────────────────────────── Workload heatmap ───────────────────────────

export function WorkloadCard({ cursor, items, onPickDay }: { cursor: Date; items: CalItem[]; onPickDay: (d: Date) => void }) {
  const t = useT()
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const grid = useMemo(() => monthGrid(cursor, weekStartsOn), [cursor, weekStartsOn])
  const values = useMemo(() => {
    const m = workloadByDay(items)
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(m)) out[k] = Math.round((v / 60) * 10) / 10
    return out
  }, [items])
  const monthTotal = useMemo(
    () => items.filter((it) => isSameMonth(it.start, cursor) && it.kind !== 'deadline' && it.kind !== 'milestone').reduce((n, it) => n + it.durationMin, 0),
    [items, cursor],
  )
  const end = grid[grid.length - 1]
  return (
    <Glass className="p-5">
      <CardHeader title={t('calendar.workload')} subtitle={fmt(cursor, 'LLLL yyyy', useLang())} />
      <div className="mt-4">
        <Heatmap
          values={values}
          weeks={6}
          endDate={end}
          maxCell={22}
          valueLabel={(v) => t('calendar.hoursBooked', { h: v })}
          onCellClick={(day) => {
            const [y, m, d] = day.split('-').map(Number)
            onPickDay(new Date(y, m - 1, d))
          }}
          summary={<span className="font-mono">{t('calendar.monthTotal', { h: Math.round((monthTotal / 60) * 10) / 10 })}</span>}
          ariaLabel={t('calendar.workload')}
        />
      </div>
    </Glass>
  )
}

// ─────────────────────────── Mix by kind ───────────────────────────

export function MixCard({ cursor, items, hidden, onToggle }: { cursor: Date; items: CalItem[]; hidden: string[]; onToggle: (k: CalItem['kind']) => void }) {
  const t = useT()
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) if (isSameMonth(it.start, cursor)) counts.set(it.kind, (counts.get(it.kind) ?? 0) + 1)
    return KINDS.map((k) => ({ id: k, label: t(`calendar.kind.${k}`), value: counts.get(k) ?? 0, color: KIND_COLOR[k] })).filter((d) => d.value > 0)
  }, [items, cursor, t])
  return (
    <Glass className="p-5">
      <CardHeader title={t('calendar.mix')} subtitle={t('calendar.mixSub')} />
      <div className="mt-4">
        {data.length ? (
          <DonutChart
            data={data}
            size={150}
            thickness={18}
            legend="bottom"
            showPercent
            centerLabel={t('calendar.eventsWord')}
            onSegmentClick={(id) => onToggle(id as CalItem['kind'])}
            ariaLabel={t('calendar.mix')}
          />
        ) : (
          <p className="py-6 text-center text-[13px] text-ink-3">{t('calendar.monthEmpty')}</p>
        )}
      </div>
      {hidden.length > 0 && <p className="mt-2 text-center text-[11.5px] text-ink-3">{t('calendar.hiddenKinds', { count: hidden.length })}</p>}
    </Glass>
  )
}

// ─────────────────────────── KPI strip ───────────────────────────

export function useWeekStats(items: CalItem[], now: Date) {
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  return useMemo(() => {
    const ws = startOfWeek(now, { weekStartsOn })
    const we = endOfWeek(now, { weekStartsOn })
    const today = startOfDay(now)
    const tomorrow = addDays(today, 1)
    const week = items.filter((it) => it.start >= ws && it.start <= we)
    const todayItems = items.filter((it) => it.start >= today && it.start < tomorrow)
    const nextToday = todayItems.find((it) => it.end > now)
    const booked = week.filter((it) => it.kind === 'call' || it.kind === 'review').reduce((n, it) => n + it.durationMin, 0)
    const focus = week.filter((it) => it.kind === 'focus').reduce((n, it) => n + it.durationMin, 0)
    const in7 = addDays(now, 7)
    const deadlines = items.filter((it) => it.kind === 'deadline' && it.start > now && it.start <= in7)
    const urgent = deadlines.filter((it) => it.start.getTime() - now.getTime() < 48 * 3600_000).length
    return {
      todayCount: todayItems.length,
      nextToday,
      bookedH: Math.round((booked / 60) * 10) / 10,
      calls: week.filter((it) => it.kind === 'call').length,
      reviews: week.filter((it) => it.kind === 'review').length,
      focusH: Math.round((focus / 60) * 10) / 10,
      deadlines,
      urgent,
    }
  }, [items, now, weekStartsOn])
}

export function KindLegend({ className }: { className?: string }) {
  const t = useT()
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1', className)}>
      {KINDS.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <KindIcon kind={k} className="size-3" />
          {t(`calendar.kind.${k}`)}
        </span>
      ))}
    </div>
  )
}

