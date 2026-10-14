import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Briefcase, Compass, Hand, Inbox, Plus, SearchX, Sparkles, X } from 'lucide-react'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useMyJobs, useRole } from '@/store/selectors'
import { BOARD_STATUSES, JOB_STATUSES, type JobStatus, type Priority } from '@/store/types'
import { toast } from '@/store/toasts'
import { EASE_OUT, spring } from '@/lib/motion'
import { STATUS_COLOR } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { JobFlowsProvider } from './shared/flows'
import { ARCHIVED_STATUSES, isClosed, useJobRows } from './shared/model'
import { BoardView } from './board/BoardView'
import { ListView } from './board/ListView'
import { TimelineView } from './board/TimelineView'
import { SummaryStrip, type QuickFilter } from './board/SummaryStrip'
import { Toolbar, useJobsShortcuts, type CounterpartOption } from './board/Toolbar'
import { EMPTY_FILTERS, applyFilters, sortRows, type JobFilters } from './board/filters'
import { useJobsPrefs, type JobsView } from './board/prefs'

/** /jobs — board · list · timeline of the active role's jobs (filtered by the discipline tab). */
export default function JobsPage() {
  return (
    <JobFlowsProvider>
      <JobsInner />
    </JobFlowsProvider>
  )
}

const VIEWS: JobsView[] = ['board', 'list', 'timeline']
const parseStatuses = (v: string | null) => (v ? (v.split(',').filter((s) => (JOB_STATUSES as readonly string[]).includes(s)) as JobStatus[]) : [])

function JobsInner() {
  const t = useT()
  const role = useRole()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const jobs = useMyJobs({ includeClosed: true })
  const allRows = useJobRows(jobs)
  const prefs = useJobsPrefs()
  const searchRef = useRef<HTMLInputElement>(null)
  const [rest, setRest] = useState<Omit<JobFilters, 'statuses'>>(() => ({ ...EMPTY_FILTERS, query: params.get('q') ?? '' }))
  const [quick, setQuick] = useState<'waiting' | 'week' | null>(null)

  // the status filter lives in the URL (?status=in_review,revisions) so links can pre-filter
  const statuses = useMemo(() => parseStatuses(params.get('status')), [params])
  const filters: JobFilters = useMemo(() => ({ ...rest, statuses }), [rest, statuses])
  const setFilters = useCallback(
    (f: JobFilters) => {
      setRest({ priorities: f.priorities, counterparts: f.counterparts, starred: f.starred, overdue: f.overdue, atRisk: f.atRisk, query: f.query })
      const next = f.statuses.join(',')
      if (next !== (params.get('status') ?? '')) {
        const p = new URLSearchParams(params)
        if (next) p.set('status', next)
        else p.delete('status')
        setParams(p, { replace: true })
      }
    },
    [params, setParams],
  )

  // ?view=list deep links
  const urlView = params.get('view') as JobsView | null
  useEffect(() => {
    if (urlView && VIEWS.includes(urlView) && urlView !== prefs.view) prefs.set({ view: urlView })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView])
  const view = prefs.view
  const setView = useCallback(
    (v: JobsView) => {
      prefs.set({ view: v })
      if (params.get('view')) {
        const p = new URLSearchParams(params)
        p.delete('view')
        setParams(p, { replace: true })
      }
    },
    [prefs, params, setParams],
  )
  useJobsShortcuts(searchRef, setView)

  // rows per view
  const scoped = useMemo(() => {
    const showArchived = view !== 'board' && (prefs.showClosed || statuses.some((s) => ARCHIVED_STATUSES.includes(s)))
    return allRows.filter((r) => showArchived || !ARCHIVED_STATUSES.includes(r.job.status))
  }, [allRows, view, prefs.showClosed, statuses])

  const filtered = useMemo(() => {
    let list = applyFilters(scoped, filters, { ignoreStatus: view === 'board' })
    if (quick === 'waiting')
      list = list.filter((r) =>
        role === 'client' ? r.job.status === 'in_review' || r.job.counterOffer?.status === 'pending' : r.job.status === 'requested' || r.job.status === 'revisions',
      )
    if (quick === 'week') list = list.filter((r) => !isClosed(r.job.status) && r.days >= 0 && r.days <= 7)
    return sortRows(list, prefs.sort, prefs.dir)
  }, [scoped, filters, view, quick, role, prefs.sort, prefs.dir])

  const boardColumns = useMemo(() => {
    const picked = statuses.filter((s) => BOARD_STATUSES.includes(s))
    return picked.length ? BOARD_STATUSES.filter((s) => picked.includes(s)) : BOARD_STATUSES
  }, [statuses])
  const boardCount = view === 'board' ? filtered.filter((r) => boardColumns.includes(r.job.status)).length : filtered.length

  const counterparts = useMemo<CounterpartOption[]>(() => {
    const m = new Map<string, CounterpartOption>()
    for (const r of allRows) {
      const c = m.get(r.counterpartId)
      if (c) c.count++
      else m.set(r.counterpartId, { id: r.counterpartId, name: r.name, row: r, count: 1 })
    }
    return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [allRows])

  const requests = useMemo(() => allRows.filter((r) => r.job.status === 'requested' && r.job.counterOffer?.status !== 'pending').length, [allRows])

  const pickQuick = (q: QuickFilter) => {
    if (q === 'overdue' || q === 'starred' || q === null) {
      setQuick(null)
      if (q === 'overdue') setRest((r) => ({ ...r, overdue: !r.overdue }))
      if (q === 'starred') setRest((r) => ({ ...r, starred: !r.starred }))
      if (q === null) setRest((r) => ({ ...r, overdue: false, starred: false }))
      return
    }
    setQuick(q)
  }
  const activeQuick: QuickFilter = quick ?? (rest.overdue ? 'overdue' : rest.starred ? 'starred' : null)

  const clearAll = () => {
    setQuick(null)
    setFilters({ ...EMPTY_FILTERS })
  }

  const chips = useActiveChips(filters, quick, counterparts, (f) => setFilters(f), () => setQuick(null))
  const hasJobs = allRows.length > 0

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SummaryStrip rows={scoped} role={role} active={activeQuick} onPick={pickQuick} />

      <Toolbar
        role={role}
        view={view}
        onView={setView}
        filters={filters}
        onFilters={setFilters}
        counterparts={counterparts}
        shown={boardCount}
        total={scoped.length}
        requests={requests}
        searchRef={searchRef}
      />

      {/* active filters */}
      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="-mt-1 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <AnimatePresence initial={false} mode="popLayout">
                {chips.map((c) => (
                  <motion.button
                    key={c.key}
                    layout
                    type="button"
                    onClick={c.remove}
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={spring.snappy}
                    whileTap={{ scale: 0.94 }}
                    className="glass inline-flex h-8 items-center gap-1.5 rounded-full pl-3 pr-2 text-[12.5px] font-medium text-ink"
                  >
                    <span className="relative z-[1] inline-flex items-center gap-1.5">
                      {c.icon}
                      {c.label}
                      <X className="size-3.5 text-ink-3" />
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
              <motion.button layout type="button" onClick={clearAll} className="h-8 rounded-full px-2.5 text-[12.5px] font-medium text-ink-3 hover:text-ink">
                {t('jobs.filters.clearAll')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasJobs ? (
        <div className="card">
          <EmptyState
            icon={<Briefcase />}
            title={t(role === 'client' ? 'jobs.empty.clientTitle' : 'jobs.empty.designerTitle')}
            description={t(role === 'client' ? 'jobs.empty.clientBody' : 'jobs.empty.designerBody')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {role === 'client' ? (
                  <Button icon={<Plus className="size-4" />} onClick={() => navigate('/brief/new')}>
                    {t('jobs.newBrief')}
                  </Button>
                ) : (
                  <Button
                    icon={<Sparkles className="size-4" />}
                    onClick={() => {
                      const j = useApp.getState().spawnIncomingRequest()
                      if (j) toast({ title: t('jobs.requests.spawned'), description: j.title, tone: 'info', link: '/requests' })
                    }}
                  >
                    {t('jobs.requests.simulate')}
                  </Button>
                )}
                <Button variant="glass" icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
                  {t(role === 'client' ? 'jobs.empty.findDesigners' : 'jobs.empty.findClients')}
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -6, filter: 'blur(6px)', transition: { duration: 0.15 } }}
            className="min-w-0"
          >
            {filtered.length === 0 && view !== 'board' ? (
              <FilteredEmpty onClear={clearAll} />
            ) : view === 'board' ? (
              <>
                {boardCount === 0 && (chips.length > 0 || filters.query) && (
                  <div className="mb-3">
                    <FilteredEmpty onClear={clearAll} compact />
                  </div>
                )}
                <BoardHint role={role} />
                <BoardView rows={filtered} role={role} columns={boardColumns} />
              </>
            ) : view === 'list' ? (
              <ListView rows={filtered} role={role} />
            ) : (
              <TimelineView rows={filtered} role={role} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

function FilteredEmpty({ onClear, compact }: { onClear: () => void; compact?: boolean }) {
  const t = useT()
  if (compact)
    return (
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <SearchX className="size-4 text-ink-3" />
        <span className="flex-1 text-[13px] text-ink-2">{t('jobs.empty.filtered')}</span>
        <Button size="sm" variant="soft" onClick={onClear}>
          {t('jobs.filters.clearAll')}
        </Button>
      </div>
    )
  return (
    <div className="card">
      <EmptyState
        icon={<SearchX />}
        title={t('jobs.empty.filtered')}
        description={t('jobs.empty.filteredBody')}
        action={
          <Button variant="soft" onClick={onClear}>
            {t('jobs.filters.clearAll')}
          </Button>
        }
      />
    </div>
  )
}

const HINT_KEY = 'designtab-jobs-hint'
function BoardHint({ role }: { role: string }) {
  const t = useT()
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) !== '1'
    } catch {
      return true
    }
  })
  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      /* ignore */
    }
  }
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
          className="overflow-hidden"
        >
          <div className="mb-3 flex items-center gap-3 rounded-[20px] bg-accent-soft px-4 py-2.5 text-[12.5px] text-ink">
            <motion.span animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }} className="inline-flex">
              <Hand className="size-4 text-accent-text" />
            </motion.span>
            <span className="flex-1">{t(role === 'client' ? 'jobs.hint.client' : 'jobs.hint.designer')}</span>
            <button type="button" onClick={dismiss} aria-label={t('core.action.close')} className="inline-flex size-7 items-center justify-center rounded-full hover:bg-[var(--surface)]">
              <X className="size-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ActiveChip {
  key: string
  label: ReactNode
  icon?: ReactNode
  remove: () => void
}

function useActiveChips(
  f: JobFilters,
  quick: 'waiting' | 'week' | null,
  counterparts: CounterpartOption[],
  set: (f: JobFilters) => void,
  clearQuick: () => void,
): ActiveChip[] {
  const t = useT()
  const role = useRole()
  return useMemo(() => {
    const out: ActiveChip[] = []
    if (quick)
      out.push({
        key: `q-${quick}`,
        label: quick === 'waiting' ? t(role === 'client' ? 'jobs.kpi.yourMove' : 'jobs.kpi.toAnswer') : t('jobs.kpi.week'),
        icon: <Inbox className="size-3.5 text-ink-3" />,
        remove: clearQuick,
      })
    for (const s of f.statuses)
      out.push({
        key: `s-${s}`,
        label: t(`core.status.${s}`),
        icon: <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />,
        remove: () => set({ ...f, statuses: f.statuses.filter((x) => x !== s) }),
      })
    for (const p of f.priorities)
      out.push({ key: `p-${p}`, label: t(`core.priority.${p}`), remove: () => set({ ...f, priorities: f.priorities.filter((x: Priority) => x !== p) }) })
    for (const c of f.counterparts)
      out.push({ key: `c-${c}`, label: counterparts.find((x) => x.id === c)?.name ?? c, remove: () => set({ ...f, counterparts: f.counterparts.filter((x) => x !== c) }) })
    if (f.starred) out.push({ key: 'starred', label: t('jobs.filters.starred'), remove: () => set({ ...f, starred: false }) })
    if (f.overdue) out.push({ key: 'overdue', label: t('jobs.filters.overdue'), remove: () => set({ ...f, overdue: false }) })
    if (f.atRisk) out.push({ key: 'atRisk', label: t('jobs.filters.atRisk'), remove: () => set({ ...f, atRisk: false }) })
    if (f.query.trim()) out.push({ key: 'q', label: `“${f.query.trim()}”`, remove: () => set({ ...f, query: '' }) })
    return out
  }, [f, quick, counterparts, set, clearQuick, t, role])
}

