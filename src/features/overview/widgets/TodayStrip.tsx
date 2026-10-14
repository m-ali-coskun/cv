import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarClock, Check, Coffee, LayoutDashboard, Phone, RotateCcw, Sparkle, Target, Timer, Video } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import type { CalendarEvent, Job } from '@/store/types'
import { Menu } from '@/components/ui/Menu'
import { Toggle } from '@/components/ui/Toggle'
import { CLOSED, DAY, dayStart, ts } from '../data'
import { useMyEvents, useNow } from '../hooks'
import { usePrefs, type WidgetId } from '../prefs'
import { Card, LiveDot } from '../ui'

const KIND_ICON: Record<CalendarEvent['kind'], typeof Phone> = { call: Video, review: Target, deadline: CalendarClock, focus: Timer, milestone: Sparkle }

export const CLIENT_WIDGETS: WidgetId[] = ['hero', 'pulse', 'attention', 'ai', 'gauge', 'upcoming', 'quick', 'money', 'activity', 'people', 'folders', 'marquee']
export const DESIGNER_WIDGETS: WidgetId[] = ['hero', 'pulse', 'attention', 'ai', 'requests', 'gauge', 'upcoming', 'messages', 'money', 'activity', 'quick', 'people', 'folders', 'marquee']

function relIn(ms: number, t: ReturnType<typeof useT>) {
  const m = Math.round(ms / 60_000)
  if (m < 1) return t('overview.today.now')
  if (m < 60) return t('overview.today.inMin', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('overview.today.inHours', { h, m: String(m % 60).padStart(2, '0') })
  return t('overview.today.inDays', { n: Math.round(h / 24) })
}

/**
 * Slim "today" bar above the grid: date, live clock, what's next on the
 * calendar, today's load — and the dashboard customiser.
 */
export function TodayStrip({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()
  const events = useMyEvents()
  const now = useNow(15_000)
  const hidden = usePrefs((s) => s.hidden)
  const toggle = usePrefs((s) => s.toggle)
  const autoplay = usePrefs((s) => s.autoplay)
  const setPrefs = usePrefs((s) => s.set)
  const reset = usePrefs((s) => s.reset)
  const motionLevel = useApp((s) => s.settings.motion)

  const { next, current, today, dueWeek } = useMemo(() => {
    const sorted = [...events].sort((a, b) => ts(a.at) - ts(b.at))
    const current = sorted.find((e) => ts(e.at) <= now && ts(e.at) + e.durationMin * 60_000 > now)
    const next = sorted.find((e) => ts(e.at) > now)
    const start = dayStart(0, now)
    const today = sorted.filter((e) => ts(e.at) >= start && ts(e.at) < start + DAY).length
    const dueWeek = jobs.filter((j) => !CLOSED.includes(j.status) && ts(j.dueAt) >= now && ts(j.dueAt) < now + 7 * DAY).length
    return { next, current, today, dueWeek }
  }, [events, jobs, now])

  const ev = current ?? next
  const Icon = ev ? KIND_ICON[ev.kind] : Coffee
  const widgets = role === 'client' ? CLIENT_WIDGETS : DESIGNER_WIDGETS

  return (
    <Card variant="glass" pad={false} className={cn('flex min-w-0 items-center gap-2 p-1.5 sm:gap-3', className)}>
      {/* date block */}
      <div className="relative z-[1] flex shrink-0 items-center gap-2 rounded-full bg-night py-1.5 pl-3.5 pr-3 text-on-night">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wide">{fmt(new Date(now), lang === 'en' ? 'EEE · MMM d' : 'EEE · d. MMM', lang)}</span>
        <span className="hidden font-mono text-[12px] text-white/55 sm:inline">{fmt(new Date(now), 'HH:mm', lang)}</span>
      </div>

      {/* next up */}
      <motion.button
        type="button"
        onClick={() => navigate('/calendar')}
        whileTap={{ scale: 0.98 }}
        className="relative z-[1] flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-2 py-1 text-left transition-colors hover:bg-[var(--surface-2)]"
      >
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', current ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2')}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            {current && <LiveDot color="var(--accent-strong)" />}
            {current ? t('overview.today.nowOn') : ev ? t('overview.today.next') : t('overview.today.free')}
            {ev && !current && <span className="font-mono">· {relIn(ts(ev.at) - now, t)}</span>}
          </span>
          <span className="block truncate text-[13.5px] font-medium text-ink">
            {ev ? (
              <>
                <span className="font-mono text-ink-2">{fmt(ev.at, 'HH:mm', lang)}</span> {ev.title}
              </>
            ) : (
              t('overview.today.freeBody')
            )}
          </span>
        </span>
      </motion.button>

      {/* load */}
      <div className="relative z-[1] hidden shrink-0 items-center gap-1.5 lg:flex">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 text-[12.5px] text-ink-2">
          <CalendarClock className="size-3.5" />
          {t('overview.today.events', { count: today })}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 text-[12.5px] text-ink-2">
          <Target className="size-3.5" />
          {t('overview.today.dueWeek', { count: dueWeek })}
        </span>
      </div>

      {/* customise */}
      <div className="relative z-[2] shrink-0">
        <Menu
          width={260}
          trigger={({ onClick, open }) => (
            <motion.button
              type="button"
              onClick={onClick}
              aria-expanded={open}
              aria-label={t('overview.customize.title')}
              whileTap={{ scale: 0.95 }}
              className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors', open ? 'bg-ink text-[var(--surface)]' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]')}
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">{t('overview.customize.title')}</span>
              {hidden.filter((h) => widgets.includes(h)).length > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[10.5px] font-semibold text-accent-ink">{hidden.filter((h) => widgets.includes(h)).length}</span>
              )}
            </motion.button>
          )}
        >
          {(close) => (
            <div className="max-h-[min(70vh,520px)] overflow-y-auto">
              <p className="px-3 pb-1 pt-2 text-[11.5px] font-medium uppercase tracking-wide text-ink-3">{t('overview.customize.widgets')}</p>
              {widgets.map((w) => {
                const on = !hidden.includes(w)
                return (
                  <button
                    key={w}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => toggle(w)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] text-ink transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <span className={cn('flex size-5 items-center justify-center rounded-md border transition-colors', on ? 'border-transparent bg-ink text-[var(--surface)]' : 'border-[var(--line-2)]')}>
                      {on && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                          <Check className="size-3.5" strokeWidth={3} />
                        </motion.span>
                      )}
                    </span>
                    <span className="flex-1 truncate">{t(`overview.widget.${w}.${role}`)}</span>
                  </button>
                )
              })}
              <div className="my-1 h-px bg-[var(--line)]" />
              {role === 'client' && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13.5px]">
                  <span>{t('overview.customize.autoplay')}</span>
                  <Toggle checked={autoplay} onChange={(v) => setPrefs({ autoplay: v })} size="sm" label={t('overview.customize.autoplay')} />
                </div>
              )}
              {motionLevel === 'off' && <p className="px-3 pb-1 text-[11.5px] text-ink-3">{t('overview.customize.motionOff')}</p>}
              <button
                type="button"
                onClick={() => {
                  reset()
                  close()
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] text-ink-2 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
              >
                <RotateCcw className="size-4" />
                {t('overview.customize.reset')}
              </button>
            </div>
          )}
        </Menu>
      </div>
    </Card>
  )
}
