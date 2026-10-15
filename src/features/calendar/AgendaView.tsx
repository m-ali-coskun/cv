import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { addDays, isToday, isTomorrow, startOfDay } from 'date-fns'
import { ArrowUpRight, CalendarPlus, CalendarX2, Pencil } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { formatDuration } from '@/lib/format'
import { EASE_OUT, spring } from '@/lib/motion'
import { Button, IconButton } from '@/components/ui/Button'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { KIND_COLOR, groupByDay, isAuto, type CalItem } from './model'
import { KindIcon, PersonAvatar, hhmm, usePersonLookup } from './ui'

export const AGENDA_DAYS = 30

export function AgendaView({
  cursor,
  dir,
  items,
  now,
  onOpenItem,
  onEdit,
  onCreateAt,
}: {
  cursor: Date
  dir: number
  items: CalItem[]
  now: Date
  onOpenItem: (it: CalItem, el: Element) => void
  onEdit: (it: CalItem) => void
  onCreateAt: (d: Date) => void
}) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const person = usePersonLookup()
  const from = startOfDay(cursor)
  const to = addDays(from, AGENDA_DAYS)
  const groups = useMemo(() => {
    const inRange = items.filter((it) => it.start >= from && it.start < to)
    return [...groupByDay(inRange).entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, from.getTime()])

  if (!groups.length)
    return (
      <EmptyState
        icon={<CalendarX2 />}
        title={t('calendar.agendaEmpty.title')}
        description={t('calendar.agendaEmpty.body')}
        action={
          <Button icon={<CalendarPlus className="size-4" />} onClick={() => onCreateAt(new Date(from.getTime() + 10 * 3600_000))}>
            {t('calendar.newEvent')}
          </Button>
        }
      />
    )

  return (
    <AnimatePresence mode="wait" custom={dir} initial={false}>
      <motion.div
        key={from.toISOString()}
        initial={{ opacity: 0, y: dir * 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } }}
        exit={{ opacity: 0, y: dir * -16, filter: 'blur(6px)', transition: { duration: 0.15 } }}
        className="flex flex-col gap-1"
      >
        {groups.map(([key, list], gi) => {
          const day = list[0].start
          const today = isToday(day)
          const mins = list.reduce((n, it) => n + (it.kind === 'deadline' || it.kind === 'milestone' ? 0 : it.durationMin), 0)
          return (
            <section key={key} className="relative">
              <div className="sticky top-2 z-[5] -mx-1 px-1 py-1">
                <div className={cn('glass flex items-center gap-3 rounded-2xl !bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] px-3.5 py-2', today && 'ring-2 ring-[var(--accent)]')}>
                  <span
                    className={cn(
                      'relative z-[1] flex size-10 shrink-0 flex-col items-center justify-center rounded-xl font-mono leading-none',
                      today ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink',
                    )}
                  >
                    <span className="text-[9px] uppercase opacity-70">{fmt(day, 'EEE', lang)}</span>
                    <span className="mt-0.5 text-[15px] font-semibold">{day.getDate()}</span>
                  </span>
                  <div className="relative z-[1] min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium tracking-[-0.01em]">
                      {today ? t('calendar.today') : isTomorrow(day) ? t('calendar.tomorrow') : fmt(day, 'EEEE', lang)}
                      <span className="ml-2 font-normal text-ink-3">{fmt(day, 'd MMMM', lang)}</span>
                    </p>
                  </div>
                  <span className="relative z-[1] shrink-0 font-mono text-[11px] text-ink-3">
                    {t('calendar.eventsShort', { count: list.length })}
                    {mins > 0 && ` · ${formatDuration(mins)}`}
                  </span>
                </div>
              </div>
              <motion.ul
                className="flex flex-col gap-1 py-1.5 pl-0 sm:pl-[52px]"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: Math.min(gi * 0.05, 0.4) } } }}
              >
                {list.map((it) => {
                  const p = person(it.withId)
                  const past = it.end < now
                  const live = it.start <= now && it.end > now && it.kind !== 'deadline' && it.kind !== 'milestone'
                  return (
                    <motion.li
                      key={it.id}
                      layout
                      variants={{ hidden: { opacity: 0, x: -14, filter: 'blur(6px)' }, show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: spring.smooth } }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => onOpenItem(it, e.currentTarget)}
                        onKeyDown={(e) => e.key === 'Enter' && onOpenItem(it, e.currentTarget)}
                        className={cn(
                          'group flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-all hover:bg-[var(--surface-2)] active:scale-[.99] sm:px-3',
                          past && 'opacity-55',
                        )}
                      >
                        <div className="w-[50px] shrink-0 text-right font-mono sm:w-[92px]">
                          <span className="block text-[13px] font-medium text-ink">{hhmm(it.start, lang)}</span>
                          <span className="block text-[10.5px] text-ink-3 max-sm:hidden">
                            {it.kind === 'deadline' || it.kind === 'milestone' ? '—' : `${hhmm(it.end, lang)} · ${formatDuration(it.durationMin)}`}
                          </span>
                        </div>
                        <span className="relative h-10 w-1 shrink-0 rounded-full" style={{ background: KIND_COLOR[it.kind] }}>
                          {live && <span className="absolute inset-0 animate-pulse rounded-full bg-white/60" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium tracking-[-0.01em]">{it.title}</p>
                          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-3">
                            <span className="inline-flex items-center gap-1" style={{ color: it.kind === 'deadline' ? 'var(--danger)' : undefined }}>
                              <KindIcon kind={it.kind} className="size-3" />
                              {t(`calendar.kind.${it.kind}`)}
                            </span>
                            {it.jobId && <span className="font-mono">{it.jobId}</span>}
                            {isAuto(it) && <span className="max-sm:hidden">· {t('calendar.automatic')}</span>}
                            {live && (
                              <Pill size="xs" tone="danger" dot>
                                {t('calendar.live')}
                              </Pill>
                            )}
                          </div>
                        </div>
                        {it.job && <DisciplineIcon id={it.job.discipline} size={24} className="max-sm:hidden" />}
                        {p && (
                          <span className="hidden items-center gap-2 md:flex">
                            <PersonAvatar person={p} size={26} />
                            <span className="max-w-[120px] truncate text-[12.5px] text-ink-2">{p.name}</span>
                          </span>
                        )}
                        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          {it.editable && (
                            <IconButton
                              label={t('calendar.edit')}
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(it)
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </IconButton>
                          )}
                          {it.jobId && (
                            <IconButton
                              label={t('calendar.openJob')}
                              variant="ghost"
                              size="sm"
                              className="max-sm:hidden"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/jobs/${it.jobId}`)
                              }}
                            >
                              <ArrowUpRight className="size-3.5" />
                            </IconButton>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            </section>
          )
        })}
      </motion.div>
    </AnimatePresence>
  )
}
