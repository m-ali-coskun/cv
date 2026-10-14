import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRightLeft,
  BadgeCheck,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  FilePlus2,
  History,
  MessageSquare,
  PackageCheck,
  Paperclip,
  RotateCcw,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import type { Job, TimelineKind } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Menu } from '@/components/ui/Menu'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Badge'
import { useActivity, useMediaQuery, useNow, usePeople } from '../hooks'
import { Card, CardIconTrigger, MonoId, PersonAvatar } from '../ui'

const ICON: Record<TimelineKind, { icon: LucideIcon; color: string }> = {
  created: { icon: FilePlus2, color: 'var(--info)' },
  accepted: { icon: CheckCircle2, color: 'var(--success)' },
  declined: { icon: XCircle, color: 'var(--ink-3)' },
  status: { icon: ArrowRightLeft, color: 'var(--accent-strong)' },
  asset: { icon: Paperclip, color: 'var(--ink-2)' },
  delivery: { icon: PackageCheck, color: 'var(--accent-strong)' },
  revision: { icon: RotateCcw, color: '#f97316' },
  approved: { icon: BadgeCheck, color: 'var(--success)' },
  deadline: { icon: CalendarClock, color: 'var(--warning)' },
  comment: { icon: MessageSquare, color: 'var(--info)' },
  payment: { icon: Wallet, color: 'var(--success)' },
  counter: { icon: CalendarRange, color: 'var(--warning)' },
}

type Filter = 'all' | 'work' | 'files' | 'feedback' | 'money'
const GROUPS: Record<Exclude<Filter, 'all'>, TimelineKind[]> = {
  work: ['created', 'accepted', 'declined', 'status', 'counter', 'deadline'],
  files: ['asset', 'delivery'],
  feedback: ['revision', 'comment', 'approved'],
  money: ['payment'],
}

/** Live activity across my jobs — new simulation events slide in on top. */
export function ActivityCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const people = usePeople()
  const all = useActivity(jobs, 80)
  const [filter, setFilter] = useState<Filter>('all')
  const wide = useMediaQuery('(min-width: 1280px)')
  const base = wide ? 11 : 6
  const [extra, setExtra] = useState(0)
  const limit = base + extra
  useNow(30_000)

  const items = useMemo(() => (filter === 'all' ? all : all.filter((a) => GROUPS[filter].includes(a.event.kind))), [all, filter])
  const shown = items.slice(0, limit)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.activity.title')}
        subtitle={t('overview.activity.sub', { count: items.length })}
        className="z-[5]"
        action={
          <>
            {filter !== 'all' && (
              <Pill tone="accent" size="xs" className="hidden sm:inline-flex">
                {t(`overview.activity.f.${filter}`)}
              </Pill>
            )}
            <Menu
              width={200}
              trigger={({ onClick, open }) => <CardIconTrigger kind="filter" label={t('core.action.filter')} onClick={onClick} open={open} active={filter !== 'all'} />}
              items={(['all', 'work', 'files', 'feedback', 'money'] as Filter[]).map((f) => ({
                label: t(`overview.activity.f.${f}`),
                active: filter === f,
                onClick: () => {
                  setFilter(f)
                  setExtra(0)
                },
              }))}
            />
          </>
        }
      />
      {shown.length === 0 ? (
        <EmptyState className="flex-1 py-10" icon={<History />} title={t('overview.activity.empty')} description={t('overview.activity.emptyBody')} />
      ) : (
        <ol className="relative z-[1] mt-4 flex-1">
          {/* rail */}
          <span aria-hidden className="absolute bottom-4 left-[17px] top-4 w-px bg-[linear-gradient(var(--line-2),transparent)]" />
          <AnimatePresence initial={true}>
            {shown.map(({ event, job }, i) => {
              const actor = people.get(event.actorId)
              const meta = ICON[event.kind] ?? ICON.status
              const Icon = meta.icon
              return (
                <motion.li
                  key={event.id}
                  layout="position"
                  initial={{ opacity: 0, y: -14, filter: 'blur(6px)', scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, transition: { delay: Math.min(i, 8) * 0.04, duration: 0.5, ease: [0.23, 1, 0.32, 1] } }}
                  exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="group/act flex w-full items-start gap-3 rounded-[16px] px-0.5 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <span className="relative shrink-0">
                      <PersonAvatar person={actor} size={34} />
                      <span
                        className="absolute -bottom-1 -right-1 flex size-[18px] items-center justify-center rounded-full border-2 border-[var(--surface)] text-white"
                        style={{ background: meta.color }}
                      >
                        <Icon className="size-2.5" strokeWidth={2.6} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[13.5px] leading-snug text-ink">
                        <span className="font-medium">{actor?.name.split(' ')[0] ?? t('overview.activity.someone')}</span>{' '}
                        <span className="text-ink-2">{/^[A-Z][a-z]/.test(event.text) ? event.text.charAt(0).toLowerCase() + event.text.slice(1) : event.text}</span>
                      </span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-3">
                        <MonoId className="shrink-0 text-[11px]">{job.id}</MonoId>
                        <span className="truncate">{job.title}</span>
                        <span className="ml-auto shrink-0 font-mono">{timeAgo(event.at, lang)}</span>
                      </span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
      {items.length > limit && (
        <div className="relative z-[1] mt-2 flex justify-center">
          <Button size="sm" variant="ghost" onClick={() => setExtra((l) => l + 8)}>
            {t('overview.common.showMore')}
          </Button>
        </div>
      )}
    </Card>
  )
}
