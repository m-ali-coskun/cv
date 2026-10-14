import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { AlertTriangle, CalendarDays, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt, dueLabel } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useRole } from '@/store/selectors'
import type { Job } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { CardHeader } from '@/components/ui/Glass'
import { DisciplineIcon, StatusBadge } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState } from '@/components/ui/EmptyState'
import { CLOSED, DAY, dayStart, ts } from '../data'
import { usePeople } from '../hooks'
import { Card, LinkButton, MonoId, listItem } from '../ui'

type Sel = number | 'overdue' | null

/**
 * Next 14 days as day pills with one dot per job due (discipline colour).
 * Selecting a day lists its jobs; nothing selected = the next deadlines.
 */
export function UpcomingCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()
  const people = usePeople()
  const [sel, setSel] = useState<Sel>(null)

  const { days, overdue, upcoming } = useMemo(() => {
    const live = jobs.filter((j) => !CLOSED.includes(j.status))
    const today = dayStart(0)
    const days = Array.from({ length: 14 }, (_, i) => {
      const start = dayStart(i)
      return { i, start, date: new Date(start), jobs: live.filter((j) => ts(j.dueAt) >= start && ts(j.dueAt) < start + DAY).sort((a, b) => ts(a.dueAt) - ts(b.dueAt)) }
    })
    return {
      days,
      overdue: live.filter((j) => ts(j.dueAt) < today).sort((a, b) => ts(a.dueAt) - ts(b.dueAt)),
      upcoming: days.flatMap((d) => d.jobs),
    }
  }, [jobs])

  const list = sel === 'overdue' ? overdue : sel === null ? [...overdue, ...upcoming].slice(0, 5) : days[sel].jobs
  const listKey = String(sel)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.upcoming.title')}
        subtitle={t('overview.upcoming.sub', { count: upcoming.length })}
        action={<LinkButton onClick={() => navigate('/calendar')}>{t('overview.upcoming.calendar')}</LinkButton>}
      />
      <LayoutGroup id="upcoming-days">
        <div className="relative z-[1] -mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="listbox" aria-label={t('overview.upcoming.title')}>
          {overdue.length > 0 && (
            <DayPill
              selected={sel === 'overdue'}
              onClick={() => setSel(sel === 'overdue' ? null : 'overdue')}
              top={<AlertTriangle className="mx-auto size-3.5" />}
              big={String(overdue.length)}
              dots={overdue.map((j) => disciplineTheme(j.discipline).accent)}
              tone="danger"
              label={t('overview.upcoming.overdue')}
            />
          )}
          {days.map((d) => (
            <DayPill
              key={d.i}
              selected={sel === d.i}
              onClick={() => setSel(sel === d.i ? null : d.i)}
              top={d.i === 0 ? t('core.common.today') : fmt(d.date, 'EEEEEE', lang)}
              big={fmt(d.date, 'd', lang)}
              dots={d.jobs.map((j) => disciplineTheme(j.discipline).accent)}
              tone={d.i === 0 ? 'today' : d.date.getDay() === 0 || d.date.getDay() === 6 ? 'weekend' : 'normal'}
              label={fmt(d.date, 'EEEE, d MMMM', lang)}
            />
          ))}
        </div>
      </LayoutGroup>

      <div className="relative z-[1] mt-3 flex-1">
        <div className="mb-1.5 flex items-center justify-between px-1 text-[12px] text-ink-3">
          <span>
            {sel === null
              ? t('overview.upcoming.next')
              : sel === 'overdue'
                ? t('overview.upcoming.overdue')
                : fmt(days[sel].date, 'EEEE, d MMMM', lang)}
          </span>
          {sel !== null && (
            <button type="button" className="rounded-full px-2 py-0.5 hover:bg-[var(--surface-2)] hover:text-ink" onClick={() => setSel(null)}>
              {t('overview.upcoming.showNext')}
            </button>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul key={listKey} initial="hidden" animate="show" exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }} className="space-y-1">
            {list.length === 0 ? (
              <EmptyState className="py-6" icon={sel === null ? <PartyPopper /> : <CalendarDays />} title={t('overview.upcoming.empty')} />
            ) : (
              list.map((j, i) => {
                const p = people.get(role === 'client' ? j.designerId : j.clientId)
                const late = ts(j.dueAt) < Date.now()
                return (
                  <motion.li key={j.id} custom={i} variants={listItem}>
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/${j.id}`)}
                      className="flex w-full items-center gap-3 rounded-[16px] p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <DisciplineIcon id={j.discipline} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <MonoId className="shrink-0 text-ink-3">{j.id}</MonoId>
                          <span className="truncate text-[13.5px] font-medium text-ink">{j.title}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
                          <span className="truncate">{p?.name}</span>
                          <span className="text-ink-4">·</span>
                          <span className={cn('shrink-0 font-mono', late && 'text-danger')}>
                            {dueLabel(j.dueAt, lang)} · {fmt(j.dueAt, 'HH:mm', lang)}
                          </span>
                        </span>
                      </span>
                      <span className="hidden sm:block">
                        <StatusBadge status={j.status} size="xs" />
                      </span>
                      <ProgressRing value={j.progress} size={34} stroke={4}>
                        <span className="text-[9.5px] font-medium tabular-nums">{j.progress}</span>
                      </ProgressRing>
                    </button>
                  </motion.li>
                )
              })
            )}
          </motion.ul>
        </AnimatePresence>
      </div>
    </Card>
  )
}

function DayPill({
  selected,
  onClick,
  top,
  big,
  dots,
  tone,
  label,
}: {
  selected: boolean
  onClick: () => void
  top: React.ReactNode
  big: string
  dots: string[]
  tone: 'today' | 'weekend' | 'normal' | 'danger'
  label: string
}) {
  const base =
    tone === 'today'
      ? 'bg-night text-on-night'
      : tone === 'danger'
        ? 'bg-danger-soft text-danger'
        : tone === 'weekend'
          ? 'bg-[var(--surface-2)] text-ink-3'
          : 'bg-[var(--surface-2)] text-ink'
  return (
    <motion.button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`${label}: ${dots.length}`}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      className={cn('relative flex h-[78px] min-w-[44px] flex-1 flex-col items-center justify-between rounded-[18px] px-1 py-2', base)}
    >
      {selected && (
        <motion.span
          layoutId="day-sel"
          className="absolute inset-0 rounded-[18px] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]"
          transition={{ type: 'spring', stiffness: 480, damping: 34 }}
        />
      )}
      <span className="relative block w-full truncate text-center text-[10.5px] font-medium uppercase tracking-wide opacity-70">{top}</span>
      <span className="relative font-mono text-[18px] font-medium leading-none tabular-nums">{big}</span>
      <span className="relative flex h-2 items-center gap-[3px]">
        {dots.slice(0, 3).map((c, i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full"
            style={{ background: c, boxShadow: `0 0 6px ${c}` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 500, damping: 15 }}
          />
        ))}
        {dots.length > 3 && <span className="text-[9px] font-medium leading-none">+{dots.length - 3}</span>}
      </span>
    </motion.button>
  )
}
