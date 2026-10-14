import { AnimatePresence, motion } from 'motion/react'
import { CheckCheck, Repeat2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { shortDate, timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { RevisionRequest } from '@/store/types'
import { Pill } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/Progress'
import { fireConfetti } from '@/lib/confetti'
import { useJobCtx } from './context'
import { CheckDot, PersonAvatar } from './ui'

const TONE = { open: 'warning', in_progress: 'info', resolved: 'success' } as const

/** One revision request with its checklist. Designers tick items and resolve. */
export function RevisionCard({ revision, index, compact }: { revision: RevisionRequest; index: number; compact?: boolean }) {
  const t = useT()
  const lang = useLang()
  const { job, side, canAct, person, showVersion } = useJobCtx()
  const toggleItem = useApp((s) => s.toggleRevisionItem)
  const resolve = useApp((s) => s.resolveRevision)
  const editable = canAct && side === 'designer' && revision.status !== 'resolved'
  const done = revision.items.filter((i) => i.done).length
  const total = revision.items.length
  const pct = total ? (done / total) * 100 : revision.status === 'resolved' ? 100 : 0
  const version = job.versions.find((v) => v.id === revision.versionId)
  const author = person(revision.requestedBy)

  return (
    <div className={cn('relative rounded-[20px] border border-line bg-[var(--surface)]/60 p-4', revision.status === 'resolved' && 'opacity-80')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', revision.status === 'resolved' ? 'bg-success-soft text-success' : 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_60%,var(--ink))]')}>
            {revision.status === 'resolved' ? <CheckCheck className="size-4" /> : <Repeat2 className="size-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium">
              {t('job.revisions.number', { n: index })}
              {version && (
                <button type="button" onClick={() => showVersion(version.id)} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px] text-ink-2 transition-colors hover:bg-[var(--surface-3)]">
                  v{version.version}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <PersonAvatar person={author} size={16} />
              <span className="truncate">{author?.name}</span>
              <span>·</span>
              <span className="font-mono" title={shortDate(revision.requestedAt, lang)}>
                {timeAgo(revision.requestedAt, lang)}
              </span>
            </div>
          </div>
        </div>
        <Pill tone={TONE[revision.status]} size="xs" dot>
          {t(`job.revisions.status.${revision.status}`)}
        </Pill>
      </div>

      <p className={cn('mt-3 text-[14px] leading-relaxed text-ink', compact && 'line-clamp-2')}>{revision.summary}</p>

      {total > 0 && (
        <ul className="mt-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {revision.items.map((it) => (
              <motion.li key={it.id} layout className="flex items-start gap-2.5 rounded-xl px-1 py-1">
                <CheckDot
                  checked={it.done}
                  disabled={!editable}
                  label={it.text}
                  size={20}
                  onClick={() => {
                    toggleItem(job.id, revision.id, it.id)
                    if (!it.done && done + 1 === total) toast({ title: t('job.revisions.allChecked'), description: t('job.revisions.allCheckedHint'), tone: 'success' })
                  }}
                />
                <span className="relative pt-px text-[13.5px] leading-snug text-ink-2">
                  {it.text}
                  <motion.span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-px w-full origin-left bg-[var(--ink-3)]"
                    initial={false}
                    animate={{ scaleX: it.done ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  />
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ProgressBar value={pct} className="min-w-28 flex-1" height={6} tone={revision.status === 'resolved' ? 'success' : 'accent'} />
        <span className="font-mono text-[11.5px] text-ink-3">
          {done}/{total}
        </span>
        {editable && (
          <Button
            size="xs"
            variant={done === total ? 'primary' : 'soft'}
            icon={<CheckCheck className="size-3.5" />}
            onClick={(e) => {
              resolve(job.id, revision.id)
              fireConfetti({ from: e.currentTarget, particleCount: 60, spread: 70 })
              toast({ title: t('job.revisions.resolved'), description: revision.summary, tone: 'success' })
            }}
          >
            {t('job.revisions.resolve')}
          </Button>
        )}
      </div>
    </div>
  )
}

/** Capsule meter: "revision 2 of 3" — filled capsules are used rounds. */
export function RevisionMeter({ used, limit, className }: { used: number; limit: number; className?: string }) {
  const t = useT()
  const left = Math.max(0, limit - used)
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="text-ink-3">{t('job.revisions.meter', { used, limit })}</span>
        <span className={cn('font-medium', left === 0 ? 'text-danger' : 'text-ink-2')}>{left === 0 ? t('job.revisions.noneLeft') : t('job.revisions.left', { count: left })}</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: Math.max(limit, used) }, (_, i) => (
          <motion.span
            key={i}
            className={cn('h-2 flex-1 origin-left rounded-full', i < used ? (i >= limit ? 'bg-danger' : 'bg-[color-mix(in_oklab,var(--warning)_85%,var(--ink))]') : 'bg-[var(--surface-3)]')}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
          />
        ))}
      </div>
    </div>
  )
}
