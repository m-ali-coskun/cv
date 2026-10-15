import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { addDays, addMinutes, addMonths, addWeeks, endOfWeek, getISOWeek, isSameDay, isSameMonth, isSameWeek, setHours, startOfDay, startOfWeek } from 'date-fns'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { useLang, useT } from '@/i18n'
import { fmt } from '@/lib/dates'
import { formatDuration } from '@/lib/format'
import { item as itemV, stagger } from '@/lib/motion'
import { Glass } from '@/components/ui/Glass'
import { AnchoredPopover, rectOf, type AnchorRect } from './Popover'
import { EventDetails } from './EventDetails'
import { EventModal, type EditorState } from './EventModal'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { AGENDA_DAYS, AgendaView } from './AgendaView'
import { Toolbar } from './Toolbar'
import { Stats } from './Stats'
import { MiniMonthCard, MixCard, NextUpCard, PlannerCard, WorkloadCard, useWeekStats } from './SidePanel'
import {
  KINDS,
  buildIcs,
  downloadText,
  findFreeSlot,
  isAuto,
  loadPrefs,
  monthGrid,
  savePrefs,
  useCalendarItems,
  type CalItem,
  type CalPrefs,
  type CalView,
  type EventKind,
} from './model'
import { KindDot, hhmm, timeRange, useIsMobile, useNow } from './ui'

/** /calendar — month · week · agenda of my events, job deadlines and milestones. */
export default function CalendarPage() {
  const t = useT()
  const lang = useLang()
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const updateEvent = useApp((s) => s.updateEvent)
  const allItems = useCalendarItems()
  const mobile = useIsMobile()
  const now = useNow(30_000)
  const [params, setParams] = useSearchParams()

  const [prefs, setPrefsState] = useState<CalPrefs>(loadPrefs)
  const setPrefs = useCallback((patch: Partial<CalPrefs>) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch }
      savePrefs(next)
      return next
    })
  }, [])
  const view = prefs.view
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [dir, setDir] = useState(0)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [pop, setPop] = useState<{ id: string; rect: AnchorRect } | null>(null)
  const [more, setMore] = useState<{ day: Date; ids: string[]; rect: AnchorRect } | null>(null)

  const items = useMemo(
    () => allItems.filter((it) => !prefs.hidden.includes(it.kind) && (prefs.showAuto || !isAuto(it))),
    [allItems, prefs.hidden, prefs.showAuto],
  )
  const counts = useMemo(() => {
    const c = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<EventKind, number>
    for (const it of allItems) if (prefs.showAuto || !isAuto(it)) c[it.kind]++
    return c
  }, [allItems, prefs.showAuto])
  const autoCount = useMemo(() => allItems.filter(isAuto).length, [allItems])
  const stats = useWeekStats(items, now)

  // ── deep links: /calendar?new=1&job=DT-2841&date=2026-10-20&view=week
  useEffect(() => {
    if (![...params.keys()].length) return
    const date = params.get('date')
    const v = params.get('view') as CalView | null
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number)
      setCursor(new Date(y, m - 1, d))
    }
    if (v === 'month' || v === 'week' || v === 'agenda') setPrefs({ view: v })
    if (params.get('new')) {
      const base = date ? new Date(`${date}T10:00:00`) : new Date()
      const at = findFreeSlot(allItems, base, 30) ?? setHours(startOfDay(addDays(base, 1)), 10)
      setEditor({ mode: 'create', at, jobId: params.get('job') ?? undefined, kind: (params.get('kind') as EventKind | null) ?? undefined })
    }
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── navigation
  const step = useCallback(
    (d: 1 | -1) => {
      setDir(d)
      setPop(null)
      setMore(null)
      setCursor((c) => (view === 'month' ? addMonths(c, d) : view === 'week' ? addWeeks(c, d) : addDays(c, AGENDA_DAYS * d)))
    },
    [view],
  )
  const goTo = useCallback((day: Date) => {
    setCursor((c) => {
      setDir(day > c ? 1 : day < c ? -1 : 0)
      return startOfDay(day)
    })
  }, [])
  const today = useCallback(() => goTo(new Date()), [goTo])
  const setView = useCallback(
    (v: CalView) => {
      setDir(0)
      setPop(null)
      setMore(null)
      setPrefs({ view: v })
    },
    [setPrefs],
  )

  const openCreate = useCallback(
    (at?: Date) => {
      setPop(null)
      setMore(null)
      let when = at
      if (!when) {
        const base = isSameDay(cursor, now) ? now : setHours(cursor, 9)
        when = findFreeSlot(allItems, base, 30) ?? findFreeSlot(allItems, addDays(base, 1), 30) ?? setHours(startOfDay(addDays(base, 1)), 10)
      }
      setEditor({ mode: 'create', at: when })
    },
    [cursor, now, allItems],
  )

  // ── keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || editor) return
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return
      const k = e.key.toLowerCase()
      if (k === 'arrowleft') step(-1)
      else if (k === 'arrowright') step(1)
      else if (k === 't') today()
      else if (k === 'm') setView('month')
      else if (k === 'w') setView('week')
      else if (k === 'a') setView('agenda')
      else if (k === 'n') {
        e.preventDefault()
        openCreate()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, step, today, setView, openCreate])

  // ── mutations
  const onMove = useCallback(
    (item: CalItem, start: Date) => {
      if (!item.event) return
      const before = item.event.at
      const id = item.event.id
      updateEvent(id, { at: start.toISOString() })
      toast({
        title: t('calendar.toast.moved', { when: fmt(start, 'EEE d MMM, HH:mm', lang) }),
        description: item.title,
        tone: 'success',
        action: { label: t('calendar.undo'), onClick: () => updateEvent(id, { at: before }) },
      })
    },
    [updateEvent, t, lang],
  )
  const onResize = useCallback(
    (item: CalItem, durationMin: number) => {
      if (!item.event) return
      const before = item.event.durationMin
      const id = item.event.id
      updateEvent(id, { durationMin })
      toast({
        title: t('calendar.toast.resized', { duration: formatDuration(durationMin) }),
        description: `${item.title} · ${hhmm(item.start, lang)} – ${hhmm(addMinutes(item.start, durationMin), lang)}`,
        tone: 'success',
        action: { label: t('calendar.undo'), onClick: () => updateEvent(id, { durationMin: before }) },
      })
    },
    [updateEvent, t, lang],
  )

  const openItem = useCallback((it: CalItem, el: Element) => {
    setMore(null)
    setPop({ id: it.id, rect: rectOf(el) })
  }, [])
  const editItem = useCallback((it: CalItem) => {
    setPop(null)
    setMore(null)
    if (it.event) setEditor({ mode: 'edit', event: it.event })
  }, [])

  const popItem = pop ? allItems.find((x) => x.id === pop.id) : undefined
  const moreItems = more ? more.ids.map((id) => allItems.find((x) => x.id === id)).filter((x): x is CalItem => !!x) : []

  // ── title + visible range (for export)
  const { title, subtitle, range } = useMemo(() => {
    if (view === 'month') {
      const g = monthGrid(cursor, weekStartsOn)
      return {
        title: fmt(cursor, 'LLLL yyyy', lang),
        subtitle: t('calendar.subtitle.month', { count: items.filter((it) => isSameMonth(it.start, cursor)).length }),
        range: [g[0], addDays(g[41], 1)] as const,
      }
    }
    if (view === 'week') {
      const ws = startOfWeek(cursor, { weekStartsOn })
      const we = endOfWeek(cursor, { weekStartsOn })
      return {
        title: mobile ? fmt(cursor, 'EEEE, d MMM', lang) : `${fmt(ws, 'd MMM', lang)} – ${fmt(we, 'd MMM yyyy', lang)}`,
        subtitle: t('calendar.subtitle.week', { week: getISOWeek(cursor), count: items.filter((it) => isSameWeek(it.start, cursor, { weekStartsOn })).length }),
        range: [ws, addDays(we, 1)] as const,
      }
    }
    const to = addDays(cursor, AGENDA_DAYS)
    return {
      title: `${fmt(cursor, 'd MMM', lang)} – ${fmt(addDays(to, -1), 'd MMM yyyy', lang)}`,
      subtitle: t('calendar.subtitle.agenda', { count: items.filter((it) => it.start >= cursor && it.start < to).length, days: AGENDA_DAYS }),
      range: [cursor, to] as const,
    }
  }, [view, cursor, weekStartsOn, lang, mobile, items, t])

  const isCurrent = view === 'month' ? isSameMonth(cursor, now) : view === 'week' ? isSameWeek(cursor, now, { weekStartsOn }) : isSameDay(cursor, now)

  const exportIcs = () => {
    const list = items.filter((it) => it.start >= range[0] && it.start < range[1])
    if (!list.length) {
      toast({ title: t('calendar.toast.exportEmpty'), tone: 'info' })
      return
    }
    const ics = buildIcs(list, (it) => [t(`calendar.kind.${it.kind}`), it.jobId, timeRange(it, lang)].filter(Boolean).join(' · '))
    downloadText(ics, `designtab-${fmt(range[0], 'yyyy-MM-dd')}.ics`)
    toast({ title: t('calendar.toast.exported', { count: list.length }), tone: 'success' })
  }

  const toggleKind = (k: EventKind) => setPrefs({ hidden: prefs.hidden.includes(k) ? prefs.hidden.filter((x) => x !== k) : [...prefs.hidden, k] })

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="flex flex-col gap-4">
      <Stats
        stats={stats}
        onToday={() => {
          setView(mobile ? 'week' : 'agenda')
          today()
        }}
        onDeadlines={() => {
          setPrefs({ hidden: KINDS.filter((k) => k !== 'deadline'), showAuto: true, view: 'agenda' })
          today()
        }}
        onFocus={() => {
          setView('week')
          today()
        }}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <motion.div variants={itemV}>
            <Toolbar
              title={title}
              subtitle={subtitle}
              dir={dir}
              view={view}
              onView={setView}
              onStep={step}
              onToday={today}
              isCurrent={isCurrent}
              hidden={prefs.hidden}
              onToggleKind={toggleKind}
              counts={counts}
              showAuto={prefs.showAuto}
              onToggleAuto={() => setPrefs({ showAuto: !prefs.showAuto })}
              autoCount={autoCount}
              onNew={() => openCreate()}
              onExport={exportIcs}
            />
          </motion.div>
          <motion.div variants={itemV}>
            <Glass className="p-2 sm:p-4">
              <div className="relative z-[1]">
                {view === 'month' && (
                  <MonthView
                    cursor={cursor}
                    dir={dir}
                    items={items}
                    mobile={mobile}
                    selectedDay={cursor}
                    onSelectDay={(d) => setCursor(startOfDay(d))}
                    onCreateAt={(d) => openCreate(findFreeSlot(allItems, d, 30, 9, 18) ?? d)}
                    onOpenItem={openItem}
                    onMore={(day, list, el) => {
                      setPop(null)
                      setMore({ day, ids: list.map((x) => x.id), rect: rectOf(el) })
                    }}
                    onMove={onMove}
                  />
                )}
                {view === 'week' && (
                  <WeekView
                    cursor={cursor}
                    dir={dir}
                    items={items}
                    now={now}
                    mobile={mobile}
                    onPickDay={(d) => (mobile ? setCursor(startOfDay(d)) : (goTo(d), setView('agenda')))}
                    onCreateAt={openCreate}
                    onOpenItem={openItem}
                    onMore={() => undefined}
                    onMove={onMove}
                    onResize={onResize}
                  />
                )}
                {view === 'agenda' && <AgendaView cursor={cursor} dir={dir} items={items} now={now} onOpenItem={openItem} onEdit={editItem} onCreateAt={openCreate} />}
              </div>
            </Glass>
          </motion.div>
        </div>

        <motion.aside variants={itemV} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
          <NextUpCard items={items} now={now} onOpenItem={openItem} />
          <div className="max-sm:hidden">
            <MiniMonthCard cursor={cursor} items={items} onPick={goTo} />
          </div>
          <PlannerCard items={allItems} now={now} />
          <WorkloadCard
            cursor={cursor}
            items={items}
            onPickDay={(d) => {
              goTo(d)
              setView('week')
            }}
          />
          <MixCard cursor={cursor} items={allItems.filter((it) => prefs.showAuto || !isAuto(it))} hidden={prefs.hidden} onToggle={toggleKind} />
        </motion.aside>
      </div>

      {/* event details */}
      <AnchoredPopover anchor={popItem ? pop!.rect : null} id={pop?.id} onClose={() => setPop(null)} label={popItem?.title}>
        {popItem && <EventDetails item={popItem} items={allItems} onEdit={editItem} onClose={() => setPop(null)} />}
      </AnchoredPopover>

      {/* "+N more" */}
      <AnchoredPopover anchor={more ? more.rect : null} id={more ? `more-${more.day.toISOString()}` : undefined} width={300} onClose={() => setMore(null)}>
        {more && (
          <div className="p-3">
            <p className="px-1.5 pb-2 pt-1 text-[14px] font-medium">{fmt(more.day, 'EEEE, d MMMM', lang)}</p>
            <AnimatePresence initial>
              <motion.ul variants={stagger(0.03)} initial="hidden" animate="show" className="space-y-1">
                {moreItems.map((it) => (
                  <motion.li key={it.id} variants={itemV}>
                    <button
                      type="button"
                      onClick={() => {
                        const rect = more.rect
                        setMore(null)
                        setPop({ id: it.id, rect })
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <KindDot kind={it.kind} />
                      <span className="w-11 shrink-0 font-mono text-[11.5px] text-ink-3">{hhmm(it.start, lang)}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{it.title}</span>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>
        )}
      </AnchoredPopover>

      <EventModal state={editor} onClose={() => setEditor(null)} items={allItems} />
    </motion.div>
  )
}

