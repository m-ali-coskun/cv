import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimate, useMotionValue, useSpring } from 'motion/react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import {
  ArrowDownToLine,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight,
  ChevronsRightLeft,
  Inbox,
  Lock,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { BOARD_STATUSES, type JobStatus, type Role } from '@/store/types'
import { toast } from '@/store/toasts'
import { formatMoney } from '@/lib/format'
import { EASE_OUT, spring } from '@/lib/motion'
import { STATUS_COLOR } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { JobCard } from '../shared/JobCard'
import { useJobCommands, useStartFlow } from '../shared/flows'
import { WIP_LIMITS, moveVerdict, type JobRow, type MoveVerdict } from '../shared/model'
import { useJobsPrefs } from './prefs'

const COL_ID = (s: JobStatus) => `col:${s}`
const statusOfCol = (id: string | number | undefined) => (id ? (String(id).replace('col:', '') as JobStatus) : null)

/** Pointer first (precise for tall columns), rectangle overlap as fallback (keyboard / edges). */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

const dropAnimation: DropAnimation = {
  duration: 320,
  easing: 'cubic-bezier(.23,1,.32,1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } }),
}

const COL_ICON: Partial<Record<JobStatus, typeof Inbox>> = {
  requested: Inbox,
  in_review: Send,
  revisions: RotateCcw,
  approved: BadgeCheck,
  final_touches: Sparkles,
}

/**
 * Kanban board. Cards drag between columns (mouse, touch long-press, or
 * keyboard: Space to lift, arrows to move, Space to drop). Every drop is
 * validated by `moveVerdict`: allowed moves run straight away, decisions
 * (approve / request changes / deliver) open their dialog, anything else is
 * refused with a shake and a toast.
 */
export function BoardView({ rows, role, columns }: { rows: JobRow[]; role: Role; columns: JobStatus[] }) {
  const t = useT()
  const flow = useStartFlow()
  const cmd = useJobCommands()
  const covers = useJobsPrefs((s) => s.covers)
  const collapsed = useJobsPrefs((s) => s.collapsed)
  const toggleCollapsed = useJobsPrefs((s) => s.toggleCollapsed)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<JobStatus | null>(null)
  const [shake, setShake] = useState<Record<string, number>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // overlay tilt follows horizontal drag velocity, then settles back
  const tilt = useMotionValue(2.5)
  const tiltS = useSpring(tilt, { stiffness: 260, damping: 18 })
  const last = useRef({ x: 0, t: 0 })
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const byStatus = useMemo(() => {
    const m = new Map<JobStatus, JobRow[]>(BOARD_STATUSES.map((s) => [s, []]))
    for (const r of rows) m.get(r.job.status)?.push(r)
    return m
  }, [rows])

  const active = activeId ? rows.find((r) => r.job.id === activeId) : undefined
  const verdicts = useMemo(() => {
    const out = new Map<JobStatus, MoveVerdict>()
    if (active) for (const s of BOARD_STATUSES) out.set(s, moveVerdict(active.job, s, role))
    return out
  }, [active, role])

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
    last.current = { x: 0, t: performance.now() }
    tilt.set(2.5)
    if (navigator.vibrate) navigator.vibrate(8)
  }
  const onDragMove = (e: DragMoveEvent) => {
    const now = performance.now()
    const dt = Math.max(8, now - last.current.t)
    const v = ((e.delta.x - last.current.x) / dt) * 16
    last.current = { x: e.delta.x, t: now }
    tilt.set(Math.max(-12, Math.min(12, 2.5 + v * 0.9)))
    clearTimeout(settle.current)
    settle.current = setTimeout(() => tilt.set(2.5), 90)
  }
  const onDragOver = (e: DragOverEvent) => setOverStatus(statusOfCol(e.over?.id))
  const reset = () => {
    setActiveId(null)
    setOverStatus(null)
    clearTimeout(settle.current)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id)
    const to = statusOfCol(e.over?.id)
    reset()
    const row = rows.find((r) => r.job.id === id)
    if (!row || !to) return
    const v = moveVerdict(row.job, to, role)
    if (v.kind === 'same') return
    if (v.kind === 'refuse') {
      setShake((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }))
      if (navigator.vibrate) navigator.vibrate([12, 40, 12])
      toast({ title: t(`jobs.refuse.${v.reason}`), description: t(`jobs.refuse.${v.reason}Hint`), tone: 'error', duration: 3200 })
      return
    }
    if (v.kind === 'modal') {
      flow(v.modal, row.job)
      return
    }
    if (v.action === 'accept') cmd.accept(row.job)
    else if (v.action === 'acceptCounter') cmd.answerCounter(row.job, true)
    else cmd.move(row.job, to)
    setFlash(id)
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1800)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      // only scroll when the pointer is really at an edge (the page itself is tall)
      autoScroll={{ threshold: { x: 0.14, y: 0.1 }, acceleration: 4, interval: 8 }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{
        announcements: {
          onDragStart: ({ active: a }) => t('jobs.a11y.lift', { id: String(a.id) }),
          onDragOver: ({ active: a, over }) => (over ? t('jobs.a11y.over', { id: String(a.id), status: t(`core.status.${statusOfCol(over.id)}`) }) : ''),
          onDragEnd: ({ active: a, over }) => (over ? t('jobs.a11y.drop', { id: String(a.id), status: t(`core.status.${statusOfCol(over.id)}`) }) : t('jobs.a11y.cancel')),
          onDragCancel: () => t('jobs.a11y.cancel'),
        },
        screenReaderInstructions: { draggable: t('jobs.a11y.instructions') },
      }}
    >
      <ColumnPager columns={columns} byStatus={byStatus} scroller={scroller} />
      <div
        ref={scroller}
        className={cn(
          'no-scrollbar relative -mx-2.5 flex items-start scroll-px-2.5 gap-3 overflow-x-auto px-2.5 pb-4 pt-1 sm:mx-0 sm:items-stretch sm:px-0 lg:snap-none',
          // mandatory snapping turns every auto-scroll tick into a full-column jump while dragging
          active ? 'snap-none' : 'snap-x snap-mandatory',
        )}
      >
        {columns.map((s, i) => (
          <BoardColumn
            key={s}
            index={i}
            status={s}
            rows={byStatus.get(s) ?? []}
            role={role}
            covers={covers}
            collapsed={collapsed.includes(s)}
            onToggle={() => toggleCollapsed(s)}
            verdict={verdicts.get(s)}
            isOver={overStatus === s}
            dragging={!!active}
            activeId={activeId}
            shake={shake}
            flash={flash}
          />
        ))}
      </div>
      {/* Portal: the page wrapper animates transform/filter, which would become the
          containing block of this position:fixed overlay and offset it from the pointer. */}
      {createPortal(
        <DragOverlay dropAnimation={dropAnimation} zIndex={90}>
          {active ? (
            <motion.div
              style={{ rotate: tiltS }}
              initial={{ scale: 1, y: 0 }}
              animate={{ scale: 1.045, y: -6 }}
              transition={spring.snappy}
              className="origin-[50%_30%]"
            >
              <JobCard row={active} role={role} state="overlay" showCover={covers} />
              <OverlayHint verdict={overStatus ? verdicts.get(overStatus) : undefined} status={overStatus} />
            </motion.div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}

/** Little label riding under the lifted card: what will happen on drop. */
function OverlayHint({ verdict, status }: { verdict?: MoveVerdict; status: JobStatus | null }) {
  const t = useT()
  const text = !verdict || !status || verdict.kind === 'same' ? null : verdict.kind === 'refuse' ? t('jobs.drop.locked') : dropText(verdict, status, t)
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={spring.snappy}
          className={cn(
            'absolute -bottom-4 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-medium shadow-lg',
            verdict?.kind === 'refuse' ? 'bg-danger text-white' : 'bg-ink text-[var(--surface)]',
          )}
        >
          {verdict?.kind === 'refuse' ? <Lock className="size-3.5" /> : <ArrowDownToLine className="size-3.5" />}
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function dropText(v: MoveVerdict, status: JobStatus, t: (k: string, vars?: Record<string, string | number>) => string) {
  if (v.kind === 'modal') return t(`jobs.drop.${v.modal}`)
  if (v.kind === 'ok') {
    if (v.action === 'accept') return t('jobs.drop.accept')
    if (v.action === 'acceptCounter') return t('jobs.drop.acceptCounter')
    return t('jobs.drop.move', { status: t(`core.status.${status}`) })
  }
  return ''
}

// ─────────────────────────── columns ───────────────────────────

interface ColumnProps {
  index: number
  status: JobStatus
  rows: JobRow[]
  role: Role
  covers: boolean
  collapsed: boolean
  onToggle: () => void
  verdict?: MoveVerdict
  isOver: boolean
  dragging: boolean
  activeId: string | null
  shake: Record<string, number>
  flash: string | null
}

const BoardColumn = memo(function BoardColumn({ index, status, rows, role, covers, collapsed, onToggle, verdict, isOver, dragging, activeId, shake, flash }: ColumnProps) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { setNodeRef } = useDroppable({ id: COL_ID(status) })
  const color = STATUS_COLOR[status]
  const wip = WIP_LIMITS[status]
  const overWip = wip !== undefined && rows.length > wip
  const total = rows.reduce((n, r) => n + r.job.budget, 0)
  const currency = rows[0]?.job.currency ?? 'EUR'
  const refuse = dragging && verdict?.kind === 'refuse'
  const allowed = dragging && (verdict?.kind === 'ok' || verdict?.kind === 'modal')
  const source = dragging && verdict?.kind === 'same'
  const Icon = COL_ICON[status] ?? Inbox

  if (collapsed) {
    return (
      <motion.button
        ref={setNodeRef}
        type="button"
        layout
        onClick={onToggle}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: refuse ? 0.45 : 1, y: 0, transition: { delay: index * 0.04, duration: 0.5, ease: EASE_OUT } }}
        title={t('jobs.board.expand')}
        className={cn(
          'card flex w-14 shrink-0 snap-start flex-col items-center gap-3 rounded-[24px] px-2 py-4 transition-shadow',
          isOver && allowed && 'shadow-[0_0_0_2px_var(--accent)]',
          isOver && refuse && 'shadow-[0_0_0_2px_var(--danger)]',
        )}
      >
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        <span className="font-mono text-[12px] tabular-nums text-ink-2">{rows.length}</span>
        <span className="text-[13px] font-medium text-ink [writing-mode:vertical-rl]">{t(`core.status.${status}`)}</span>
        <ChevronsLeftRight className="mt-auto size-4 text-ink-3" />
      </motion.button>
    )
  }

  return (
    <motion.section
      layout="position"
      data-col={status}
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      animate={{
        opacity: refuse ? 0.5 : 1,
        y: 0,
        filter: 'blur(0px)',
        scale: isOver && allowed ? 1.012 : 1,
        transition: { opacity: { duration: 0.25 }, scale: spring.snappy, default: { delay: index * 0.05, duration: 0.6, ease: EASE_OUT } },
      }}
      className="flex w-[84vw] max-w-[320px] shrink-0 snap-center flex-col sm:w-[296px] sm:snap-start"
      aria-label={t(`core.status.${status}`)}
    >
      {/* header */}
      <header className="flex items-center gap-2 px-2 pb-2.5">
        <span className="relative flex size-2.5">
          {(isOver && allowed) || (status === 'in_progress' && rows.length > 0) ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />
          ) : null}
          <span className="relative inline-flex size-2.5 rounded-full" style={{ background: color }} />
        </span>
        <h3 className="truncate text-[14px] font-medium tracking-[-0.01em]">{t(`core.status.${status}`)}</h3>
        <motion.span
          key={rows.length}
          initial={{ scale: 1.4, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.bouncy}
          className="inline-flex h-5.5 min-w-6 items-center justify-center rounded-full bg-[var(--surface)] px-1.5 font-mono text-[11px] tabular-nums text-ink-2 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
        >
          {rows.length}
        </motion.span>
        {wip !== undefined && (
          <Tooltip content={overWip ? t('jobs.board.wipOver', { n: wip }) : t('jobs.board.wipHint', { n: wip })}>
            <span
              className={cn(
                'inline-flex h-5.5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium',
                overWip ? 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_70%,var(--ink))]' : 'text-ink-3',
              )}
            >
              <span className="flex gap-[2px]">
                {Array.from({ length: wip }).map((_, i) => (
                  <span key={i} className={cn('h-2 w-[3px] rounded-full', i < rows.length ? (overWip ? 'bg-warning' : 'bg-ink-2') : 'bg-[var(--line-2)]')} />
                ))}
              </span>
              {t('jobs.board.wip')}
            </span>
          </Tooltip>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={t('jobs.board.collapse')}
          title={t('jobs.board.collapse')}
          className="ml-auto inline-flex size-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface)] hover:text-ink"
        >
          <ChevronsRightLeft className="size-3.5" />
        </button>
      </header>

      {/* body (drop zone) */}
      <div
        ref={setNodeRef}
        className={cn(
          'relative flex min-h-[220px] flex-1 flex-col gap-2.5 rounded-[26px] border p-2 transition-[background-color,border-color,box-shadow] duration-200',
          'border-[var(--glass-border)] bg-[color-mix(in_oklab,var(--surface)_38%,transparent)] backdrop-blur-[10px]',
          allowed && 'border-dashed border-[var(--accent-line)]',
          isOver && allowed && 'border-solid border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,var(--surface))] shadow-[0_0_0_4px_var(--accent-softer),0_24px_48px_-24px_var(--accent)]',
          isOver && refuse && 'border-[var(--danger)] bg-danger-soft',
          source && 'bg-[color-mix(in_oklab,var(--surface)_24%,transparent)]',
        )}
      >
        <AnimatePresence>
          {dragging && (allowed || refuse) && (
            <motion.div
              key={refuse ? 'no' : 'yes'}
              initial={{ opacity: 0, height: 0, scale: 0.96 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-[18px] px-3 py-2.5 text-center text-[12px] font-medium',
                  refuse ? 'text-ink-3' : isOver ? 'bg-accent text-accent-ink' : 'bg-accent-softer text-accent-text',
                )}
              >
                {refuse ? <Lock className="size-3.5" /> : <ArrowDownToLine className="size-3.5" />}
                {refuse ? t(`jobs.refuse.${(verdict as Extract<MoveVerdict, { kind: 'refuse' }>).reason}`) : dropText(verdict!, status, t)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r, i) => (
            <motion.div
              key={r.job.id}
              layout="position"
              initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { delay: Math.min(i, 6) * 0.035, ...spring.smooth } }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)', transition: { duration: 0.18 } }}
              transition={spring.smooth}
            >
              <DraggableCard row={r} role={role} covers={covers} shakeKey={shake[r.job.id] ?? 0} flash={flash === r.job.id} hidden={activeId === r.job.id} />
            </motion.div>
          ))}
        </AnimatePresence>

        {rows.length === 0 && !dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-line-2 px-4 py-8 text-center"
          >
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
              className="flex size-10 items-center justify-center rounded-2xl bg-[var(--surface)] text-ink-3 shadow-[0_1px_2px_rgba(0,0,0,.05)]"
            >
              <Icon className="size-4.5" />
            </motion.span>
            <p className="text-[12.5px] text-ink-3">{t(`jobs.board.empty.${status}`)}</p>
            {status === 'requested' && (
              <Button size="xs" variant="soft" icon={<Plus className="size-3.5" />} onClick={() => navigate(role === 'client' ? '/brief/new' : '/requests')}>
                {t(role === 'client' ? 'jobs.newBrief' : 'jobs.openInbox')}
              </Button>
            )}
          </motion.div>
        )}

        {status === 'requested' && rows.length > 0 && role === 'client' && (
          <button
            type="button"
            onClick={() => navigate('/brief/new')}
            className="flex h-10 items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-line-2 text-[12.5px] font-medium text-ink-3 transition-colors hover:border-[var(--accent-line)] hover:bg-accent-softer hover:text-ink"
          >
            <Plus className="size-3.5" /> {t('jobs.newBrief')}
          </button>
        )}
      </div>

      {/* footer */}
      <footer className="flex items-center justify-between px-3 pt-2 text-[11.5px] text-ink-3">
        <span className="font-mono tabular-nums">{rows.length ? formatMoney(total, currency, lang) : '—'}</span>
        {rows.length > 0 && (
          <span className="font-mono tabular-nums">
            ⌀ {Math.round(rows.reduce((n, r) => n + r.job.progress, 0) / rows.length)}%
          </span>
        )}
      </footer>
    </motion.section>
  )
})

function DraggableCard({ row, role, covers, shakeKey, flash, hidden }: { row: JobRow; role: Role; covers: boolean; shakeKey: number; flash: boolean; hidden: boolean }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: row.job.id })
  const [scope, animate] = useAnimate<HTMLDivElement>()
  useEffect(() => {
    if (!shakeKey || !scope.current) return
    animate(scope.current, { x: [0, -14, 12, -9, 6, -3, 0], rotate: [0, -2.5, 2, -1.2, 0.8, 0, 0] }, { duration: 0.6, delay: 0.3, ease: 'easeOut' })
  }, [shakeKey, animate, scope])
  return (
    <div ref={scope} style={{ touchAction: 'manipulation' }} className="[-webkit-touch-callout:none]">
      <JobCard
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        row={row}
        role={role}
        showCover={covers}
        highlight={flash}
        state={isDragging || hidden ? 'placeholder' : 'idle'}
      />
    </div>
  )
}

// ─────────────────────────── column pager ───────────────────────────

/** Status chips that scroll the board to a column; the visible one is highlighted. */
function ColumnPager({ columns, byStatus, scroller }: { columns: JobStatus[]; byStatus: Map<JobStatus, JobRow[]>; scroller: React.RefObject<HTMLDivElement | null> }) {
  const t = useT()
  const [current, setCurrent] = useState<JobStatus | null>(columns[0] ?? null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 })
    const cols = Array.from(el.querySelectorAll<HTMLElement>('[data-col]'))
    const left = el.getBoundingClientRect().left
    let best: { s: JobStatus; d: number } | null = null
    for (const c of cols) {
      const d = Math.abs(c.getBoundingClientRect().left - left)
      if (!best || d < best.d) best = { s: c.dataset.col as JobStatus, d }
    }
    if (best) setCurrent(best.s)
  }, [scroller])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [measure, scroller, columns.length])

  const go = (s: JobStatus) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-col="${s}"]`)
    const sc = scroller.current
    if (!el || !sc) return
    sc.scrollTo({ left: Math.max(0, el.offsetLeft - 10), behavior: 'smooth' })
  }
  const page = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * Math.min(620, scroller.current.clientWidth * 0.8), behavior: 'smooth' })

  if (columns.length <= 1) return null
  return (
    <div className="mb-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => page(-1)}
        disabled={edges.start}
        aria-label={t('jobs.board.scrollLeft')}
        className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)] transition-opacity disabled:opacity-30 sm:inline-flex"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="no-scrollbar mask-fade-x flex min-w-0 flex-1 gap-1 overflow-x-auto px-1">
        {columns.map((s) => {
          const on = current === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => go(s)}
              className={cn(
                'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors',
                on ? 'text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              {on && <motion.span layoutId="col-pager" className="absolute inset-0 rounded-full bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,.06),0_4px_12px_-6px_rgba(0,0,0,.15)]" transition={spring.pill} />}
              <span className="relative size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              <span className="relative">{t(`core.status.${s}`)}</span>
              <span className="relative font-mono text-[10.5px] tabular-nums text-ink-3">{byStatus.get(s)?.length ?? 0}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => page(1)}
        disabled={edges.end}
        aria-label={t('jobs.board.scrollRight')}
        className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)] transition-opacity disabled:opacity-30 sm:inline-flex"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
