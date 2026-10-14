import { useMemo } from 'react'
import {
  ArrowUpRight,
  Ban,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  Hourglass,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import type { Job, Role } from '@/store/types'
import { Popover, PopMenu, type PopItem } from './Popover'
import { useJobCommands, useStartFlow } from './flows'
import { isClosed } from './model'

/** Context-aware actions for a job, for the active role and status. */
export function useJobMenuItems(job: Job, role: Role, name?: string): PopItem[] {
  const t = useT()
  const cmd = useJobCommands()
  const flow = useStartFlow()
  return useMemo(() => {
    const items: PopItem[] = [
      { key: 'open', label: t('jobs.menu.open'), icon: <ArrowUpRight />, onSelect: () => cmd.open(job), hint: '↵' },
      { key: 'msg', label: name ? t('jobs.menu.messageName', { name: name.split(' ')[0]! }) : t('core.action.message'), icon: <MessageCircle />, onSelect: () => cmd.message(job) },
      { key: 'link', label: t('jobs.menu.copyLink'), icon: <Link2 />, onSelect: () => void cmd.copyLink(job) },
      { key: 'star', label: t(job.starred ? 'jobs.menu.unstar' : 'jobs.menu.star'), icon: <Star className={cn(job.starred && 'fill-current text-[#FFB21E]')} />, onSelect: () => cmd.star(job) },
    ]
    const next: PopItem[] = []
    const s = job.status
    const counterPending = job.counterOffer?.status === 'pending'
    if (role === 'designer') {
      if (s === 'requested' && counterPending) next.push({ key: 'wait', label: t('jobs.menu.waitingClient'), icon: <Hourglass />, disabled: true })
      else if (s === 'requested') {
        next.push({ key: 'accept', label: t('jobs.menu.accept'), icon: <Check />, onSelect: () => cmd.accept(job) })
        next.push({ key: 'counter', label: t('jobs.menu.counter'), icon: <CalendarClock />, onSelect: () => flow('counter', job) })
        next.push({ key: 'decline', label: t('jobs.menu.decline'), icon: <X />, onSelect: () => flow('decline', job), danger: true })
      }
      if (s === 'queued') next.push({ key: 'start', label: t('jobs.menu.start'), icon: <Play />, onSelect: () => cmd.move(job, 'in_progress') })
      if (s === 'revisions') next.push({ key: 'resume', label: t('jobs.menu.resume'), icon: <RotateCcw />, onSelect: () => cmd.move(job, 'in_progress') })
      if (s === 'in_progress') next.push({ key: 'final', label: t('jobs.menu.final'), icon: <Sparkles />, onSelect: () => cmd.move(job, 'final_touches') })
      if (s === 'in_progress' || s === 'final_touches' || s === 'revisions')
        next.push({ key: 'deliver', label: t('jobs.menu.deliver'), icon: <Send />, onSelect: () => flow('deliver', job) })
    } else {
      if (s === 'in_review') {
        next.push({ key: 'approve', label: t('jobs.menu.approve'), icon: <BadgeCheck />, onSelect: () => flow('approve', job) })
        next.push({ key: 'revise', label: t('jobs.menu.revise'), icon: <RotateCcw />, onSelect: () => flow('revision', job) })
      }
      if (s === 'requested' && counterPending) {
        next.push({ key: 'cyes', label: t('jobs.menu.acceptDate'), icon: <CalendarCheck />, onSelect: () => cmd.answerCounter(job, true) })
        next.push({ key: 'cno', label: t('jobs.menu.keepDate'), icon: <CalendarX />, onSelect: () => cmd.answerCounter(job, false) })
      }
    }
    if (next.length) items.push({ divider: true }, { section: t('jobs.menu.nextStep') }, ...next)
    const canCancel = !isClosed(job.status) && !(role === 'designer' && job.status === 'requested')
    if (canCancel) items.push({ divider: true }, { key: 'cancel', label: t('jobs.menu.cancel'), icon: <Ban />, danger: true, onSelect: () => flow('cancel', job) })
    return items
  }, [job, role, name, t, cmd, flow])
}

/** "…" quick menu for a job (portal popover, never clipped). */
export function JobMenu({ job, role, name, className, tone = 'glass' }: { job: Job; role: Role; name?: string; className?: string; tone?: 'glass' | 'ghost' }) {
  const t = useT()
  const items = useJobMenuItems(job, role, name)
  return (
    <Popover
      width={236}
      trigger={({ ref, onClick, open, ...aria }) => (
        <button
          ref={ref}
          type="button"
          aria-label={t('jobs.menu.label')}
          title={t('jobs.menu.label')}
          {...aria}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-200 active:scale-90',
            tone === 'glass'
              ? 'bg-white/75 text-[#0b0b0c] shadow-[0_2px_8px_-2px_rgba(0,0,0,.25)] backdrop-blur-md hover:bg-white'
              : 'text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink',
            open && (tone === 'glass' ? 'bg-white' : 'bg-[var(--surface-2)] text-ink'),
            className,
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}
    >
      {(close) => <PopMenu items={items} close={close} />}
    </Popover>
  )
}
