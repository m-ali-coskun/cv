import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Link2, Plus, UploadCloud, X } from 'lucide-react'
import { useApp } from '@/store'
import { useMeId, useMyJobs } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Asset } from '@/store/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import { fileToAsset, kindFromMime, linkAsset } from '@/lib/files'
import { spring } from '@/lib/motion'
import { fireConfetti } from '@/lib/confetti'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Dropzone } from '@/components/ui/Dropzone'
import { Field, Input, Select } from '@/components/ui/Field'
import { DisciplineIcon } from '@/components/ui/Badge'
import { KIND_COLOR, KIND_ICON } from './model'

type Staged = { id: string; file?: File; url?: string; name: string; size: number; kind: Asset['kind']; progress: number; done: boolean }

const MAX_BYTES = 50 * 1024 * 1024

export function UploadModal({
  open,
  onClose,
  initialJob,
  initialFiles,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  initialJob?: string | null
  initialFiles?: File[]
  onUploaded: (jobId: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} bare size="md">
      {open && <UploadForm onClose={onClose} initialJob={initialJob} initialFiles={initialFiles} onUploaded={onUploaded} />}
    </Modal>
  )
}

function UploadForm({ onClose, initialJob, initialFiles, onUploaded }: { onClose: () => void; initialJob?: string | null; initialFiles?: File[]; onUploaded: (jobId: string) => void }) {
  const t = useT()
  const meId = useMeId()
  const addAssets = useApp((s) => s.addAssets)
  const jobs = useMyJobs({ ignoreDiscipline: true })
  const targets = useMemo(() => jobs.filter((j) => j.status !== 'declined' && j.status !== 'cancelled'), [jobs])
  const [jobId, setJobId] = useState(() => (initialJob && targets.some((j) => j.id === initialJob) ? initialJob : (targets[0]?.id ?? '')))
  const [staged, setStaged] = useState<Staged[]>([])
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const job = targets.find((j) => j.id === jobId)

  const stage = (files: File[]) => {
    const ok = files.filter((f) => f.size <= MAX_BYTES)
    if (ok.length < files.length) toast({ title: t('files.upload.tooBig', { count: files.length - ok.length }), tone: 'error' })
    setStaged((s) => [
      ...s,
      ...ok.map((f) => ({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, file: f, name: f.name, size: f.size, kind: kindFromMime(f.type, f.name), progress: 0, done: false })),
    ])
  }

  useEffect(() => {
    if (initialFiles?.length) stage(initialFiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addLink = () => {
    const v = link.trim()
    if (!v) return
    let url = v
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    try {
      new URL(url)
    } catch {
      toast({ title: t('files.upload.badLink'), tone: 'error' })
      return
    }
    setStaged((s) => [...s, { id: `link-${Math.random().toString(36).slice(2, 7)}`, url, name: url.replace(/^https?:\/\/(www\.)?/, ''), size: 0, kind: 'link', progress: 0, done: false }])
    setLink('')
  }

  const upload = async () => {
    if (!job || !staged.length || busy) return
    setBusy(true)
    const assets: Asset[] = []
    for (const s of staged) {
      // animated progress while the blob is written to IndexedDB
      setStaged((list) => list.map((x) => (x.id === s.id ? { ...x, progress: 35 } : x)))
      const asset = s.file ? await fileToAsset(s.file, meId, note.trim() || undefined) : linkAsset(s.url!, meId)
      if (!s.file && note.trim()) asset.note = note.trim()
      assets.push(asset)
      await new Promise((r) => setTimeout(r, 160))
      setStaged((list) => list.map((x) => (x.id === s.id ? { ...x, progress: 100, done: true } : x)))
    }
    await new Promise((r) => setTimeout(r, 260))
    addAssets(job.id, assets)
    fireConfetti({ from: btn.current, particleCount: 70 })
    toast({
      title: t('files.upload.done', { count: assets.length }),
      description: `${job.id} · ${job.title}`,
      tone: 'success',
      link: `/jobs/${job.id}`,
    })
    onUploaded(job.id)
    onClose()
  }

  const total = staged.reduce((n, s) => n + s.size, 0)

  return (
    <div className="flex max-h-[92dvh] flex-col">
      <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
        <div>
          <h2 className="text-[20px] font-medium tracking-[-0.02em]">{t('files.upload.title')}</h2>
          <p className="mt-1 text-[13.5px] text-ink-3">{t('files.upload.subtitle')}</p>
        </div>
        <button type="button" aria-label={t('files.close')} onClick={onClose} className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-2">
        {targets.length === 0 ? (
          <p className="rounded-2xl bg-warning-soft px-4 py-3 text-[13px]">{t('files.upload.noJobs')}</p>
        ) : (
          <Field label={t('files.upload.target')}>
            <div className="flex items-center gap-2">
              {job && <DisciplineIcon id={job.discipline} size={36} className="shrink-0" />}
              <div className="min-w-0 flex-1">
                <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  {targets.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.id} · {j.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Field>
        )}

        <Dropzone onFiles={stage} />

        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              icon={<Link2 />}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
              placeholder={t('files.upload.linkPlaceholder')}
            />
          </div>
          <Button variant="soft" icon={<Plus className="size-4" />} onClick={addLink} disabled={!link.trim()}>
            {t('files.upload.addLink')}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {staged.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mb-2 flex items-center justify-between text-[12px] text-ink-3">
                <span>{t('files.upload.staged', { count: staged.length })}</span>
                <span className="font-mono">{formatBytes(total)}</span>
              </div>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {staged.map((s) => {
                    const Icon = KIND_ICON[s.kind]
                    return (
                      <motion.li
                        key={s.id}
                        layout
                        initial={{ opacity: 0, x: -16, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 16, height: 0 }}
                        transition={spring.smooth}
                        className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[var(--surface-2)] px-3 py-2.5"
                      >
                        <motion.span
                          className="absolute inset-y-0 left-0 bg-accent-soft"
                          initial={{ width: 0 }}
                          animate={{ width: `${s.progress}%` }}
                          transition={{ duration: s.progress === 100 ? 0.3 : 1.4, ease: [0.23, 1, 0.32, 1] }}
                        />
                        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[#0b0b0c]" style={{ background: KIND_COLOR[s.kind] }}>
                          <Icon className="size-4" />
                        </span>
                        <span className="relative min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{s.name}</span>
                          <span className="font-mono text-[11px] text-ink-3">{s.size ? formatBytes(s.size) : t('files.kind.link')}</span>
                        </span>
                        {s.done ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="relative flex size-6 items-center justify-center rounded-full bg-success text-white">
                            <Check className="size-3.5" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <button
                            type="button"
                            aria-label={t('files.upload.unstage')}
                            disabled={busy}
                            onClick={() => setStaged((list) => list.filter((x) => x.id !== s.id))}
                            className="relative flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-3)] hover:text-ink"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label={t('files.upload.note')} hint={t('files.upload.optional')}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('files.upload.notePlaceholder')} maxLength={140} />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4 safe-bottom">
        <Button variant="glass" size="sm" onClick={onClose} disabled={busy}>
          {t('files.cancel')}
        </Button>
        <Button ref={btn} size="sm" icon={<UploadCloud className="size-4" />} onClick={upload} loading={busy} disabled={!staged.length || !job} className={cn(!staged.length && 'opacity-50')}>
          {staged.length ? t('files.upload.cta', { count: staged.length }) : t('files.upload')}
        </Button>
      </div>
    </div>
  )
}
