import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Check, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useDesigner } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { formatMoney } from '@/lib/format'
import { timeAgo } from '@/lib/dates'
import { fireConfetti, fireStars } from '@/lib/confetti'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { RatingStars } from '@/components/ui/RatingStars'
import { Avatar } from '@/components/ui/Avatar'
import { MediaView } from '@/components/art/MediaView'

const PRAISE = ['praise.quality', 'praise.fast', 'praise.communication', 'praise.brief', 'praise.again'] as const

/**
 * Approve the latest delivery: rating + review → approveJob, then confetti.
 * Standalone: <ApproveModal job={job} open={open} onClose={…} />
 */
export function ApproveModal({ job, open, onClose, onDone }: { job: Job | undefined; open: boolean; onClose: () => void; onDone?: () => void }) {
  const t = useT()
  const lang = useLang()
  const approveJob = useApp((s) => s.approveJob)
  const designer = useDesigner(job?.designerId)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [chips, setChips] = useState<string[]>([])
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setRating(5)
      setReview('')
      setChips([])
    }
  }, [open, job?.id])

  if (!job) return null
  const latest = job.versions[job.versions.length - 1]
  const media = (latest?.media.length ? latest.media : [job.cover]).slice(0, 3)
  const escrow = job.milestones.filter((m) => m.status !== 'released').reduce((n, m) => n + m.amount, 0) || job.budget

  const togglePraise = (key: string) => {
    const text = t(`jobs.${key}`)
    setChips((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]))
    setReview((r) => {
      if (r.includes(text)) return r.replace(text, '').replace(/\s{2,}/g, ' ').trim()
      return (r ? `${r.trim()} ${text}` : text).trim()
    })
  }

  const submit = () => {
    approveJob(job.id, { rating, review: review.trim() || undefined })
    fireConfetti({ from: btn.current, particleCount: 200 })
    if (rating >= 5) setTimeout(() => fireStars({ from: btn.current }), 260)
    toast({
      title: t('jobs.approve.toast', { id: job.id }),
      description: t('jobs.approve.toastBody', { amount: formatMoney(escrow, job.currency, lang), name: designer?.name ?? '' }),
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
      size="md"
      title={t('jobs.approve.title')}
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
          <Button ref={btn} icon={<Check className="size-4" />} onClick={submit}>
            {t('jobs.approve.cta', { amount: formatMoney(escrow, job.currency, lang) })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* delivered work, fanned like papers */}
        <div className="tile relative flex items-center gap-4 overflow-hidden p-4">
          <div className="relative h-[92px] w-[132px] shrink-0">
            {media.map((m, i) => {
              const rot = media.length === 1 ? 0 : (i - (media.length - 1) / 2) * 9
              return (
                <motion.div
                  key={i}
                  className="absolute inset-0 overflow-hidden rounded-[14px] shadow-[0_10px_24px_-12px_rgba(0,0,0,.45)] ring-1 ring-black/5"
                  initial={{ opacity: 0, y: 24, rotate: 0, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, rotate: rot, scale: 1, x: (i - (media.length - 1) / 2) * 14 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.12 + i * 0.07 }}
                  style={{ zIndex: i }}
                >
                  <MediaView media={m} />
                </motion.div>
              )
            })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <span className="font-mono">{latest ? `v${latest.version}` : 'v—'}</span>
              {latest && <span>· {timeAgo(latest.submittedAt, lang)}</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-[13.5px] text-ink-2">{latest?.note || job.summary}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <Avatar seed={designer?.avatarSeed ?? job.designerId} media={designer?.avatar} size={24} />
              <span className="truncate text-[13px] font-medium">{designer?.name}</span>
              {designer?.verified && <BadgeCheck className="size-4 text-info" />}
            </div>
          </div>
        </div>

        {/* rating */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[13px] font-medium text-ink-2">{t('jobs.approve.rate', { name: designer?.name ?? '' })}</p>
          <RatingStars value={rating} onChange={setRating} size={36} showLabel />
        </div>

        {/* praise chips */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {PRAISE.map((k) => {
            const on = chips.includes(k)
            return (
              <motion.button
                key={k}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => togglePraise(k)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors',
                  on ? 'border-transparent bg-accent text-accent-ink' : 'border-line-2 text-ink-2 hover:text-ink',
                )}
              >
                {on ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
                {t(`jobs.${k}`)}
              </motion.button>
            )
          })}
        </div>

        <Textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={t('jobs.approve.reviewPh')}
          className="min-h-[96px]"
          aria-label={t('jobs.approve.review')}
        />

        {/* payment release */}
        <div className="glass-night relative flex items-center gap-3 overflow-hidden rounded-[20px] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">{t('jobs.approve.escrow')}</p>
            <p className="text-[12px] text-white/60">{t('jobs.approve.escrowHint')}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[17px] font-medium tabular-nums">{formatMoney(escrow, job.currency, lang)}</p>
            <p className="inline-flex items-center gap-1 text-[11px] text-white/50">
              <Lock className="size-3" /> {t('jobs.approve.held')}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
