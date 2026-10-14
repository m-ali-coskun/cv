import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  CircleAlert,
  Columns3,
  GanttChartSquare,
  Image as ImageIcon,
  Inbox,
  ListFilter,
  Plus,
  Rows3,
  Search,
  SortAsc,
  SortDesc,
  Star,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { BOARD_STATUSES, type JobStatus, type Priority, type Role } from '@/store/types'
import { spring } from '@/lib/motion'
import { STATUS_COLOR } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Segmented'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Drawer } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/Badge'
import { Popover, PopMenu } from '../shared/Popover'
import { CounterpartAvatar } from '../shared/JobCard'
import { ARCHIVED_STATUSES, PRIORITIES, useIsMobile, type JobRow } from '../shared/model'
import { DEFAULT_DIR, activeFilterCount, type JobFilters } from './filters'
import { useJobsPrefs, type JobsView, type SortKey } from './prefs'

export interface CounterpartOption {
  id: string
  name: string
  row: JobRow
  count: number
}

interface ToolbarProps {
  role: Role
  view: JobsView
  onView: (v: JobsView) => void
  filters: JobFilters
  onFilters: (f: JobFilters) => void
  counterparts: CounterpartOption[]
  shown: number
  total: number
  requests: number
  searchRef: React.RefObject<HTMLInputElement | null>
}

const SORTS: SortKey[] = ['due', 'priority', 'updated', 'created', 'progress', 'budget', 'id', 'title', 'counterpart', 'status']

/** Header row: view switch · search · filters · sort · counts · primary action. */
export function Toolbar({ role, view, onView, filters, onFilters, counterparts, shown, total, requests, searchRef }: ToolbarProps) {
  const t = useT()
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const sort = useJobsPrefs((s) => s.sort)
  const dir = useJobsPrefs((s) => s.dir)
  const setPrefs = useJobsPrefs((s) => s.set)
  const [sheet, setSheet] = useState(false)
  const nFilters = activeFilterCount(filters)

  const views = [
    { value: 'board' as const, label: <span className="hidden sm:inline">{t('jobs.view.board')}</span>, icon: <Columns3 className="size-4" /> },
    { value: 'list' as const, label: <span className="hidden sm:inline">{t('jobs.view.list')}</span>, icon: <Rows3 className="size-4" /> },
    { value: 'timeline' as const, label: <span className="hidden sm:inline">{t('jobs.view.timeline')}</span>, icon: <GanttChartSquare className="size-4" /> },
  ]

  const filterBtn = (p: { onClick: () => void; open?: boolean; ref?: React.Ref<HTMLButtonElement> }) => (
    <motion.button
      ref={p.ref}
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={p.onClick}
      aria-label={t('core.action.filter')}
      className={cn(
        'relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
        nFilters ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink',
        p.open && !nFilters && 'bg-[var(--surface-3)] text-ink',
      )}
    >
      <ListFilter className="size-4" />
      <span className="hidden sm:inline">{t('core.action.filter')}</span>
      <AnimatePresence>
        {nFilters > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={spring.bouncy}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-ink dark:bg-ink dark:text-[var(--surface)]"
          >
            {nFilters}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )

  return (
    <div className="card relative z-[3] flex flex-col gap-2 p-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center gap-2">
        <Segmented<JobsView> value={view} onChange={onView} options={views} layoutId="jobs-view" className="shrink-0" />
        <div className="ml-auto sm:hidden">
          <PrimaryAction role={role} requests={requests} compact onClick={() => navigate(role === 'client' ? '/brief/new' : '/requests')} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SearchBox value={filters.query} onChange={(q) => onFilters({ ...filters, query: q })} inputRef={searchRef} />

        {mobile ? (
          <>
            {filterBtn({ onClick: () => setSheet(true) })}
            <Drawer open={sheet} onClose={() => setSheet(false)} side="bottom" title={t('jobs.filters.title')}>
              <div className="px-5 pb-8">
                <FilterPanel role={role} view={view} filters={filters} onFilters={onFilters} counterparts={counterparts} onDone={() => setSheet(false)} />
              </div>
            </Drawer>
          </>
        ) : (
          <Popover width={360} align="end" trigger={(p) => filterBtn({ onClick: p.onClick, open: p.open, ref: p.ref })}>
            {(close) => (
              <div className="max-h-[min(70vh,560px)] overflow-y-auto p-2.5">
                <FilterPanel role={role} view={view} filters={filters} onFilters={onFilters} counterparts={counterparts} onDone={close} />
              </div>
            )}
          </Popover>
        )}

        <Popover
          width={240}
          trigger={(p) => (
            <motion.button
              ref={p.ref}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={p.onClick}
              aria-label={t('core.action.sort')}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink',
                p.open && 'bg-[var(--surface-3)] text-ink',
              )}
            >
              <ArrowDownUp className="size-4" />
              <span className="hidden max-w-[120px] truncate lg:inline">{t(`jobs.sort.${sort}`)}</span>
            </motion.button>
          )}
        >
          {(close) => (
            <PopMenu
              close={close}
              items={[
                { section: t('jobs.sort.by') },
                ...SORTS.map((k) => ({
                  key: k,
                  label: t(`jobs.sort.${k}`),
                  active: sort === k,
                  icon: sort === k ? <Check /> : <span className="block size-4" />,
                  onSelect: () => setPrefs({ sort: k, dir: DEFAULT_DIR[k] }),
                })),
                { divider: true },
                {
                  key: 'dir',
                  label: t(dir === 'asc' ? 'jobs.sort.asc' : 'jobs.sort.desc'),
                  icon: dir === 'asc' ? <SortAsc /> : <SortDesc />,
                  hint: t('jobs.sort.flip'),
                  onSelect: () => setPrefs({ dir: dir === 'asc' ? 'desc' : 'asc' }),
                },
              ]}
            />
          )}
        </Popover>
      </div>

      <div className="hidden items-center gap-3 sm:ml-auto sm:flex">
        <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">
          <motion.span key={shown} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-ink">
            {shown}
          </motion.span>
          {shown !== total && <span> / {total}</span>} {t('jobs.countLabel', { count: total })}
        </span>
        <PrimaryAction role={role} requests={requests} onClick={() => navigate(role === 'client' ? '/brief/new' : '/requests')} />
      </div>
    </div>
  )
}

function PrimaryAction({ role, requests, onClick, compact }: { role: Role; requests: number; onClick: () => void; compact?: boolean }) {
  const t = useT()
  if (role === 'client')
    return (
      <Button size={compact ? 'sm' : 'md'} icon={<Plus className="size-4" />} onClick={onClick}>
        {t('jobs.newBrief')}
      </Button>
    )
  return (
    <Button size={compact ? 'sm' : 'md'} icon={<Inbox className="size-4" />} onClick={onClick}>
      {t('core.nav.requests')}
      {requests > 0 && (
        <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-ink dark:bg-ink dark:text-accent">
          {requests}
        </span>
      )}
    </Button>
  )
}

function SearchBox({ value, onChange, inputRef }: { value: string; onChange: (v: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const t = useT()
  const [focus, setFocus] = useState(false)
  return (
    <motion.div
      animate={{ boxShadow: focus ? '0 0 0 4px var(--accent-softer)' : '0 0 0 0px transparent' }}
      className={cn(
        'relative flex h-10 min-w-0 flex-1 items-center rounded-full bg-[var(--surface-2)] transition-colors sm:max-w-[340px]',
        focus && 'bg-[var(--surface)]',
      )}
    >
      <Search className="pointer-events-none absolute left-3.5 size-4 text-ink-3" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onChange('')
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        placeholder={t('jobs.searchPh')}
        aria-label={t('core.action.search')}
        className="h-full min-w-0 flex-1 bg-transparent pl-10 pr-2 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
      />
      <AnimatePresence mode="popLayout" initial={false}>
        {value ? (
          <motion.button
            key="x"
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onChange('')}
            aria-label={t('jobs.filters.clearSearch')}
            className="mr-1.5 inline-flex size-7 items-center justify-center rounded-full bg-[var(--surface-3)] text-ink-2 hover:text-ink"
          >
            <X className="size-3.5" />
          </motion.button>
        ) : (
          <motion.span key="k" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mr-2 hidden sm:inline-flex">
            <Kbd className="bg-[var(--surface-3)] text-ink-2">/</Kbd>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** Shared content of the filter popover (desktop) and bottom sheet (phones). */
export function FilterPanel({
  role,
  view,
  filters,
  onFilters,
  counterparts,
  onDone,
}: {
  role: Role
  view: JobsView
  filters: JobFilters
  onFilters: (f: JobFilters) => void
  counterparts: CounterpartOption[]
  onDone: () => void
}) {
  const t = useT()
  const covers = useJobsPrefs((s) => s.covers)
  const showClosed = useJobsPrefs((s) => s.showClosed)
  const setPrefs = useJobsPrefs((s) => s.set)
  const statuses: JobStatus[] = [...BOARD_STATUSES, ...(showClosed && view !== 'board' ? ARCHIVED_STATUSES : [])]
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  return (
    <div className="flex flex-col gap-4">
      <Section title={t('core.common.stage')}>
        {statuses.map((s) => (
          <FChip key={s} on={filters.statuses.includes(s)} onClick={() => onFilters({ ...filters, statuses: toggleIn(filters.statuses, s) })}>
            <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {t(`core.status.${s}`)}
          </FChip>
        ))}
      </Section>
      <Section title={t('core.common.priority')}>
        {PRIORITIES.map((p: Priority) => (
          <FChip key={p} on={filters.priorities.includes(p)} onClick={() => onFilters({ ...filters, priorities: toggleIn(filters.priorities, p) })}>
            {t(`core.priority.${p}`)}
          </FChip>
        ))}
      </Section>
      {counterparts.length > 0 && (
        <Section title={t(role === 'client' ? 'core.common.designer' : 'core.common.client')}>
          <div className="no-scrollbar -mx-1 flex max-h-[168px] w-full flex-col gap-0.5 overflow-y-auto px-1">
            {counterparts.map((c) => {
              const on = filters.counterparts.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onFilters({ ...filters, counterparts: toggleIn(filters.counterparts, c.id) })}
                  className={cn('flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px] transition-colors', on ? 'bg-accent-soft' : 'hover:bg-[var(--surface-2)]')}
                >
                  <CounterpartAvatar person={c.row.counterpart} isClient={c.row.counterpartIsClient} seed={c.id} size={24} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-[11px] text-ink-3">{c.count}</span>
                  <motion.span initial={false} animate={{ scale: on ? 1 : 0 }} transition={spring.bouncy}>
                    <Check className="size-4 text-accent-text" />
                  </motion.span>
                </button>
              )
            })}
          </div>
        </Section>
      )}
      <div className="flex flex-col gap-1 rounded-2xl bg-[var(--surface-2)] p-1.5">
        <ToggleRow icon={<Star className="size-4" />} label={t('jobs.filters.starred')} checked={filters.starred} onChange={(v) => onFilters({ ...filters, starred: v })} />
        <ToggleRow icon={<CircleAlert className="size-4" />} label={t('jobs.filters.overdue')} checked={filters.overdue} onChange={(v) => onFilters({ ...filters, overdue: v })} />
        <ToggleRow icon={<AlertTriangle className="size-4" />} label={t('jobs.filters.atRisk')} checked={filters.atRisk} onChange={(v) => onFilters({ ...filters, atRisk: v })} />
        {view !== 'board' && <ToggleRow icon={<X className="size-4" />} label={t('jobs.filters.showClosed')} checked={showClosed} onChange={(v) => setPrefs({ showClosed: v })} />}
        {view === 'board' && <ToggleRow icon={<ImageIcon className="size-4" />} label={t('jobs.filters.covers')} checked={covers} onChange={(v) => setPrefs({ covers: v })} />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilters({ statuses: [], priorities: [], counterparts: [], starred: false, overdue: false, atRisk: false, query: filters.query })}
          disabled={!activeFilterCount(filters)}
        >
          {t('jobs.filters.reset')}
        </Button>
        <Button size="sm" onClick={onDone}>
          {t('core.action.done')}
        </Button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function FChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors',
        on ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-line-2 text-ink-2 hover:text-ink',
      )}
    >
      {children}
    </motion.button>
  )
}

function ToggleRow({ icon, label, checked, onChange }: { icon: ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:bg-[var(--surface)]">
      <span className="text-ink-3">{icon}</span>
      <span className="flex-1">{label}</span>
      <Toggle checked={checked} onChange={onChange} size="sm" label={label} />
    </label>
  )
}

/** "/" focuses search, b / l / t switch views (ignored while typing). */
export function useJobsShortcuts(searchRef: React.RefObject<HTMLInputElement | null>, onView: (v: JobsView) => void) {
  const cb = useRef(onView)
  cb.current = onView
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input,textarea,[contenteditable="true"],[role="dialog"]')) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'b') cb.current('board')
      else if (e.key === 'l') cb.current('list')
      else if (e.key === 't') cb.current('timeline')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [searchRef])
}
