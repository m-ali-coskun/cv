import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, PackageCheck, Rocket, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useClient } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { fireConfetti } from '@/lib/confetti'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { ProgressBar } from '@/components/ui/Progress'
import { GenerativeArt } from '@/components/art/GenerativeArt'

/**
 * Designer dropped a card on "In review": delivering a version is what moves
 * a job into review. Offers a quick delivery (generated preview) or a jump to
 * the job's deliveries tab to upload real files.
 */
export function DeliverModal({ job, open, onClose, onDone }: { job: Job | undefined; open: boolean; onClose: () => void; onDone?: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const submitVersion = useApp((s) => s.submitVersion)
  const client = useClient(job?.clientId)
  const [note, setNote] = useState('')
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open && job) setNote(t('jobs.deliver.notePh', { n: job.versions.length + 1 }))
  }, [open, job?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!job) return null
  const next = job.versions.length + 1
  const done = job.deliverables.filter((d) => d.done).length

  const quick = () => {
    submitVersion(job.id, { note: note.trim() || t('jobs.deliver.notePh', { n: next }), media: [] })
    fireConfetti({ from: btn.current, particleCount: 90, spread: 70 })
    toast({
      title: t('jobs.deliver.toast', { n: next }),
      description: t('jobs.deliver.toastBody', { name: client?.name ?? '' }),
      tone: 'success',
      link: `/jobs/${job.id}`,
    })
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('jobs.deliver.title', { n: next })}
      description={t('jobs.deliver.desc')}
      footer={
        <>
          <Button
            variant="glass"
            icon={<UploadCloud className="size-4" />}
            onClick={() => {
              onClose()
              navigate(`/jobs/${job.id}?tab=deliveries`)
            }}
          >
            {t('jobs.deliver.upload')}
          </Button>
          <Button ref={btn} icon={<Rocket className="size-4" />} onClick={quick}>
            {t('jobs.deliver.quick')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="tile flex items-center gap-4 p-3.5">
          <motion.div
            className="relative size-[68px] shrink-0 overflow-hidden rounded-2xl shadow-[0_10px_24px_-12px_rgba(0,0,0,.4)]"
            initial={{ rotate: -8, y: 10, opacity: 0 }}
            animate={{ rotate: -3, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <GenerativeArt seed={`${job.id}-v${next}`} variant="poster" discipline={job.discipline} className="size-full" />
            <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 font-mono text-[10px] text-white">v{next}</span>
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">{job.title}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-ink-3">
              <PackageCheck className="size-3.5" />
              {t('jobs.card.deliverables', { done, total: job.deliverables.length })}
            </p>
            <ProgressBar value={job.progress} height={6} tone="accent" className="mt-2" showLabel />
          </div>
        </div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[88px]" aria-label={t('jobs.deliver.note')} />
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate(`/jobs/${job.id}`)
          }}
          className="inline-flex items-center gap-1 self-start text-[12.5px] font-medium text-ink-3 hover:text-ink"
        >
          {t('jobs.deliver.openJob')} <ArrowUpRight className="size-3.5" />
        </button>
      </div>
    </Modal>
  )
}
