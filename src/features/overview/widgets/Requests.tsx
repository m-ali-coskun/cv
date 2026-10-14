import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock, Inbox, MessageCircle, Sparkles, Wand2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { dueLabel, timeAgo, chatTime } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useConversations, type ConversationView } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { useUI } from '@/store/ui'
import type { Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Pill, PriorityBadge } from '@/components/ui/Badge'
import { Menu } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { ts } from '../data'
import { useNow, usePeople } from '../hooks'
import { Card, CardIconTrigger, LinkButton, MonoId, PersonAvatar } from '../ui'

/** Designer: incoming job requests with one-tap Accept / Decline. */
export function RequestsCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const people = usePeople()
  const acceptJob = useApp((s) => s.acceptJob)
  const declineJob = useApp((s) => s.declineJob)
  const spawn = useApp((s) => s.spawnIncomingRequest)
  const [confirm, confirmDialog] = useConfirm()
  const refs = useRef(new Map<string, HTMLElement>())
  useNow(30_000)

  const requests = useMemo(() => jobs.filter((j) => j.status === 'requested').sort((a, b) => ts(b.createdAt) - ts(a.createdAt)), [jobs])
  const value = requests.reduce((a, j) => a + j.budget, 0)
  const currency = requests[0]?.currency ?? 'EUR'

  const accept = (job: Job) => {
    fireConfetti({ from: refs.current.get(job.id), particleCount: 90 })
    acceptJob(job.id)
    toast({ title: t('overview.requests.accepted'), description: `${job.id} · ${job.title}`, tone: 'success', link: `/jobs/${job.id}` })
  }
  const decline = async (job: Job) => {
    const ok = await confirm({
      title: t('overview.requests.declineTitle'),
      description: t('overview.requests.declineBody', { title: job.title }),
      confirmLabel: t('core.action.decline'),
      tone: 'danger',
    })
    if (!ok) return
    declineJob(job.id)
    toast({ title: t('overview.requests.declined'), description: job.title, tone: 'info' })
  }
  const simulate = () => {
    const j = spawn()
    if (j) toast({ title: t('overview.requests.simulated'), description: j.title, tone: 'info', link: `/jobs/${j.id}` })
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      {confirmDialog}
      <CardHeader
        title={t('overview.requests.title')}
        className="z-[5]"
        subtitle={requests.length ? t('overview.requests.sub', { count: requests.length, v: formatMoney(value, currency, lang) }) : t('overview.requests.subEmpty')}
        action={
          <>
            <LinkButton onClick={() => navigate('/requests')}>{t('core.action.viewAll')}</LinkButton>
            <Menu
              width={230}
              trigger={({ onClick, open }) => <CardIconTrigger label={t('core.action.more')} onClick={onClick} open={open} />}
              items={[{ label: t('overview.requests.simulate'), icon: <Wand2 />, onClick: simulate }]}
            />
          </>
        }
      />
      {requests.length === 0 ? (
        <EmptyState
          className="flex-1 py-8"
          icon={<Inbox />}
          title={t('overview.requests.emptyTitle')}
          description={t('overview.requests.emptyBody')}
          action={
            <Button size="sm" variant="soft" icon={<Sparkles className="size-4" />} onClick={simulate}>
              {t('overview.requests.simulate')}
            </Button>
          }
        />
      ) : (
        <ul className="relative z-[1] mt-4 space-y-2">
          <AnimatePresence initial={true} mode="popLayout">
            {requests.slice(0, 4).map((job, i) => {
              const client = people.get(job.clientId)
              return (
                <motion.li
                  key={job.id}
                  layout
                  ref={(el) => {
                    if (el) refs.current.set(job.id, el)
                  }}
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.06, duration: 0.5, ease: [0.23, 1, 0.32, 1] } }}
                  exit={{ opacity: 0, x: 60, scale: 0.95, filter: 'blur(6px)', transition: { duration: 0.3 } }}
                  className="tile p-3 sm:p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <PersonAvatar person={client} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MonoId className="text-ink-3">{job.id}</MonoId>
                        <span className="truncate text-[12px] text-ink-3">· {timeAgo(job.createdAt, lang)}</span>
                      </div>
                      <button type="button" onClick={() => navigate(`/jobs/${job.id}`)} className="block max-w-full truncate text-left text-[14.5px] font-medium text-ink hover:underline">
                        {job.title}
                      </button>
                      <p className="truncate text-[12px] text-ink-3">{client?.name}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[14px] font-medium text-ink">{formatMoney(job.budget, job.currency, lang)}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Pill size="xs" tone="outline" icon={<Clock className="size-3" />}>
                      <span className="font-mono">{dueLabel(job.dueAt, lang)}</span>
                    </Pill>
                    <PriorityBadge priority={job.priority} className="h-5 px-2 text-[11px]" />
                    {job.counterOffer?.status === 'pending' && (
                      <Pill size="xs" tone="info">
                        {t('overview.requests.counterSent')}
                      </Pill>
                    )}
                    <span className="ml-auto flex items-center gap-1.5">
                      <Button size="xs" variant="ghost" icon={<X className="size-3.5" />} onClick={() => decline(job)} disabled={job.counterOffer?.status === 'pending'}>
                        {t('core.action.decline')}
                      </Button>
                      <Button size="xs" icon={<Check className="size-3.5" />} onClick={() => accept(job)} disabled={job.counterOffer?.status === 'pending'}>
                        {t('core.action.accept')}
                      </Button>
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
          {requests.length > 4 && (
            <li className="text-center">
              <Button size="sm" variant="ghost" onClick={() => navigate('/requests')}>
                {t('overview.common.showAll', { n: requests.length })}
              </Button>
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}

/** Latest client messages (designer) — unread first, tap to open the thread. */
export function InboxCard({ className }: { className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const convs = useConversations()
  const people = usePeople()
  const typing = useTypingMap()
  const list = useMemo(() => [...convs].sort((a, b) => b.unread - a.unread || (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? '')).slice(0, 5), [convs])
  const unread = convs.reduce((a, c) => a + c.unread, 0)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.inbox.title')}
        subtitle={unread ? t('overview.inbox.unread', { count: unread }) : t('overview.inbox.allRead')}
        action={<LinkButton onClick={() => navigate('/messages')}>{t('core.action.open')}</LinkButton>}
      />
      {list.length === 0 ? (
        <EmptyState className="flex-1 py-8" icon={<MessageCircle />} title={t('overview.inbox.empty')} />
      ) : (
        <ul className="relative z-[1] mt-3 -mx-1.5">
          {list.map((c, i) => (
            <InboxRow key={c.conversation.id} c={c} i={i} lang={lang} typing={!!typing[c.conversation.id]} person={people.get(c.counterpartId)} typingLabel={t('core.common.typing')} onOpen={() => navigate(`/messages/${c.conversation.id}`)} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function useTypingMap() {
  return useUI((s) => s.typing)
}

function InboxRow({
  c,
  i,
  lang,
  typing,
  typingLabel,
  person,
  onOpen,
}: {
  c: ConversationView
  i: number
  lang: ReturnType<typeof useLang>
  typing: boolean
  typingLabel: string
  person: ReturnType<ReturnType<typeof usePeople>['get']>
  onOpen: () => void
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.1 + i * 0.05, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-[16px] p-1.5 text-left transition-colors hover:bg-[var(--surface-2)]">
        <PersonAvatar person={person} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={cn('truncate text-[13.5px] text-ink', c.unread ? 'font-semibold' : 'font-medium')}>{person?.name ?? '—'}</span>
            <span className="shrink-0 font-mono text-[11px] text-ink-3">{c.last ? chatTime(c.last.createdAt, lang) : ''}</span>
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className={cn('truncate text-[12.5px]', c.unread ? 'text-ink-2' : 'text-ink-3')}>
              {typing ? <span className="text-accent-text">{typingLabel}</span> : c.last?.text || '—'}
            </span>
            {c.unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-ink"
              >
                {c.unread}
              </motion.span>
            )}
          </span>
        </span>
      </button>
    </motion.li>
  )
}

