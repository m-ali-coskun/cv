import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, MapPin, Plus, RotateCcw, Send, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useDesigner } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { Modal } from '@/components/ui/Overlay'
import { Button, IconButton } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { MediaView } from '@/components/art/MediaView'

const SUGGESTIONS = ['sugg.contrast', 'sugg.headline', 'sugg.spacing', 'sugg.palette', 'sugg.logo', 'sugg.copy'] as const

/**
 * Request changes on the latest delivery → requestRevision.
 * Standalone: <RevisionModal job={job} open={open} onClose={…} />
 */
export function RevisionModal({ job, open, onClose, onDone }: { job: Job | undefined; open: boolean; onClose: () => void; onDone?: () => void }) {
  const t = useT()
  const requestRevision = useApp((s) => s.requestRevision)
  const designer = useDesigner(job?.designerId)
  const [summary, setSummary] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSummary('')
      setItems([])
      setDraft('')
      setTouched(false)
    }
  }, [open, job?.id])

  const latest = job?.versions[job.versions.length - 1]
  const openPins = useMemo(() => latest?.annotations.filter((a) => !a.resolved) ?? [], [latest])

  if (!job) return null
  const used = job.revisions.length
  const limit = job.revisionLimit
  const over = used >= limit

  const add = (text: string) => {
    const v = text.trim()
    if (!v) return
    setItems((l) => (l.includes(v) ? l : [...l, v]))
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add(draft)
      setDraft('')
    }
  }
  const importPins = () => openPins.forEach((p) => add(p.text))

  const submit = () => {
    setTouched(true)
    const s = summary.trim() || items[0]
    if (!s) return
    const all = draft.trim() ? [...items, draft.trim()] : items
    requestRevision(job.id, { summary: s, items: all, versionId: latest?.id })
    toast({
      title: t('jobs.revision.toast', { id: job.id }),
      description: t('jobs.revision.toastBody', { name: designer?.name ?? '', count: all.length }),
      tone: 'info',
      link: `/jobs/${job.id}`,
    })
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={t('jobs.revision.title')}
      description={
        <span>
          <span className="font-mono text-ink-2">{job.id}</span> · {job.title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button icon={<Send className="size-4" />} onClick={submit}>
            {t('jobs.revision.cta')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* revisions meter */}
        <div className={cn('tile flex items-center gap-3 p-3.5', over && 'bg-warning-soft')}>
          {latest ? (
            <div className="size-12 shrink-0 overflow-hidden rounded-xl">
              <MediaView media={latest.media[0] ?? job.cover} />
            </div>
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-3)]">
              <RotateCcw className="size-5 text-ink-3" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">
              {t('jobs.revision.round', { n: Math.min(used + 1, Math.max(limit, used + 1)), limit })}
            </p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: Math.max(limit, used + 1) }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                  className={cn(
                    'h-1.5 flex-1 origin-left rounded-full',
                    i < used ? 'bg-ink' : i === used ? (i >= limit ? 'bg-warning' : 'bg-accent') : 'bg-[var(--surface-3)]',
                  )}
                />
              ))}
            </div>
          </div>
          {over && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[color-mix(in_oklab,var(--warning)_70%,var(--ink))]">
              <AlertTriangle className="size-3.5" /> {t('jobs.revision.overLimit')}
            </span>
          )}
        </div>

        <Field label={t('jobs.revision.summary')} error={touched && !summary.trim() && !items.length ? t('jobs.revision.summaryReq') : undefined}>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t('jobs.revision.summaryPh')} autoFocus />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-ink-2">{t('jobs.revision.items')}</span>
            {openPins.length > 0 && (
              <button type="button" onClick={importPins} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-text hover:underline">
                <MapPin className="size-3.5" /> {t('jobs.revision.importPins', { count: openPins.length })}
              </button>
            )}
          </div>
          <div className="tile flex flex-col gap-1.5 p-2">
            <AnimatePresence initial={false}>
              {items.map((it, i) => (
                <motion.div
                  key={it}
                  layout
                  initial={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                  className="flex items-center gap-2.5 rounded-xl bg-[var(--surface)] px-3 py-2 text-[13.5px]"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] font-mono text-[10.5px]">{i + 1}</span>
                  <span className="min-w-0 flex-1">{it}</span>
                  <IconButton label={t('core.action.remove')} variant="ghost" size="sm" onClick={() => setItems((l) => l.filter((x) => x !== it))}>
                    <X className="size-3.5" />
                  </IconButton>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                placeholder={t('jobs.revision.itemPh')}
                className="h-10 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-[13.5px] outline-none placeholder:text-ink-3"
              />
              <IconButton
                label={t('core.action.add')}
                variant="primary"
                size="sm"
                onClick={() => {
                  add(draft)
                  setDraft('')
                  inputRef.current?.focus()
                }}
              >
                <Plus className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((k) => {
              const text = t(`jobs.${k}`)
              const on = items.includes(text)
              return (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => (on ? setItems((l) => l.filter((x) => x !== text)) : add(text))}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors',
                    on ? 'border-transparent bg-ink text-[var(--surface)]' : 'border-dashed border-line-2 text-ink-2 hover:text-ink',
                  )}
                >
                  <Plus className={cn('size-3 transition-transform', on && 'rotate-45')} />
                  {text}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
