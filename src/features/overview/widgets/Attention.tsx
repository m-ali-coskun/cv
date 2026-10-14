import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowDownWideNarrow, CalendarClock, CheckCircle2, CircleCheck, ClipboardCopy, ListChecks, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { shortDate, timeAgo, daysUntil } from '@/lib/dates'
import { useLang, useT, type TFn } from '@/i18n'
import { useRole, useAttentionJobs, useMyJobs, type RiskLevel } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Pill, RiskBadge, STATUS_COLOR } from '@/components/ui/Badge'
import { Menu } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { CLOSED, riskView, ts, type RiskView } from '../data'
import { usePrefs, type RiskFilter } from '../prefs'
import { useNow, usePeople } from '../hooks'
import { Card, CardIconTrigger, MonoId, listItem } from '../ui'

const LIMIT = 8

/** Localised "blocker / reason" text (blockers are user content and stay English). */
export function reasonText(v: RiskView, t: TFn) {
  if (v.blocker) return v.blocker
  return v.key ? t(`overview.reason.${v.key}`, v.vars) : ''
}

interface Row {
  job: Job
  view: RiskView
}

/**
 * "Needs attention" — the reference's risk table. Ranked by the same heuristic
 * the AI card uses; filter by risk level, sort by risk or due date, copy a
 * plain-text summary. Becomes a stack of cards on phones.
 */
export function AttentionCard({ className }: { className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()
  const people = usePeople()
  const flagged = useAttentionJobs()
  const mine = useMyJobs()
  const filter = usePrefs((s) => s.riskFilter)
  const sort = usePrefs((s) => s.sort)
  const setPrefs = usePrefs((s) => s.set)
  const [expanded, setExpanded] = useState(false)
  useNow(30_000)

  const rows: Row[] = useMemo(() => {
    const all = flagged.map(({ job }) => ({ job, view: riskView(job, role) }))
    const filtered = filter === 'all' ? all : all.filter((r) => r.view.level === filter)
    return filtered.sort((a, b) =>
      sort === 'due'
        ? ts(a.job.dueAt) - ts(b.job.dueAt)
        : Number(b.view.waitingOnMe) - Number(a.view.waitingOnMe) || b.view.score - a.view.score || ts(a.job.dueAt) - ts(b.job.dueAt),
    )
  }, [flagged, filter, sort, role])

  const counts = useMemo(() => {
    const c: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 }
    for (const { job } of flagged) c[riskView(job, role).level]++
    return c
  }, [flagged, role])

  // fill spare rows with the calm jobs, so the card always tells the whole story
  const onTrack = useMemo(() => {
    const ids = new Set(flagged.map((f) => f.job.id))
    return mine.filter((j) => !CLOSED.includes(j.status) && !ids.has(j.id)).sort((a, b) => ts(a.dueAt) - ts(b.dueAt))
  }, [mine, flagged])
  const spare = filter === 'all' && !expanded ? Math.max(0, Math.min(5, LIMIT - rows.length)) : 0

  const updated = flagged.length ? Math.max(...flagged.map((f) => ts(f.job.updatedAt))) : Date.now()
  const shown = expanded ? rows : rows.slice(0, LIMIT)
  const counterpart = (j: Job) => people.get(role === 'client' ? j.designerId : j.clientId)

  const copySummary = async () => {
    const text = rows
      .map((r) => `${r.job.id} · ${r.job.title} — ${reasonText(r.view, t)} (${t(`core.priority.${r.view.level}`)}, ${shortDate(r.job.dueAt, lang)})`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(`${t('overview.attention.title')}\n${text}`)
      toast({ title: t('overview.attention.copied'), description: t('overview.attention.copiedBody', { count: rows.length }), tone: 'success' })
    } catch {
      toast({ title: t('core.toast.error'), tone: 'error' })
    }
  }

  const FILTERS: RiskFilter[] = ['all', 'high', 'medium', 'low']

  return (
    <Card id="attention" className={cn('flex scroll-mt-6 flex-col', className)}>
      <CardHeader
        title={t('overview.attention.title')}
        subtitle={t('overview.attention.sub', { count: flagged.length, ago: timeAgo(new Date(updated), lang) })}
        className="z-[5] flex-wrap"
        action={
          <>
            <span className="glass-accent hidden h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium sm:inline-flex">
              <Sparkles className="relative z-[1] size-3.5" />
              <span className="relative z-[1]">{t('overview.attention.ranked')}</span>
            </span>
            <Menu
              width={210}
              trigger={({ onClick, open }) => (
                <CardIconTrigger kind="filter" label={t('core.action.filter')} onClick={onClick} open={open} active={filter !== 'all'} />
              )}
              items={FILTERS.map((f) => ({
                label: f === 'all' ? t('overview.attention.allRisks') : t('overview.attention.riskLevel', { level: t(`core.priority.${f}`) }),
                active: filter === f,
                hint: String(f === 'all' ? flagged.length : counts[f]),
                icon: f === 'all' ? <ListChecks /> : <span className="block size-2.5 rounded-full" style={{ background: f === 'high' ? 'var(--danger)' : f === 'medium' ? 'var(--warning)' : 'var(--ink-4)' }} />,
                onClick: () => setPrefs({ riskFilter: f }),
              }))}
            />
            <Menu
              width={230}
              trigger={({ onClick, open }) => <CardIconTrigger label={t('core.action.more')} onClick={onClick} open={open} />}
              items={[
                { label: t('overview.attention.sortRisk'), icon: <ArrowDownWideNarrow />, active: sort === 'risk', onClick: () => setPrefs({ sort: 'risk' }) },
                { label: t('overview.attention.sortDue'), icon: <CalendarClock />, active: sort === 'due', onClick: () => setPrefs({ sort: 'due' }) },
                { divider: true, label: '' },
                { label: t('overview.attention.copy'), icon: <ClipboardCopy />, onClick: copySummary, disabled: !rows.length },
                { label: t('overview.attention.allJobs'), icon: <ListChecks />, onClick: () => navigate('/jobs') },
              ]}
            />
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={<CheckCircle2 />}
          title={filter === 'all' ? t('overview.attention.emptyTitle') : t('overview.attention.emptyFiltered')}
          description={filter === 'all' ? t('overview.attention.emptyBody') : undefined}
          action={
            filter !== 'all' ? (
              <Button size="sm" variant="soft" onClick={() => setPrefs({ riskFilter: 'all' })}>
                {t('overview.attention.clearFilter')}
              </Button>
            ) : (
              <Button size="sm" variant="soft" onClick={() => navigate('/jobs')}>
                {t('overview.attention.allJobs')}
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* desktop / tablet table */}
          <div role="table" aria-label={t('overview.attention.title')} className="relative z-[1] mt-4 hidden md:block">
            <div
              role="row"
              className="grid grid-cols-[76px_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_78px_64px] items-center gap-3 rounded-full bg-[var(--surface-2)] px-4 py-2.5 text-[12.5px] text-ink-3"
            >
              <span role="columnheader">{t('core.common.job')}</span>
              <span role="columnheader">{t('overview.attention.colTitle')}</span>
              <span role="columnheader">{t('core.common.stage')}</span>
              <span role="columnheader">{t('core.common.blocker')}</span>
              <span role="columnheader">{t('core.common.risk')}</span>
              <span role="columnheader">{t('core.common.due')}</span>
            </div>
            <ul className="mt-1">
              <AnimatePresence initial={true} mode="popLayout">
                {shown.map((r, i) => {
                  const cp = counterpart(r.job)
                  const overdue = daysUntil(r.job.dueAt) < 0
                  return (
                    <motion.li
                      key={r.job.id}
                      layout
                      custom={i}
                      variants={listItem}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      role="row"
                      tabIndex={0}
                      onClick={() => navigate(`/jobs/${r.job.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/jobs/${r.job.id}`)}
                      whileTap={{ scale: 0.99 }}
                      className="group/row grid cursor-pointer grid-cols-[76px_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_78px_64px] items-center gap-3 border-b border-[var(--line)] px-4 py-3 outline-none transition-colors duration-150 last:border-b-0 hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] rounded-[16px]"
                    >
                      <span role="cell" className="flex min-w-0 items-center gap-1.5">
                        <MonoId className="text-ink">{r.job.id}</MonoId>
                      </span>
                      <span role="cell" className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-ink" title={r.job.title}>
                          {r.job.title}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
                          <span className="truncate">{cp?.name ?? '—'}</span>
                          {r.view.waitingOnMe && (
                            <span className="shrink-0 rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-accent-ink">{t('overview.attention.yourMove')}</span>
                          )}
                        </span>
                      </span>
                      <span role="cell" className="min-w-0">
                        <Pill tone="neutral" dot={STATUS_COLOR[r.job.status]} className="max-w-full">
                          <span className="truncate">{t(`core.status.${r.job.status}`)}</span>
                        </Pill>
                      </span>
                      <span role="cell" className="line-clamp-2 min-w-0 text-[13px] text-ink-2">
                        {reasonText(r.view, t)}
                      </span>
                      <span role="cell">
                        <RiskBadge level={r.view.level} />
                      </span>
                      <span role="cell" className={cn('whitespace-nowrap font-mono text-[12px] tabular-nums', overdue ? 'font-medium text-danger' : 'text-ink-2')}>
                        {shortDate(r.job.dueAt, lang)}
                      </span>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </div>

          {/* phone cards */}
          <ul className="relative z-[1] mt-4 grid gap-2.5 sm:grid-cols-2 md:hidden">
            <AnimatePresence initial={true} mode="popLayout">
              {shown.map((r, i) => {
                const cp = counterpart(r.job)
                const overdue = daysUntil(r.job.dueAt) < 0
                return (
                  <motion.li
                    key={r.job.id}
                    layout
                    custom={i}
                    variants={listItem}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/jobs/${r.job.id}`)}
                    className="tile flex min-w-0 cursor-pointer flex-col gap-2 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MonoId className="text-ink">{r.job.id}</MonoId>
                        {r.view.waitingOnMe && (
                          <span className="rounded-full bg-accent px-1.5 py-px text-[10.5px] font-semibold text-accent-ink">{t('overview.attention.yourMove')}</span>
                        )}
                      </span>
                      <RiskBadge level={r.view.level} />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[14.5px] font-medium leading-snug text-ink">{r.job.title}</p>
                      <p className="truncate text-[12px] text-ink-3">{cp?.name ?? '—'}</p>
                    </div>
                    <p className="flex items-start gap-1.5 text-[12.5px] text-ink-2">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--warning)]" />
                      <span className="line-clamp-2">{reasonText(r.view, t)}</span>
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <Pill tone="neutral" dot={STATUS_COLOR[r.job.status]} size="xs" className="bg-[var(--surface)]">
                        {t(`core.status.${r.job.status}`)}
                      </Pill>
                      <span className={cn('font-mono text-[12px] tabular-nums', overdue ? 'font-medium text-danger' : 'text-ink-2')}>{shortDate(r.job.dueAt, lang)}</span>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>

          {rows.length > LIMIT && (
            <div className="relative z-[1] mt-3 flex justify-center">
              <Button size="sm" variant="ghost" onClick={() => setExpanded((e) => !e)}>
                {expanded ? t('overview.common.showLess') : t('overview.common.showAll', { n: rows.length })}
              </Button>
            </div>
          )}
        </>
      )}
      {spare > 0 && onTrack.length > 0 && (
        <div className="relative z-[1] mt-4">
          <p className="mb-1 flex items-center gap-1.5 px-1 text-[12px] font-medium text-ink-3">
            <CircleCheck className="size-3.5 text-[var(--success)]" />
            {t('overview.attention.onTrack', { count: onTrack.length })}
          </p>
          <ul>
            {onTrack.slice(0, spare).map((j, i) => (
              <motion.li key={j.id} custom={i + rows.length} variants={listItem} initial="hidden" animate="show">
                <button
                  type="button"
                  onClick={() => navigate(`/jobs/${j.id}`)}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)] md:px-4"
                >
                  <MonoId className="w-[64px] shrink-0 text-ink-3">{j.id}</MonoId>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{j.title}</span>
                  <span className="hidden w-28 shrink-0 truncate text-[12px] text-ink-3 lg:block">{counterpart(j)?.name}</span>
                  <span className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--surface-3)] sm:block">
                    <motion.span
                      className="block h-full rounded-full bg-[var(--success)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${j.progress}%` }}
                      transition={{ duration: 0.9, delay: 0.3 + i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </span>
                  <span className="w-[56px] shrink-0 whitespace-nowrap text-right font-mono text-[12px] text-ink-3">{shortDate(j.dueAt, lang)}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
      {flagged.length > 0 && <RiskMix counts={counts} waiting={flagged.filter((f) => f.waitingOnMe).length} active={filter} onPick={(f) => setPrefs({ riskFilter: filter === f ? 'all' : f })} />}
    </Card>
  )
}

const MIX_COLOR: Record<RiskLevel, string> = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--ink-4)' }

/** Footer: stacked risk distribution — each legend entry filters the table. */
function RiskMix({ counts, waiting, active, onPick }: { counts: Record<RiskLevel, number>; waiting: number; active: RiskFilter; onPick: (f: RiskLevel) => void }) {
  const t = useT()
  const total = counts.high + counts.medium + counts.low || 1
  const levels: RiskLevel[] = ['high', 'medium', 'low']
  return (
    <div className="relative z-[1] mt-auto pt-5">
      <div className="tile p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2 text-[12.5px]">
          <span className="font-medium text-ink">{t('overview.attention.mix')}</span>
          <span className="text-ink-3">{t('overview.attention.waiting', { count: waiting })}</span>
        </div>
        <div className="flex h-2.5 gap-1">
          {levels.map((l, i) =>
            counts[l] ? (
              <motion.span
                key={l}
                className="h-full origin-left rounded-full"
                style={{ background: MIX_COLOR[l], flexGrow: counts[l], flexBasis: 0 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, opacity: active === 'all' || active === l ? 1 : 0.3 }}
                transition={{ scaleX: { type: 'spring', stiffness: 160, damping: 20, delay: 0.3 + i * 0.1 }, opacity: { duration: 0.2 } }}
              />
            ) : null,
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {levels.filter((l) => counts[l] > 0).map((l) => (
            <motion.button
              key={l}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onPick(l)}
              aria-pressed={active === l}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors',
                active === l ? 'bg-ink text-[var(--surface)]' : 'bg-[var(--surface)] text-ink-2 hover:text-ink',
              )}
            >
              <span className="size-2 rounded-full" style={{ background: MIX_COLOR[l] }} />
              {t(`core.priority.${l}`)}
              <span className="font-mono tabular-nums opacity-70">{counts[l]}</span>
              <span className="font-mono text-[10.5px] opacity-50">{Math.round((counts[l] / total) * 100)}%</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
