import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, CalendarPlus, Check, CircleSlash2, ExternalLink, MessageCircle, MessageSquareText, Pause, Play, ShieldCheck, Timer, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { dueLabel, daysUntil } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { Drawer } from '@/components/ui/Overlay'
import { RiskBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaView } from '@/components/art/MediaView'
import { RISK_RANK, riskView, type RiskView } from '../data'
import { useIsMobile, usePeople } from '../hooks'
import { MonoId, PersonAvatar, listItem } from '../ui'
import { useFixes } from '../actions'
import { coverOf } from './HeroCarousel'
import { reasonText } from './Attention'

type FixId = 'nudge' | 'extend' | 'unblock' | 'update' | 'ask'

function FixButton({ done, doneLabel, children, icon, onClick, tone = 'soft' }: { done?: boolean; doneLabel: string; children: ReactNode; icon: ReactNode; onClick: () => void; tone?: 'soft' | 'primary' | 'outline' }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {done ? (
        <motion.span
          key="done"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-soft px-3 text-[12.5px] font-medium text-[color-mix(in_oklab,var(--success)_75%,var(--ink))]"
        >
          <Check className="size-3.5" />
          {doneLabel}
        </motion.span>
      ) : (
        <motion.span key="btn" exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }} transition={{ duration: 0.15 }}>
          <Button size="sm" variant={tone === 'primary' ? 'primary' : tone === 'outline' ? 'outline' : 'soft'} icon={icon} onClick={onClick} className="h-8 px-3 text-[12.5px]">
            {children}
          </Button>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/**
 * "Review risks" — every at-risk job with real one-click fixes.
 * Client: nudge designer, extend deadline +2d, resolve blocker, open chat/job.
 * Designer: send status update, ask for +2d, start/stop timer, resolve blocker.
 */
export function RiskDrawer({ open, onClose, jobs }: { open: boolean; onClose: () => void; jobs: Job[] }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const mobile = useIsMobile()
  const people = usePeople()
  const fixes = useFixes()
  const startTimer = useApp((s) => s.startTimer)
  const stopTimer = useApp((s) => s.stopTimer)
  const [done, setDone] = useState<Record<string, FixId[]>>({})

  const items = useMemo(
    () =>
      jobs
        .map((job) => ({ job, view: riskView(job, role) }))
        .filter((x) => x.view.level !== 'low')
        .sort((a, b) => RISK_RANK[b.view.level] - RISK_RANK[a.view.level] || b.view.score - a.view.score),
    [jobs, role],
  )

  const mark = (id: string, fix: FixId) => setDone((d) => ({ ...d, [id]: [...(d[id] ?? []), fix] }))
  const isDone = (id: string, fix: FixId) => done[id]?.includes(fix)

  const nudgeAll = () => {
    const todo = items.filter((x) => !isDone(x.job.id, 'nudge'))
    todo.forEach((x) => {
      fixes.nudge(x.job, { silent: true })
      mark(x.job.id, 'nudge')
    })
    toast({ title: t('overview.fix.nudgedAll', { count: todo.length }), tone: 'success', link: '/messages' })
  }

  const header = (
    <div className="relative z-[1] px-5 pb-3 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[19px] font-medium tracking-[-0.02em]">
            <ShieldCheck className="size-5 text-accent-text" />
            {t('overview.drawer.title')}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-3">{t('overview.drawer.sub', { count: items.length })}</p>
        </div>
        <IconButton label={t('core.action.close')} variant="soft" size="sm" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      {role === 'client' && items.length > 1 && (
        <Button size="sm" variant="accent" className="mt-3" icon={<BellRing className="relative z-[1] size-4" />} onClick={nudgeAll} disabled={items.every((x) => isDone(x.job.id, 'nudge'))}>
          <span className="relative z-[1]">{t('overview.drawer.nudgeAll')}</span>
        </Button>
      )}
    </div>
  )

  return (
    <Drawer open={open} onClose={onClose} side={mobile ? 'bottom' : 'right'} width={520} header={header}>
      <div className="px-3 pb-6 sm:px-4">
        {items.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title={t('overview.drawer.emptyTitle')} description={t('overview.drawer.emptyBody')} />
        ) : (
          <motion.ul initial="hidden" animate="show" className="space-y-2.5">
            {items.map(({ job, view }, i) => (
              <RiskItem
                key={job.id}
                i={i}
                job={job}
                view={view}
                person={people.get(role === 'client' ? job.designerId : job.clientId)}
                reason={reasonText(view, t)}
                due={dueLabel(job.dueAt, lang)}
                overdue={daysUntil(job.dueAt) < 0}
              >
                {role === 'client' ? (
                  <>
                    <FixButton tone="primary" icon={<BellRing className="size-3.5" />} done={isDone(job.id, 'nudge')} doneLabel={t('overview.drawer.nudged')} onClick={() => (fixes.nudge(job), mark(job.id, 'nudge'))}>
                      {t('overview.drawer.nudge')}
                    </FixButton>
                    <FixButton icon={<CalendarPlus className="size-3.5" />} done={isDone(job.id, 'extend')} doneLabel={t('overview.drawer.extended')} onClick={() => (fixes.extend(job, 2), mark(job.id, 'extend'))}>
                      {t('overview.drawer.extend')}
                    </FixButton>
                  </>
                ) : (
                  <>
                    <FixButton tone="primary" icon={<MessageSquareText className="size-3.5" />} done={isDone(job.id, 'update')} doneLabel={t('overview.drawer.updated')} onClick={() => (fixes.sendUpdate(job), mark(job.id, 'update'))}>
                      {t('overview.drawer.update')}
                    </FixButton>
                    <FixButton icon={<CalendarPlus className="size-3.5" />} done={isDone(job.id, 'ask')} doneLabel={t('overview.drawer.asked')} onClick={() => (fixes.askExtension(job), mark(job.id, 'ask'))}>
                      {t('overview.drawer.ask')}
                    </FixButton>
                    {job.status !== 'requested' && (
                      <Button
                        size="sm"
                        variant={job.timerStartedAt ? 'primary' : 'soft'}
                        className="h-8 px-3 text-[12.5px]"
                        icon={job.timerStartedAt ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        onClick={() => (job.timerStartedAt ? stopTimer(job.id) : startTimer(job.id))}
                      >
                        {job.timerStartedAt ? t('overview.focus.pause') : t('overview.focus.start')}
                      </Button>
                    )}
                  </>
                )}
                {job.blocker && (
                  <FixButton icon={<CircleSlash2 className="size-3.5" />} done={isDone(job.id, 'unblock')} doneLabel={t('overview.drawer.unblocked')} onClick={() => (fixes.resolveBlocker(job), mark(job.id, 'unblock'))}>
                    {t('overview.drawer.unblock')}
                  </FixButton>
                )}
                <Button size="sm" variant="ghost" className="h-8 px-3 text-[12.5px]" icon={<MessageCircle className="size-3.5" />} onClick={() => (onClose(), fixes.openChat(job))}>
                  {t('overview.drawer.chat')}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-3 text-[12.5px]" icon={<ExternalLink className="size-3.5" />} onClick={() => (onClose(), fixes.openJob(job))}>
                  {t('overview.drawer.job')}
                </Button>
              </RiskItem>
            ))}
          </motion.ul>
        )}
      </div>
    </Drawer>
  )
}

function RiskItem({
  i,
  job,
  view,
  person,
  reason,
  due,
  overdue,
  children,
}: {
  i: number
  job: Job
  view: RiskView
  person: ReturnType<ReturnType<typeof usePeople>['get']>
  reason: string
  due: string
  overdue: boolean
  children: ReactNode
}) {
  return (
    <motion.li custom={i} variants={listItem} className="tile p-3">
      <div className="flex gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-night">
          <MediaView media={coverOf(job)} playBadge={false} className="pointer-events-none" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <MonoId className="text-ink-2">{job.id}</MonoId>
              <RiskBadge level={view.level} className="h-6 px-2.5 text-[11.5px]" />
            </span>
            <span className={cn('inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px]', overdue ? 'text-danger' : 'text-ink-3')}>
              <Timer className="size-3" />
              {due}
            </span>
          </div>
          <p className="mt-1 truncate text-[14.5px] font-medium text-ink">{job.title}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2">
            <PersonAvatar person={person} size={18} />
            <span className="shrink-0 font-medium">{person?.name.split(' ')[0]}</span>
            <span className="text-ink-4">·</span>
            <span className="truncate">{reason}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">{children}</div>
    </motion.li>
  )
}
