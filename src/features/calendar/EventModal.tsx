import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { addMinutes } from 'date-fns'
import { AlertTriangle, Copy, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useApp } from '@/store'
import { counterpartId, useMyJobs, useMyMatches, useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { CalendarEvent } from '@/store/types'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { formatDuration } from '@/lib/format'
import { spring } from '@/lib/motion'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { DatePicker } from '@/components/ui/DatePicker'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { DisciplineIcon } from '@/components/ui/Badge'
import { KINDS, KIND_COLOR, findFreeSlot, overlaps, type CalItem, type EventKind } from './model'
import { KindIcon, PersonAvatar, hhmm, usePersonLookup } from './ui'

export type EditorState =
  | { mode: 'create'; at: Date; kind?: EventKind; jobId?: string; durationMin?: number; title?: string }
  | { mode: 'edit'; event: CalendarEvent }

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240]

export function EventModal({ state, onClose, items }: { state: EditorState | null; onClose: () => void; items: CalItem[] }) {
  return (
    <ModalShell open={!!state} onClose={onClose}>
      {state && <EventForm key={state.mode === 'edit' ? state.event.id : state.at.toISOString()} state={state} onClose={onClose} items={items} />}
    </ModalShell>
  )
}

function ModalShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} bare size="md">
      {children}
    </Modal>
  )
}

function EventForm({ state, onClose, items }: { state: EditorState; onClose: () => void; items: CalItem[] }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const addEvent = useApp((s) => s.addEvent)
  const updateEvent = useApp((s) => s.updateEvent)
  const removeEvent = useApp((s) => s.removeEvent)
  const jobs = useMyJobs({ ignoreDiscipline: true, includeClosed: false })
  const matches = useMyMatches()
  const person = usePersonLookup()
  const [confirm, confirmDialog] = useConfirm()

  const editing = state.mode === 'edit' ? state.event : undefined
  const [title, setTitle] = useState(editing?.title ?? (state.mode === 'create' ? (state.title ?? '') : ''))
  const [kind, setKind] = useState<EventKind>(editing?.kind ?? (state.mode === 'create' ? (state.kind ?? 'call') : 'call'))
  const [at, setAt] = useState<string>(editing?.at ?? (state.mode === 'create' ? state.at.toISOString() : new Date().toISOString()))
  const [duration, setDuration] = useState<number>(editing?.durationMin ?? (state.mode === 'create' ? (state.durationMin ?? 30) : 30))
  const [jobId, setJobId] = useState<string>(editing?.jobId ?? (state.mode === 'create' ? (state.jobId ?? '') : ''))
  const [withId, setWithId] = useState<string>(() => {
    if (editing?.withId) return editing.withId
    const j = jobs.find((x) => x.id === (editing?.jobId ?? (state.mode === 'create' ? state.jobId : undefined)))
    return j ? counterpartId(j, role) : ''
  })
  const [touched, setTouched] = useState(false)

  const selectedJob = jobs.find((j) => j.id === jobId)
  const jobOptions = useMemo(() => {
    const list = [...jobs]
    // keep a linked-but-closed job selectable when editing
    if (editing?.jobId && !list.some((j) => j.id === editing.jobId)) {
      const j = useApp.getState().jobs.find((x) => x.id === editing.jobId)
      if (j) list.unshift(j)
    }
    return list
  }, [jobs, editing?.jobId])

  const people = useMemo(() => {
    const ids = new Set<string>()
    for (const j of jobs) ids.add(counterpartId(j, role))
    for (const m of matches) ids.add(role === 'client' ? m.match.designerId : m.match.clientId)
    if (withId) ids.add(withId)
    return [...ids].map((id) => person(id)).filter((p): p is NonNullable<typeof p> => !!p).sort((a, b) => a.name.localeCompare(b.name))
  }, [jobs, matches, role, person, withId])

  const start = new Date(at)
  const end = addMinutes(start, duration)
  const clashes = useMemo(
    () => (kind === 'deadline' || kind === 'milestone' ? [] : overlaps(items, start, duration, editing?.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, at, duration, kind, editing?.id],
  )
  const who = person(withId)
  const valid = title.trim().length > 0 && !Number.isNaN(start.getTime())

  useEffect(() => {
    if (kind === 'deadline' && duration > 30 && !editing) setDuration(15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const pickJob = (id: string) => {
    setJobId(id)
    const j = jobs.find((x) => x.id === id)
    if (j) setWithId(counterpartId(j, role))
  }

  const suggest = () => {
    const slot = findFreeSlot(items, start, duration, 9, 18, editing?.id) ?? findFreeSlot(items, addMinutes(start, 24 * 60), duration, 9, 18, editing?.id)
    if (slot) {
      setAt(slot.toISOString())
      toast({ title: t('calendar.toast.slotFound', { time: fmt(slot, 'EEE HH:mm', lang) }), tone: 'info' })
    } else toast({ title: t('calendar.toast.noSlot'), tone: 'error' })
  }

  const save = () => {
    setTouched(true)
    if (!valid) return
    const payload = { title: title.trim(), kind, at: start.toISOString(), durationMin: duration, jobId: jobId || undefined, withId: withId || undefined }
    if (editing) {
      const before = { ...editing }
      updateEvent(editing.id, payload)
      toast({
        title: t('calendar.toast.updated'),
        description: `${payload.title} · ${fmt(start, 'EEE d MMM, HH:mm', lang)}`,
        tone: 'success',
        action: { label: t('calendar.undo'), onClick: () => updateEvent(before.id, before) },
      })
    } else {
      const ev = addEvent(payload)
      toast({
        title: t('calendar.toast.created'),
        description: `${ev.title} · ${fmt(start, 'EEE d MMM, HH:mm', lang)}`,
        tone: 'success',
        action: { label: t('calendar.undo'), onClick: () => useApp.getState().removeEvent(ev.id) },
      })
    }
    onClose()
  }

  const duplicate = () => {
    if (!editing) return
    const next = addMinutes(new Date(editing.at), 7 * 24 * 60)
    const ev = addEvent({ title: editing.title, kind: editing.kind, at: next.toISOString(), durationMin: editing.durationMin, jobId: editing.jobId, withId: editing.withId })
    toast({
      title: t('calendar.toast.duplicated'),
      description: fmt(next, 'EEE d MMM, HH:mm', lang),
      tone: 'success',
      action: { label: t('calendar.undo'), onClick: () => useApp.getState().removeEvent(ev.id) },
    })
    onClose()
  }

  const remove = async () => {
    if (!editing) return
    const ok = await confirm({
      title: t('calendar.confirmDelete.title'),
      description: t('calendar.confirmDelete.body', { title: editing.title }),
      confirmLabel: t('calendar.delete'),
      cancelLabel: t('calendar.cancel'),
      tone: 'danger',
      icon: <Trash2 className="size-5" />,
    })
    if (!ok) return
    const { id, ...snapshot } = editing
    removeEvent(id)
    toast({
      title: t('calendar.toast.deleted'),
      description: snapshot.title,
      action: { label: t('calendar.undo'), onClick: () => useApp.getState().addEvent(snapshot) },
    })
    onClose()
  }

  const color = KIND_COLOR[kind]

  return (
    <div className="flex max-h-[92dvh] flex-col" onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && save()}>
      {/* live preview header */}
      <motion.div
        className="relative overflow-hidden px-6 pb-5 pt-6"
        animate={{ background: `linear-gradient(135deg, color-mix(in oklab, ${color} 30%, transparent), color-mix(in oklab, ${color} 6%, transparent) 70%)` }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          aria-hidden
          className="absolute -right-10 -top-16 size-44 rounded-full blur-3xl"
          animate={{ background: color, opacity: 0.35, scale: [1, 1.08, 1] }}
          transition={{ scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, background: { duration: 0.4 } }}
        />
        <div className="relative flex items-start gap-3">
          <motion.span
            key={kind}
            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={spring.bouncy}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-[#0b0b0c] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]"
            style={{ background: color }}
          >
            <KindIcon kind={kind} className="size-5" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              {editing ? t('calendar.editEvent') : t('calendar.newEvent')} · {t(`calendar.kind.${kind}`)}
            </p>
            <h2 className="mt-0.5 truncate text-[20px] font-medium tracking-[-0.02em]">{title.trim() || t('calendar.form.untitled')}</h2>
            <p className="mt-0.5 font-mono text-[12.5px] text-ink-2">
              {Number.isNaN(start.getTime()) ? '—' : `${fmt(start, 'EEE d MMM', lang)} · ${hhmm(start, lang)} – ${hhmm(end, lang)} · ${formatDuration(duration)}`}
            </p>
          </div>
          {who && (
            <motion.div key={who.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
              <PersonAvatar person={who} size={40} />
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-4">
        <Field label={t('calendar.form.title')} error={touched && !title.trim() ? t('calendar.form.titleRequired') : undefined}>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`calendar.form.placeholder.${kind}`)} maxLength={90} />
        </Field>

        <Field label={t('calendar.form.kind')}>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => {
              const active = k === kind
              return (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setKind(k)}
                  className={cn(
                    'relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    active ? 'text-[#0b0b0c]' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink',
                  )}
                >
                  {active && <motion.span layoutId="kind-pill" className="absolute inset-0 rounded-full" style={{ background: KIND_COLOR[k] }} transition={spring.pill} />}
                  <span className="relative z-[1] inline-flex items-center gap-1.5">
                    <KindIcon kind={k} className="size-3.5" />
                    {t(`calendar.kind.${k}`)}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
          <Field label={t('calendar.form.when')}>
            <DatePicker value={at} onChange={setAt} withTime presets={false} showRelative />
          </Field>
          <Field label={t('calendar.form.duration')}>
            <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DURATIONS.slice(0, 6).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                'h-7 rounded-full px-2.5 font-mono text-[11.5px] transition-all active:scale-95',
                d === duration ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink',
              )}
            >
              {formatDuration(d)}
            </button>
          ))}
          <button
            type="button"
            onClick={suggest}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[12px] font-medium text-accent-text transition-transform active:scale-95"
          >
            <Wand2 className="size-3.5" />
            {t('calendar.form.findSlot')}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {clashes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 rounded-2xl bg-warning-soft px-3.5 py-2.5 text-[13px] text-[color-mix(in_oklab,var(--warning)_55%,var(--ink))]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  {t('calendar.form.clash', { title: clashes[0].title, time: hhmm(clashes[0].start, lang) })}
                  {clashes.length > 1 && ` ${t('calendar.form.clashMore', { count: clashes.length - 1 })}`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('calendar.form.job')}>
            <Select value={jobId} onChange={(e) => pickJob(e.target.value)}>
              <option value="">{t('calendar.form.noJob')}</option>
              {jobOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.id} · {j.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('calendar.form.with')}>
            <Select value={withId} onChange={(e) => setWithId(e.target.value)}>
              <option value="">{t('calendar.form.nobody')}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <AnimatePresence initial={false}>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5"
            >
              <DisciplineIcon id={selectedJob.discipline} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{selectedJob.title}</p>
                <p className="font-mono text-[11.5px] text-ink-3">
                  {selectedJob.id} · {t('calendar.form.jobDue', { date: fmt(selectedJob.dueAt, 'EEE d MMM, HH:mm', lang) })}
                </p>
              </div>
              <Sparkles className="size-4 text-accent-text" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4 safe-bottom">
        {editing && (
          <>
            <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} className="text-danger hover:bg-danger-soft hover:text-danger" onClick={remove}>
              {t('calendar.delete')}
            </Button>
            <Button variant="ghost" size="sm" icon={<Copy className="size-4" />} onClick={duplicate} className="max-sm:hidden">
              {t('calendar.duplicateNextWeek')}
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={onClose}>
            {t('calendar.cancel')}
          </Button>
          <Button size="sm" onClick={save} disabled={touched && !valid}>
            {editing ? t('calendar.save') : t('calendar.create')}
          </Button>
        </div>
      </div>
      {confirmDialog}
    </div>
  )
}
