import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Check, ClipboardCopy, Download, Minus, Star, StarOff, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import type { Role } from '@/store/types'
import { toast } from '@/store/toasts'
import { dueLabel, fmt, shortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { EASE_OUT, spring } from '@/lib/motion'
import { DisciplineIcon, PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Progress'
import { MediaView } from '@/components/art/MediaView'
import { CounterpartAvatar, StarButton } from '../shared/JobCard'
import { JobMenu } from '../shared/JobMenu'
import { URGENCY_TEXT, downloadCsv, isClosed, type JobRow } from '../shared/model'
import { DEFAULT_DIR } from './filters'
import { useJobsPrefs, type SortKey } from './prefs'

const GRID = 'grid-cols-[28px_70px_minmax(220px,2.6fr)_minmax(130px,1fr)_116px_84px_120px_100px_88px_72px]'

/** Sortable table (desktop) / stacked cards (phones) with multi-select + bulk actions. */
export function ListView({ rows, role }: { rows: JobRow[]; role: Role }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const sort = useJobsPrefs((s) => s.sort)
  const dir = useJobsPrefs((s) => s.dir)
  const setPrefs = useJobsPrefs((s) => s.set)
  const toggleStar = useApp((s) => s.toggleStar)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const visibleSel = useMemo(() => rows.filter((r) => selected.has(r.job.id)), [rows, selected])
  const allOn = rows.length > 0 && visibleSel.length === rows.length
  const someOn = visibleSel.length > 0 && !allOn

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.job.id)))

  const head = (key: SortKey, label: string, className?: string) => {
    const on = sort === key
    return (
      <button
        type="button"
        onClick={() => setPrefs(on ? { dir: dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: DEFAULT_DIR[key] })}
        className={cn('group inline-flex items-center gap-1 text-left transition-colors', on ? 'text-ink' : 'hover:text-ink', className)}
      >
        {label}
        <motion.span
          initial={false}
          animate={{ opacity: on ? 1 : 0, rotate: on && dir === 'desc' ? 180 : 0 }}
          transition={spring.snappy}
          className="inline-flex group-hover:opacity-60"
        >
          <ArrowUp className="size-3" />
        </motion.span>
      </button>
    )
  }

  const totals = useMemo(() => {
    const budget = rows.reduce((n, r) => n + r.job.budget, 0)
    const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.job.progress, 0) / rows.length) : 0
    return { budget, avg, currency: rows[0]?.job.currency ?? 'EUR' }
  }, [rows])

  const exportCsv = (list: JobRow[]) => {
    downloadCsv(`designtab-jobs-${fmt(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['ID', 'Title', role === 'client' ? 'Designer' : 'Client', 'Status', 'Priority', 'Progress', 'Due', 'Budget', 'Currency', 'Deliverables'],
      ...list.map((r) => [r.job.id, r.job.title, r.name, r.job.status, r.job.priority, r.job.progress, r.job.dueAt.slice(0, 10), r.job.budget, r.job.currency, `${r.done}/${r.total}`]),
    ])
    toast({ title: t('jobs.list.exported', { count: list.length }), tone: 'success', duration: 2400 })
  }
  const copyIds = async (list: JobRow[]) => {
    try {
      await navigator.clipboard.writeText(list.map((r) => r.job.id).join(', '))
      toast({ title: t('jobs.list.idsCopied', { count: list.length }), tone: 'success', duration: 2200 })
    } catch {
      toast({ title: t('jobs.toast.copyFailed'), tone: 'error' })
    }
  }
  const starAll = (on: boolean) => {
    visibleSel.forEach((r) => r.job.starred !== on && toggleStar(r.job.id))
    toast({ title: t(on ? 'jobs.list.starredMany' : 'jobs.list.unstarredMany', { count: visibleSel.length }), duration: 2000 })
  }

  return (
    <>
      {/* desktop table */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
        className="card relative hidden overflow-hidden md:block"
      >
        <div className="no-scrollbar overflow-x-auto">
          <div className="min-w-[1130px] p-2" role="table" aria-label={t('jobs.view.list')}>
            <div role="row" className={cn('grid items-center gap-2.5 rounded-[18px] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] font-medium text-ink-3', GRID)}>
              <Checkbox on={allOn} some={someOn} onClick={toggleAll} label={t('jobs.list.selectAll')} />
              {head('id', t('jobs.col.id'))}
              {head('title', t('jobs.col.title'))}
              {head('counterpart', t(role === 'client' ? 'core.common.designer' : 'core.common.client'))}
              {head('status', t('core.common.stage'))}
              {head('priority', t('core.common.priority'))}
              {head('progress', t('core.common.progress'))}
              {head('due', t('core.common.due'))}
              {head('budget', t('core.common.budget'), 'justify-self-end')}
              <span />
            </div>
            <motion.div layout className="flex flex-col">
              <AnimatePresence initial={false}>
                {rows.map((r, i) => {
                  const on = selected.has(r.job.id)
                  return (
                    <motion.div
                      key={r.job.id}
                      role="row"
                      layout="position"
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: Math.min(i, 12) * 0.025, duration: 0.4, ease: EASE_OUT } }}
                      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                      transition={spring.smooth}
                      onClick={() => navigate(`/jobs/${r.job.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && navigate(`/jobs/${r.job.id}`)}
                      tabIndex={0}
                      className={cn(
                        'group grid cursor-pointer items-center gap-2.5 border-b border-line px-3 py-3 text-[13.5px] outline-none transition-colors last:border-b-0 hover:bg-[var(--surface-2)]/70 focus-visible:bg-[var(--surface-2)]',
                        GRID,
                        on && 'bg-accent-softer hover:bg-accent-softer',
                      )}
                    >
                      <Checkbox on={on} onClick={() => toggle(r.job.id)} label={r.job.id} />
                      <span className="font-mono text-[12.5px] text-ink-2">{r.job.id}</span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="relative size-9 shrink-0 overflow-hidden rounded-[11px]">
                          <MediaView media={r.job.cover} />
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <DisciplineIcon id={r.job.discipline} size={16} />
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{r.job.title}</span>
                          <span className="block truncate text-[11.5px] text-ink-3">
                            {r.unread > 0 && <span className="mr-1.5 font-medium text-accent-text">{t('jobs.card.unread', { count: r.unread })} ·</span>}
                            {t('jobs.card.deliverables', { done: r.done, total: r.total })}
                          </span>
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <CounterpartAvatar person={r.counterpart} isClient={r.counterpartIsClient} seed={r.counterpartId} size={24} />
                        <span className="truncate text-ink-2">{r.name}</span>
                      </span>
                      <span>
                        <StatusBadge status={r.job.status} />
                      </span>
                      <span>
                        <PriorityBadge priority={r.job.priority} className="h-6.5 px-2.5" />
                      </span>
                      <span className="flex items-center gap-2">
                        <ProgressBar value={r.job.progress} height={6} tone={r.job.status === 'approved' ? 'success' : 'ink'} className="flex-1" />
                        <span className="w-8 text-right font-mono text-[11.5px] tabular-nums text-ink-2">{r.job.progress}%</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[12.5px] text-ink">{shortDate(r.job.dueAt, lang)}</span>
                        <span className={cn('block truncate text-[11px]', URGENCY_TEXT[r.urgency])}>{isClosed(r.job.status) ? t(`core.status.${r.job.status}`) : dueLabel(r.job.dueAt, lang)}</span>
                      </span>
                      <span className="justify-self-end font-mono text-[12.5px] tabular-nums">{formatMoney(r.job.budget, r.job.currency, lang)}</span>
                      <span className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <StarButton starred={r.job.starred} onToggle={() => toggleStar(r.job.id)} glass={false} />
                        <JobMenu job={r.job} role={role} name={r.name} tone="ghost" />
                      </span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
            <div className={cn('grid items-center gap-2.5 px-3 pb-1.5 pt-3 text-[12px] text-ink-3', GRID)}>
              <span />
              <span className="col-span-2">{t('jobs.list.total', { count: rows.length })}</span>
              <span />
              <span />
              <span />
              <span className="font-mono">⌀ {totals.avg}%</span>
              <span />
              <span className="justify-self-end font-mono font-medium text-ink">{formatMoney(totals.budget, totals.currency, lang)}</span>
              <span />
            </div>
          </div>
        </div>
      </motion.div>

      {/* phone cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        <div className="flex items-center justify-between px-1 text-[12px] text-ink-3">
          <button type="button" onClick={toggleAll} className="inline-flex items-center gap-2">
            <Checkbox on={allOn} some={someOn} onClick={toggleAll} label={t('jobs.list.selectAll')} asSpan />
            {t('jobs.list.selectAll')}
          </button>
          <span className="font-mono">{formatMoney(totals.budget, totals.currency, lang)}</span>
        </div>
        <AnimatePresence initial={false}>
          {rows.map((r, i) => {
            const on = selected.has(r.job.id)
            return (
              <motion.div
                key={r.job.id}
                layout="position"
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: Math.min(i, 10) * 0.03, duration: 0.45, ease: EASE_OUT } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/jobs/${r.job.id}`)}
                className={cn('card flex cursor-pointer flex-col gap-2.5 p-3', on && 'shadow-[0_0_0_2px_var(--accent)]')}
              >
                <div className="flex items-start gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-[14px]">
                    <MediaView media={r.job.cover} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      <span className="font-mono">{r.job.id}</span>
                      <span>·</span>
                      <span className="truncate">{r.name}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-snug">{r.job.title}</p>
                  </div>
                  <span className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox on={on} onClick={() => toggle(r.job.id)} label={r.job.id} />
                    <JobMenu job={r.job} role={role} name={r.name} tone="ghost" />
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={r.job.status} />
                  <PriorityBadge priority={r.job.priority} className="h-6.5 px-2.5" />
                  <span className={cn('ml-auto text-[12px] font-medium', URGENCY_TEXT[r.urgency])}>
                    {isClosed(r.job.status) ? shortDate(r.job.approvedAt ?? r.job.dueAt, lang) : dueLabel(r.job.dueAt, lang)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={r.job.progress} height={6} className="flex-1" />
                  <span className="font-mono text-[11.5px] tabular-nums text-ink-2">{r.job.progress}%</span>
                  <span className="font-mono text-[12px] tabular-nums text-ink">{formatMoney(r.job.budget, r.job.currency, lang, true)}</span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* bulk bar */}
      {createPortal(
        <AnimatePresence>
          {visibleSel.length > 0 && (
            <motion.div
              initial={{ y: 90, opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ y: 90, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="glass-night fixed inset-x-3 bottom-[6.5rem] z-[60] mx-auto flex max-w-[620px] items-center gap-1 rounded-full p-1.5 pl-4 lg:bottom-6"
              role="toolbar"
              aria-label={t('jobs.list.bulk')}
            >
              <motion.span key={visibleSel.length} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={spring.bouncy} className="mr-auto shrink-0 text-[13px] font-medium">
                {t('jobs.list.selected', { count: visibleSel.length })}
              </motion.span>
              <BulkBtn icon={<Star className="size-4" />} label={t('jobs.menu.star')} onClick={() => starAll(true)} />
              <BulkBtn icon={<StarOff className="size-4" />} label={t('jobs.menu.unstar')} onClick={() => starAll(false)} />
              <BulkBtn icon={<ClipboardCopy className="size-4" />} label={t('jobs.list.copyIds')} onClick={() => copyIds(visibleSel)} />
              <BulkBtn icon={<Download className="size-4" />} label={t('jobs.list.export')} onClick={() => exportCsv(visibleSel)} accent />
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                aria-label={t('jobs.list.clearSel')}
                className="ml-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* export everything */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => exportCsv(rows)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface)] hover:text-ink"
        >
          <Download className="size-3.5" /> {t('jobs.list.exportAll', { count: rows.length })}
        </button>
      </div>
    </>
  )
}

function BulkBtn({ icon, label, onClick, accent }: { icon: ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
        accent ? 'bg-accent text-accent-ink' : 'text-white/85 hover:bg-white/10 hover:text-white',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  )
}

function Checkbox({ on, some, onClick, label, asSpan }: { on: boolean; some?: boolean; onClick: () => void; label: string; asSpan?: boolean }) {
  const inner = (
    <motion.span
      animate={{ scale: on ? [1, 1.18, 1] : 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex size-5 items-center justify-center rounded-[7px] border transition-colors',
        on || some ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-line-2 bg-[var(--surface)]',
      )}
    >
      {on ? <Check className="size-3.5" strokeWidth={3} /> : some ? <Minus className="size-3.5" strokeWidth={3} /> : null}
    </motion.span>
  )
  if (asSpan) return inner
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={some ? 'mixed' : on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex size-8 items-center justify-center"
    >
      {inner}
    </button>
  )
}

