import { AnimatePresence, motion } from 'motion/react'
import { CheckCheck, ListTodo, Repeat2, Timer } from 'lucide-react'
import { spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useJobCtx } from '../context'
import { useDuration } from '../hooks'
import { RevisionCard, RevisionMeter } from '../RevisionCard'

export function RevisionsTab() {
  const t = useT()
  const dur = useDuration()
  const { job, side, canAct, openModal } = useJobCtx()
  const used = job.revisions.length
  const items = job.revisions.flatMap((r) => r.items)
  const doneItems = items.filter((i) => i.done).length
  const open = job.revisions.filter((r) => r.status !== 'resolved').length
  // average turnaround: revision request → next delivery
  const turnarounds = job.revisions
    .map((r) => {
      const next = job.versions.find((v) => v.submittedAt > r.requestedAt)
      return next ? (new Date(next.submittedAt).getTime() - new Date(r.requestedAt).getTime()) / 60000 : null
    })
    .filter((x): x is number => x !== null)
  const avg = turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : 0
  const canRequest = canAct && side === 'client' && job.status === 'in_review' && used < job.revisionLimit
  const ordered = job.revisions.map((r, i) => ({ r, i })).reverse()

  const stats = [
    { icon: <Repeat2 />, label: t('job.revisions.statRounds'), value: used, suffix: ` / ${job.revisionLimit}` },
    { icon: <ListTodo />, label: t('job.revisions.statOpen'), value: open },
    { icon: <CheckCheck />, label: t('job.revisions.statItems'), value: doneItems, suffix: ` / ${items.length}` },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="min-w-0 rounded-[18px] bg-[var(--surface-2)] p-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ...spring.smooth }}>
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3 [&_svg]:size-3.5">
                {s.icon}
                <span className="truncate">{s.label}</span>
              </div>
              <div className="mt-1 text-[20px] font-medium tracking-[-0.02em]">
                <AnimatedCounter value={s.value} startOnView={false} />
                {s.suffix && <span className="text-[13px] text-ink-3">{s.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-[18px] bg-[var(--surface-2)] p-3.5">
          <RevisionMeter used={used} limit={job.revisionLimit} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-ink-3">
              <Timer className="size-3.5" />
              {avg ? t('job.revisions.turnaround', { time: dur(avg) }) : t('job.revisions.noTurnaround')}
            </span>
            {canRequest && (
              <Button size="sm" icon={<Repeat2 className="size-3.5" />} onClick={() => openModal('revision')}>
                {t('job.act.c.requestRevision')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {used === 0 ? (
        <EmptyState
          icon={<Repeat2 />}
          title={t('job.revisions.emptyTitle')}
          description={t(side === 'client' ? 'job.revisions.emptyClient' : 'job.revisions.emptyDesigner', { limit: job.revisionLimit })}
        />
      ) : (
        <ol className="relative space-y-3">
          <AnimatePresence initial={false}>
            {ordered.map(({ r, i }) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={spring.smooth}
              >
                <RevisionCard revision={r} index={i + 1} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}
