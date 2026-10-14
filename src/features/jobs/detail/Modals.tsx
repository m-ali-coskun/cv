import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, Link2, MessageSquareQuote, Plus, Repeat2, Send, Sparkles, Trash2, Wallet, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { fmt, shortDate } from '@/lib/dates'
import { formatBytes, formatMoney } from '@/lib/format'
import { fileToAsset, linkAsset, saveFile } from '@/lib/files'
import { fireConfetti, fireSideCannons, fireStars } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { CalendarEvent, MediaRef } from '@/store/types'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { MediaView } from '@/components/art/MediaView'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { Dropzone } from '@/components/ui/Dropzone'
import { Chip, Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { RatingStars } from '@/components/ui/RatingStars'
import { Segmented } from '@/components/ui/Segmented'
import { useJobCtx } from './context'
import { RevisionMeter } from './RevisionCard'
import { CheckDot } from './ui'

export function JobModals() {
  const { modal, closeModal } = useJobCtx()
  return (
    <>
      <DeclineModal open={modal === 'decline'} onClose={closeModal} />
      <CounterModal open={modal === 'counter'} onClose={closeModal} />
      <DeliverModal open={modal === 'deliver'} onClose={closeModal} />
      <ApproveModal open={modal === 'approve'} onClose={closeModal} />
      <RevisionModal open={modal === 'revision'} onClose={closeModal} />
      <AssetsModal open={modal === 'assets'} onClose={closeModal} />
      <ScheduleModal open={modal === 'schedule'} onClose={closeModal} />
      <CancelDialog open={modal === 'cancel'} onClose={closeModal} />
    </>
  )
}

interface MP {
  open: boolean
  onClose: () => void
}

/** Reset local state every time a modal opens. */
function useOnOpen(open: boolean, reset: () => void) {
  const ref = useRef(reset)
  ref.current = reset
  useEffect(() => {
    if (open) ref.current()
  }, [open])
}

// ─────────────── designer: decline ───────────────

const DECLINE_REASONS: { key: string; en: string }[] = [
  { key: 'busy', en: 'my schedule is fully booked right now' },
  { key: 'budget', en: 'the budget doesn’t fit the scope' },
  { key: 'scope', en: 'it’s outside my area of expertise' },
  { key: 'timeline', en: 'the timeline is too tight for the quality you deserve' },
]

function DeclineModal({ open, onClose }: MP) {
  const t = useT()
  const { job, counterpart } = useJobCtx()
  const decline = useApp((s) => s.declineJob)
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  useOnOpen(open, () => {
    setReason(null)
    setNote('')
  })
  const preset = DECLINE_REASONS.find((r) => r.key === reason)?.en
  const text = [preset, note.trim()].filter(Boolean).join(' — ')
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('job.decline.title')}
      description={t('job.decline.body', { name: counterpart?.name ?? '' })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button
            variant="danger"
            icon={<XCircle className="size-4" />}
            onClick={() => {
              decline(job.id, text || undefined)
              toast({ title: t('job.decline.done'), description: job.title, tone: 'info' })
              onClose()
            }}
          >
            {t('job.act.d.decline')}
          </Button>
        </>
      }
    >
      <div className="text-[12.5px] font-medium text-ink-2">{t('job.decline.reason')}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DECLINE_REASONS.map((r) => (
          <Chip key={r.key} active={reason === r.key} onClick={() => setReason(reason === r.key ? null : r.key)}>
            {t(`job.decline.r.${r.key}`)}
          </Chip>
        ))}
      </div>
      <Field label={t('job.decline.note')} className="mt-4">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('job.decline.notePh')} className="min-h-[90px]" />
      </Field>
    </Modal>
  )
}

// ─────────────── designer: propose a new deadline ───────────────

function CounterModal({ open, onClose }: MP) {
  const t = useT()
  const lang = useLang()
  const { job, counterpart } = useJobCtx()
  const accept = useApp((s) => s.acceptJob)
  const [due, setDue] = useState(job.dueAt)
  const [note, setNote] = useState('')
  useOnOpen(open, () => {
    setDue(new Date(new Date(job.dueAt).getTime() + 3 * 864e5).toISOString())
    setNote('')
  })
  const shift = Math.round((new Date(due).getTime() - new Date(job.dueAt).getTime()) / 864e5)
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('job.counter.title')}
      description={t('job.counter.body', { name: counterpart?.name ?? '' })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button
            icon={<Send className="size-4" />}
            onClick={() => {
              accept(job.id, { counterDueAt: due, note: note.trim() })
              toast({ title: t('job.counter.sent'), description: fmt(due, 'PPP', lang), tone: 'success' })
              onClose()
            }}
          >
            {t('job.counter.send')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="tile p-3">
          <div className="text-[11.5px] text-ink-3">{t('job.counter.current')}</div>
          <div className="mt-1 font-mono text-[14px] text-ink-2 line-through">{fmt(job.dueAt, 'EEE d MMM', lang)}</div>
        </div>
        <motion.div key={due} className="rounded-[16px] bg-accent p-3 text-accent-ink" initial={{ scale: 0.94 }} animate={{ scale: 1 }} transition={spring.bouncy}>
          <div className="text-[11.5px] opacity-70">{t('job.counter.proposed')}</div>
          <div className="mt-1 font-mono text-[14px] font-semibold">
            {fmt(due, 'EEE d MMM', lang)} <span className="opacity-60">({shift >= 0 ? '+' : ''}{shift}d)</span>
          </div>
        </motion.div>
      </div>
      <Field label={t('job.counter.newDate')} className="mt-4">
        <DatePicker value={due} onChange={setDue} min={new Date(Date.now() + 864e5)} withTime presets={false} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[2, 3, 7, 14].map((d) => (
          <Chip key={d} active={shift === d} onClick={() => setDue(new Date(new Date(job.dueAt).getTime() + d * 864e5).toISOString())}>
            +{d}d
          </Chip>
        ))}
      </div>
      <Field label={t('job.counter.note')} className="mt-4">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('job.counter.notePh')} className="min-h-[80px]" />
      </Field>
    </Modal>
  )
}

// ─────────────── designer: deliver a new version ───────────────

interface Pending {
  id: string
  file: File
  url?: string
}

const DELIVER_CHIPS: { key: string; en: string }[] = [
  { key: 'feedback', en: 'All feedback addressed.' },
  { key: 'formats', en: 'Exported in every format from the brief.' },
  { key: 'source', en: 'Source files are included.' },
  { key: 'options', en: 'Added two alternative options to choose from.' },
]

function DeliverModal({ open, onClose }: MP) {
  const t = useT()
  const { job, showVersion } = useJobCtx()
  const submit = useApp((s) => s.submitVersion)
  const toggleDeliverable = useApp((s) => s.toggleDeliverable)
  const [files, setFiles] = useState<Pending[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const n = job.versions.length + 1
  const urls = useRef(new Set<string>())
  const revokeAll = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u))
    urls.current.clear()
  }
  useOnOpen(open, () => {
    revokeAll()
    setFiles([])
    setNote('')
    setBusy(false)
  })
  useEffect(() => revokeAll, [])
  const remove = (f: Pending) => {
    if (f.url) {
      URL.revokeObjectURL(f.url)
      urls.current.delete(f.url)
    }
    setFiles((p) => p.filter((x) => x.id !== f.id))
  }

  const add = (list: File[]) =>
    setFiles((prev) => [
      ...prev,
      ...list.map((file) => {
        const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        if (url) urls.current.add(url)
        return { id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, url }
      }),
    ])

  const go = async (el: HTMLElement) => {
    setBusy(true)
    try {
      const media: MediaRef[] = []
      for (const f of files) media.push(await saveFile(f.file))
      submit(job.id, { note: note.trim() || 'New version ready for review.', media })
      fireConfetti({ from: el, particleCount: 160 })
      toast({ title: t('job.deliver.done', { n }), description: job.title, tone: 'success' })
      onClose()
      showVersion()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('job.deliver.title', { n })}
      description={t('job.deliver.body')}
      footer={
        <>
          <span className="mr-auto hidden text-[12.5px] text-ink-3 sm:block">{files.length ? t('job.deliver.files', { count: files.length }) : t('job.deliver.noFiles')}</span>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button loading={busy} icon={<Send className="size-4" />} onClick={(e) => go(e.currentTarget)}>
            {t('job.deliver.submit', { n })}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Dropzone onFiles={add} accept="image/*,video/*,application/pdf" compact={files.length > 0} />
          <motion.div layout className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            <AnimatePresence initial={false}>
              {files.map((f) => (
                <motion.div key={f.id} layout initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={spring.bouncy} className="group/f relative aspect-square overflow-hidden rounded-[14px] bg-[var(--surface-2)]">
                  {f.url ? (
                    <img src={f.url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
                      <span className="line-clamp-2 break-all text-[11px] font-medium text-ink-2">{f.file.name}</span>
                    </div>
                  )}
                  <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur">{formatBytes(f.file.size)}</span>
                  <button
                    type="button"
                    aria-label={t('core.action.remove')}
                    onClick={() => remove(f)}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 backdrop-blur transition-opacity sm:opacity-0 sm:group-hover/f:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          {!files.length && (
            <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-accent-softer p-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl">
                <GenerativeArt seed={`${job.id}-v${n}`} variant="poster" discipline={job.discipline} className="size-full" playBadge={false} />
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                <Sparkles className="mr-1 inline size-3.5 text-accent-text" />
                {t('job.deliver.generated')}
              </p>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Field label={t('job.deliver.note')}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('job.deliver.notePh')} className="min-h-[110px]" />
          </Field>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DELIVER_CHIPS.map((c) => (
              <Chip key={c.key} onClick={() => setNote((v) => (v.includes(c.en) ? v : `${v ? v.trim() + ' ' : ''}${c.en}`))}>
                <Plus className="size-3" />
                {t(`job.deliver.chip.${c.key}`)}
              </Chip>
            ))}
          </div>
          {job.deliverables.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{t('job.deliver.checklist')}</div>
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {job.deliverables.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-[var(--surface-2)]">
                    <CheckDot checked={d.done} label={d.label} size={20} onClick={() => toggleDeliverable(job.id, d.id)} />
                    <span className={cn('text-[13px]', d.done ? 'text-ink-3 line-through' : 'text-ink')}>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─────────────── client: approve & release ───────────────

const REVIEW_CHIPS: { key: string; en: string }[] = [
  { key: 'exceeded', en: 'Exceeded expectations.' },
  { key: 'fast', en: 'Fast and thoughtful.' },
  { key: 'comms', en: 'Great communication throughout.' },
  { key: 'again', en: 'Would hire again in a heartbeat.' },
]

function ApproveModal({ open, onClose }: MP) {
  const t = useT()
  const lang = useLang()
  const { job, counterpart } = useJobCtx()
  const approve = useApp((s) => s.approveJob)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  useOnOpen(open, () => {
    setRating(5)
    setReview('')
  })
  const latest = job.versions[job.versions.length - 1]
  const release = job.milestones.filter((m) => m.status !== 'released').reduce((n, m) => n + m.amount, 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={t('job.approve.title')}
      description={t('job.approve.body', { name: counterpart?.name ?? '' })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button
            icon={<Wallet className="size-4" />}
            onClick={(e) => {
              approve(job.id, { rating, review: review.trim() || undefined })
              fireConfetti({ from: e.currentTarget, particleCount: 220 })
              fireStars({ origin: { x: 0.5, y: 0.35 } })
              fireSideCannons(900)
              toast({ title: t('job.approve.done'), description: t('job.approve.doneBody', { amount: formatMoney(release, job.currency, lang), name: counterpart?.name ?? '' }), tone: 'success' })
              onClose()
            }}
          >
            {t('job.approve.submit')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[var(--surface-2)] sm:aspect-auto sm:h-full">
          {latest ? <MediaView media={latest.media[0]} /> : <MediaView media={job.cover} />}
          {latest && <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[11px] text-white backdrop-blur">v{latest.version}</span>}
        </div>
        <div className="glass-accent rounded-[20px] p-4">
          <div className="relative z-[1]">
            <div className="text-[12.5px] font-medium opacity-75">{t('job.approve.release')}</div>
            <div className="mt-1 text-[34px] font-medium leading-none tracking-[-0.03em]">
              <AnimatedCounter value={release} currency={job.currency} startOnView={false} />
            </div>
            <div className="mt-2 text-[12.5px] opacity-75">{t('job.approve.releaseHint', { name: counterpart?.name ?? '' })}</div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-col items-center gap-1 text-center">
        <div className="text-[13px] font-medium text-ink-2">{t('job.approve.rate', { name: counterpart?.name ?? '' })}</div>
        <RatingStars value={rating} onChange={setRating} size={34} showLabel />
      </div>
      <Field label={t('job.approve.review')} className="mt-4">
        <Textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder={t('job.approve.reviewPh')} className="min-h-[90px]" />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REVIEW_CHIPS.map((c) => (
          <Chip key={c.key} onClick={() => setReview((v) => (v.includes(c.en) ? v : `${v ? v.trim() + ' ' : ''}${c.en}`))}>
            <Plus className="size-3" />
            {t(`job.approve.chip.${c.key}`)}
          </Chip>
        ))}
      </div>
    </Modal>
  )
}

// ─────────────── client: request a revision ───────────────

interface Row {
  id: string
  text: string
}
let rowSeq = 0
const row = (text = ''): Row => ({ id: `r${++rowSeq}`, text })

function RevisionModal({ open, onClose }: MP) {
  const t = useT()
  const { job, counterpart } = useJobCtx()
  const request = useApp((s) => s.requestRevision)
  const used = job.revisions.length
  const atLimit = used >= job.revisionLimit
  const [versionId, setVersionId] = useState<string | undefined>(undefined)
  const [summary, setSummary] = useState('')
  const [rows, setRows] = useState<Row[]>([row()])
  const inputs = useRef(new Map<string, HTMLInputElement>())
  const focusNext = useRef<string | null>(null)
  const version = job.versions.find((v) => v.id === versionId) ?? job.versions[job.versions.length - 1]
  const pins = useMemo(() => (version?.annotations ?? []).filter((a) => !a.resolved), [version])

  useOnOpen(open, () => {
    setVersionId(job.versions[job.versions.length - 1]?.id)
    setSummary('')
    setRows([row()])
  })
  useEffect(() => {
    if (focusNext.current) {
      inputs.current.get(focusNext.current)?.focus()
      focusNext.current = null
    }
  }, [rows])

  const addRow = (after?: string, text = '') => {
    const r = row(text)
    focusNext.current = r.id
    setRows((prev) => {
      const i = after ? prev.findIndex((x) => x.id === after) : prev.length - 1
      const next = [...prev]
      next.splice(i + 1, 0, r)
      return next
    })
  }
  const importPins = () => {
    setRows((prev) => {
      const existing = new Set(prev.map((r) => r.text.trim()))
      const extra = pins.filter((p) => !existing.has(p.text)).map((p) => row(p.text))
      return [...prev.filter((r) => r.text.trim()), ...extra, ...(extra.length ? [] : [row()])]
    })
  }
  const items = rows.map((r) => r.text.trim()).filter(Boolean)
  const canSend = !atLimit && summary.trim().length > 2

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={t('job.revise.title')}
      description={t('job.revise.body', { name: counterpart?.name ?? '' })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button
            icon={<Repeat2 className="size-4" />}
            disabled={!canSend}
            onClick={() => {
              request(job.id, { summary: summary.trim(), items, versionId: version?.id })
              toast({ title: t('job.revise.done'), description: t('job.revise.doneBody', { name: counterpart?.name ?? '' }), tone: 'success' })
              onClose()
            }}
          >
            {t('job.revise.submit', { n: used + 1, limit: job.revisionLimit })}
          </Button>
        </>
      }
    >
      <div className="tile p-3.5">
        <RevisionMeter used={atLimit ? used : used + 1} limit={job.revisionLimit} />
        <p className="mt-2 text-[12.5px] text-ink-3">{atLimit ? t('job.revise.limit') : t('job.revise.thisIs', { n: used + 1, limit: job.revisionLimit })}</p>
      </div>
      <fieldset disabled={atLimit} className={cn('mt-4 space-y-4', atLimit && 'opacity-50')}>
        {job.versions.length > 1 && (
          <div>
            <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{t('job.revise.version')}</div>
            <Segmented
              value={version?.id ?? ''}
              onChange={setVersionId}
              options={job.versions.map((v) => ({ value: v.id, label: `v${v.version}` }))}
              size="sm"
              layoutId="rev-version"
            />
          </div>
        )}
        <Field label={t('job.revise.summary')}>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t('job.revise.summaryPh')} autoFocus />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-ink-2">{t('job.revise.items')}</span>
            {pins.length > 0 && (
              <button type="button" onClick={importPins} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-text hover:underline">
                <MessageSquareQuote className="size-3.5" />
                {t('job.revise.importPins', { count: pins.length })}
              </button>
            )}
          </div>
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {rows.map((r, i) => (
                <motion.li key={r.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right font-mono text-[11.5px] text-ink-3">{i + 1}</span>
                  <input
                    ref={(el) => {
                      if (el) inputs.current.set(r.id, el)
                      else inputs.current.delete(r.id)
                    }}
                    value={r.text}
                    onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addRow(r.id)
                      } else if (e.key === 'Backspace' && !r.text && rows.length > 1) {
                        e.preventDefault()
                        const prev = rows[i - 1] ?? rows[i + 1]
                        focusNext.current = prev?.id ?? null
                        setRows((p) => p.filter((x) => x.id !== r.id))
                      }
                    }}
                    placeholder={t('job.revise.itemPh')}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-[var(--surface)]/70 px-3 text-[13.5px] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent-line)] focus:shadow-[0_0_0_4px_var(--accent-softer)]"
                  />
                  <button
                    type="button"
                    aria-label={t('core.action.remove')}
                    onClick={() => setRows((p) => (p.length > 1 ? p.filter((x) => x.id !== r.id) : [row()]))}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="size-3.5" />} onClick={() => addRow()}>
            {t('job.revise.addItem')}
          </Button>
        </div>
      </fieldset>
    </Modal>
  )
}

// ─────────────── both: add assets ───────────────

function AssetsModal({ open, onClose }: MP) {
  const t = useT()
  const { job, meId } = useJobCtx()
  const addAssets = useApp((s) => s.addAssets)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  useOnOpen(open, () => {
    setUrl('')
    setLabel('')
    setBusy(false)
  })
  const upload = async (files: File[]) => {
    setBusy(true)
    try {
      const assets = await Promise.all(files.map((f) => fileToAsset(f, meId)))
      addAssets(job.id, assets)
      toast({ title: t('job.assets.uploaded', { count: assets.length }), description: job.title, tone: 'success' })
      onClose()
    } finally {
      setBusy(false)
    }
  }
  const valid = /^https?:\/\/\S+\.\S+/.test(url.trim())
  return (
    <Modal open={open} onClose={onClose} size="md" title={t('job.assets.addTitle')} description={t('job.assets.addBody')}>
      <div className="relative">
        <Dropzone onFiles={upload} />
        <AnimatePresence>
          {busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-[var(--surface)]/80 text-[14px] font-medium backdrop-blur">
              {t('job.assets.uploading')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="my-4 flex items-center gap-3 text-[12px] text-ink-3">
        <span className="h-px flex-1 bg-[var(--line)]" />
        {t('core.common.or')}
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <form
        className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          addAssets(job.id, [linkAsset(url.trim(), meId, label.trim() || undefined)])
          toast({ title: t('job.assets.linkAdded'), description: url.trim(), tone: 'success' })
          onClose()
        }}
      >
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" icon={<Link2 />} inputMode="url" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('job.assets.linkLabel')} />
        <Button type="submit" disabled={!valid} icon={<Plus className="size-4" />}>
          {t('core.action.add')}
        </Button>
      </form>
    </Modal>
  )
}

// ─────────────── both: schedule a call ───────────────

const EVENT_KINDS: CalendarEvent['kind'][] = ['call', 'review', 'focus', 'milestone']

function ScheduleModal({ open, onClose }: MP) {
  const t = useT()
  const lang = useLang()
  const { job, counterpart } = useJobCtx()
  const addEvent = useApp((s) => s.addEvent)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<CalendarEvent['kind']>('call')
  const [at, setAt] = useState('')
  const [duration, setDuration] = useState(30)
  useOnOpen(open, () => {
    const d = new Date(Date.now() + 864e5)
    d.setHours(11, 0, 0, 0)
    setAt(d.toISOString())
    setKind(job.status === 'in_review' ? 'review' : 'call')
    setTitle(`${job.status === 'in_review' ? 'Review' : 'Check-in'} · ${job.title}`)
    setDuration(30)
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('job.schedule.title')}
      description={t('job.schedule.body', { name: counterpart?.name ?? '' })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button
            icon={<CalendarPlus className="size-4" />}
            disabled={!title.trim() || !at}
            onClick={() => {
              addEvent({ title: title.trim(), at, durationMin: duration, kind, jobId: job.id, withId: counterpart?.id })
              toast({ title: t('job.schedule.done'), description: `${fmt(at, 'EEE d MMM · HH:mm', lang)} · ${title.trim()}`, tone: 'success', link: '/calendar' })
              onClose()
            }}
          >
            {t('job.schedule.submit')}
          </Button>
        </>
      }
    >
      <Field label={t('job.schedule.what')}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="no-scrollbar mt-4 overflow-x-auto">
        <Segmented value={kind} onChange={setKind} options={EVENT_KINDS.map((k) => ({ value: k, label: t(`job.schedule.kind.${k}`) }))} size="sm" layoutId="sched-kind" />
      </div>
      <Field label={t('job.schedule.when')} className="mt-4">
        <DatePicker value={at} onChange={setAt} withTime min={new Date()} defaultTime="11:00" />
      </Field>
      <div className="mt-4">
        <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{t('job.schedule.duration')}</div>
        <div className="flex flex-wrap gap-1.5">
          {[15, 30, 45, 60, 90].map((m) => (
            <Chip key={m} active={duration === m} onClick={() => setDuration(m)}>
              {m}m
            </Chip>
          ))}
        </div>
      </div>
      {at && <p className="mt-4 font-mono text-[12px] text-ink-3">{t('job.schedule.summary', { date: shortDate(at, lang), time: fmt(at, 'HH:mm', lang), min: duration })}</p>}
    </Modal>
  )
}

// ─────────────── both: cancel ───────────────

function CancelDialog({ open, onClose }: MP) {
  const t = useT()
  const { job, counterpart } = useJobCtx()
  const cancel = useApp((s) => s.cancelJob)
  const send = useApp((s) => s.sendMessage)
  const ensure = useApp((s) => s.ensureConversation)
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      tone="danger"
      title={t('job.cancel.title')}
      description={t('job.cancel.body', { name: counterpart?.name ?? '' })}
      confirmLabel={t('job.cancel.confirm')}
      cancelLabel={t('job.cancel.keep')}
      requireText={job.id}
      onConfirm={() => {
        cancel(job.id)
        const conv = job.conversationId ?? ensure(job.clientId, job.designerId)
        send(conv, { text: `I’ve had to cancel “${job.title}”. Sorry for the change of plans — thank you for your time!`, jobId: job.id })
        toast({ title: t('job.cancel.done'), description: job.title, tone: 'info' })
      }}
    />
  )
}
