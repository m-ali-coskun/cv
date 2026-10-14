import { motion } from 'motion/react'
import { BadgeCheck, Ban, Eye, Inbox, ListOrdered, PenTool, Repeat2, Route, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { shortDate } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import type { JobStatus } from '@/store/types'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ProgressRing } from '@/components/ui/Progress'
import { useJobCtx } from './context'
import { useDuration, useNow } from './hooks'
import { journeyIndex, journeySteps, reachedAt } from './model'
import { Card, MonoChip, SectionTitle } from './ui'

const STEP_ICON: Partial<Record<JobStatus, LucideIcon>> = {
  requested: Inbox,
  queued: ListOrdered,
  in_progress: PenTool,
  final_touches: Sparkles,
  in_review: Eye,
  revisions: Repeat2,
  approved: BadgeCheck,
}

/** Animated pipeline: requested → … → approved, the current stage pulses. */
export function Journey() {
  const t = useT()
  const lang = useLang()
  const { job } = useJobCtx()
  const now = useNow(30_000)
  const dur = useDuration()
  const steps = journeySteps(job)
  const n = steps.length
  const stopped = job.status === 'declined' || job.status === 'cancelled'
  const approved = job.status === 'approved'
  const cur = journeyIndex(job, steps)
  const fill = stopped ? 0 : approved ? 1 : n > 1 ? cur / (n - 1) : 0
  const since = reachedAt(job, job.status) ?? job.updatedAt
  const inStageMin = Math.max(0, (now - new Date(since).getTime()) / 60000)
  const round = job.revisions.length > 0 && !approved && cur < steps.indexOf('revisions') ? job.versions.length + 1 : 0

  return (
    <Card className="overflow-hidden">
      <SectionTitle
        icon={<Route />}
        title={t('job.journey.title')}
        sub={
          stopped
            ? t(`job.journey.stopped.${job.status}`, { date: shortDate(job.updatedAt, lang) })
            : approved
              ? t('job.journey.done', { date: shortDate(job.approvedAt ?? job.updatedAt, lang) })
              : t('job.journey.stage', { n: cur + 1, total: n, status: t(`core.status.${job.status}`) })
        }
        right={
          <ProgressRing value={job.progress} size={58} stroke={6} color={approved ? 'var(--success)' : 'var(--accent)'}>
            <span className="text-[13px] font-semibold">
              <AnimatedCounter value={job.progress} suffix="%" startOnView={false} />
            </span>
          </ProgressRing>
        }
      />

      <div className={cn('relative mt-6', stopped && 'opacity-45 grayscale')}>
        {/* track */}
        <div className="absolute top-[18px] h-1.5 -translate-y-1/2 rounded-full bg-[var(--surface-3)] sm:top-5" style={{ left: `calc(100% / ${2 * n})`, right: `calc(100% / ${2 * n})` }}>
          <motion.div
            className="absolute inset-y-0 left-0 origin-left rounded-full"
            style={{ width: '100%', background: approved ? 'var(--success)' : 'var(--accent)' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: fill }}
            transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.2 }}
          />
          {!stopped && !approved && (
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-16 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent)] mix-blend-overlay"
              animate={{ left: ['-10%', `${fill * 100}%`] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
            />
          )}
        </div>

        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => {
            const state = approved ? 'done' : i < cur ? 'done' : i === cur && !stopped ? 'current' : 'todo'
            const Icon = STEP_ICON[s] ?? Sparkles
            const at = state !== 'todo' ? reachedAt(job, s) : undefined
            return (
              <motion.li
                key={s}
                className="flex min-w-0 flex-col items-center text-center"
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.12 + i * 0.07, duration: 0.55, ease: EASE_OUT }}
              >
                <span className="relative flex size-9 items-center justify-center sm:size-10">
                  {state === 'current' && (
                    <>
                      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[var(--accent)]" />
                      <span className="absolute -inset-1 rounded-full bg-accent-soft" />
                    </>
                  )}
                  <motion.span
                    className={cn(
                      'relative flex size-full items-center justify-center rounded-full transition-colors duration-500 [&_svg]:size-4',
                      state === 'done' && (approved ? 'bg-success text-white' : 'bg-accent text-accent-ink'),
                      state === 'current' && 'bg-ink text-[var(--surface)] shadow-[0_10px_24px_-10px_rgba(0,0,0,.6)] dark:bg-accent dark:text-accent-ink',
                      state === 'todo' && 'bg-[var(--surface-2)] text-ink-3 ring-1 ring-inset ring-[var(--line-2)]',
                    )}
                    animate={state === 'current' ? { y: [0, -3, 0], scale: 1.08 } : { y: 0, scale: 1 }}
                    transition={state === 'current' ? { y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }, scale: spring.bouncy } : spring.smooth}
                  >
                    <Icon />
                  </motion.span>
                </span>
                <span
                  className={cn(
                    'mt-2 hidden w-full truncate px-0.5 text-[12px] font-medium sm:block',
                    state === 'todo' ? 'text-ink-3' : 'text-ink',
                  )}
                >
                  {t(`core.status.${s}`)}
                </span>
                <span className="mt-0.5 hidden h-4 font-mono text-[10.5px] text-ink-3 sm:block">{at ? shortDate(at, lang) : ''}</span>
              </motion.li>
            )
          })}
        </ol>

        {stopped && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--surface)] grayscale-0">
              <Ban className="size-3.5" />
              {t(`core.status.${job.status}`)}
            </span>
          </div>
        )}
      </div>

      {/* mobile: current stage caption */}
      {!stopped && (
        <div className="mt-3 text-center text-[13px] font-medium text-ink sm:hidden">
          {approved ? t('core.status.approved') : t(`core.status.${job.status}`)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {!stopped && !approved && <MonoChip>{t('job.journey.inStage', { time: dur(inStageMin) })}</MonoChip>}
        {job.startedAt && <MonoChip>{t('job.journey.started', { date: shortDate(job.startedAt, lang) })}</MonoChip>}
        <MonoChip>{t('job.journey.versions', { count: job.versions.length })}</MonoChip>
        <MonoChip>{t('job.journey.revisions', { used: job.revisions.length, limit: job.revisionLimit })}</MonoChip>
        {round > 0 && <MonoChip className="bg-accent-soft text-accent-text">{t('job.journey.round', { n: round })}</MonoChip>}
      </div>
    </Card>
  )
}
