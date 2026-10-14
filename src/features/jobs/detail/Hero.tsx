import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileDown,
  Link2,
  MessageCircle,
  MoreHorizontal,
  ReceiptText,
  Star,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { fmt, shortDate, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { jobRisk } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, ME_DESIGNER_ID } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { DisciplineBadge, PriorityBadge, RiskBadge, StatusBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { ProgressBar } from '@/components/ui/Progress'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Tooltip } from '@/components/ui/Tooltip'
import { useJobCtx } from './context'
import { useCopy, useNow } from './hooks'
import { briefMarkdown, countdown, downloadBlob, isClosed } from './model'
import { Card, LiveDot, PersonAvatar, RollingText } from './ui'

const onCover = 'bg-white/80 text-[#0b0b0c] shadow-[inset_0_1px_0_#fff,0_8px_20px_-10px_rgba(0,0,0,.45)] backdrop-blur-xl hover:bg-white'

export function Hero() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { search } = useLocation()
  const { job, side, canAct, counterpart, client, designer, openModal, setTab } = useJobCtx()
  const jobs = useApp((s) => s.jobs)
  const toggleStar = useApp((s) => s.toggleStar)
  const createInvoice = useApp((s) => s.createInvoice)
  const ensureConversation = useApp((s) => s.ensureConversation)
  const copy = useCopy()
  const [copied, setCopied] = useState(false)
  const closed = isClosed(job.status)
  const risk = jobRisk(job)

  // prev / next among the jobs on the same side
  const siblings = useMemo(
    () => jobs.filter((j) => (side === 'client' ? j.clientId === ME_CLIENT_ID : j.designerId === ME_DESIGNER_ID)).map((j) => j.id),
    [jobs, side],
  )
  const idx = siblings.indexOf(job.id)
  const go = (d: number) => {
    if (!siblings.length) return
    const next = siblings[(idx + d + siblings.length) % siblings.length]
    navigate(`/jobs/${next}${search}`)
  }

  const link = `${window.location.origin}${window.location.pathname}#/jobs/${job.id}`
  const copyLink = () => {
    copy(link, t('job.hero.linkCopied'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  const openChat = () => {
    const conv = job.conversationId ?? ensureConversation(job.clientId, job.designerId)
    navigate(`/messages/${conv}`)
  }
  const downloadBrief = () => {
    const md = briefMarkdown(
      job,
      { client: client?.name ?? job.clientId, designer: designer?.name ?? job.designerId },
      formatMoney(job.budget, job.currency, lang),
      fmt(job.dueAt, 'PPP', lang),
    )
    downloadBlob(new Blob([md], { type: 'text/markdown' }), `${job.id}-brief.md`)
    toast({ title: t('job.hero.briefDownloaded'), description: `${job.id}-brief.md`, tone: 'success' })
  }
  const invoice = () => {
    const inv = createInvoice(job.id)
    if (inv) toast({ title: t('job.hero.invoiceCreated', { id: inv.id }), description: formatMoney(inv.amount, inv.currency, lang), tone: 'success', link: '/payments' })
  }

  const items: MenuItem[] = [
    { label: t('job.hero.copyLink'), icon: <Link2 />, onClick: copyLink },
    { label: t('job.hero.message'), icon: <MessageCircle />, onClick: openChat },
    { label: t('job.hero.schedule'), icon: <CalendarPlus />, onClick: () => openModal('schedule'), disabled: !canAct },
    { label: t('job.hero.downloadBrief'), icon: <FileDown />, onClick: downloadBrief },
    { label: t('job.hero.createInvoice'), icon: <ReceiptText />, onClick: invoice, disabled: !canAct || job.status === 'declined' || job.status === 'cancelled' },
    ...(canAct && !closed
      ? [{ divider: true, label: '' } as MenuItem, { label: t('job.hero.cancel'), icon: <XCircle />, danger: true, onClick: () => openModal('cancel') }]
      : []),
  ]

  const latest = job.versions[job.versions.length - 1]
  const poster = latest?.media[0] ?? job.cover

  return (
    <Card pad={false} className="overflow-hidden p-2 sm:p-2.5">
      <div className="relative isolate overflow-hidden rounded-[22px] bg-night">
        {/* blurred, slowly breathing cover art */}
        <motion.div
          aria-hidden
          className="absolute -inset-[14%] will-change-transform"
          animate={{ scale: [1.04, 1.16, 1.04], x: ['0%', '3%', '0%'], rotate: [0, 2, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MediaView media={job.cover} className="size-full scale-110 blur-[26px] saturate-[1.4]" playBadge={false} />
        </motion.div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.05)_40%,rgba(0,0,0,.35))]" />
        <div aria-hidden className="absolute inset-0 opacity-30 mix-blend-overlay dot-grid" />

        <div className="relative z-[1] flex flex-col gap-4 p-3 sm:p-4 lg:p-5">
          {/* top bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <motion.button
                type="button"
                onClick={() => navigate(side === 'designer' && job.status === 'requested' ? '/requests' : '/jobs')}
                whileTap={{ scale: 0.95 }}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-full pl-2.5 pr-3.5 text-[13px] font-medium transition-colors', onCover)}
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">{t(side === 'designer' && job.status === 'requested' ? 'core.nav.requests' : 'core.nav.jobs')}</span>
              </motion.button>
              <Tooltip content={t('job.hero.copyLink')} side="bottom">
                <motion.button
                  type="button"
                  onClick={copyLink}
                  whileTap={{ scale: 0.95 }}
                  className={cn('inline-flex h-9 items-center gap-2 rounded-full px-3.5 font-mono text-[13px] font-medium tabular-nums transition-colors', onCover)}
                  aria-label={t('job.hero.copyLink')}
                >
                  {job.id}
                  <span className="relative size-3.5">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={copied ? 'ok' : 'copy'}
                        className="absolute inset-0"
                        initial={{ scale: 0.3, opacity: 0, rotate: -40 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={spring.bouncy}
                      >
                        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 opacity-60" />}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </motion.button>
              </Tooltip>
              <LiveBadge updatedAt={job.updatedAt} />
            </div>
            <div className="flex items-center gap-1.5">
              {siblings.length > 1 && (
                <div className="hidden items-center gap-1 sm:flex">
                  <IconButton label={t('job.hero.prev')} size="sm" variant="ghost" className={onCover} onClick={() => go(-1)}>
                    <ChevronLeft className="size-4" />
                  </IconButton>
                  <span className="min-w-12 text-center font-mono text-[11.5px] text-white/85 tabular-nums">
                    {idx + 1}/{siblings.length}
                  </span>
                  <IconButton label={t('job.hero.next')} size="sm" variant="ghost" className={onCover} onClick={() => go(1)}>
                    <ChevronRight className="size-4" />
                  </IconButton>
                </div>
              )}
              <StarButton starred={job.starred} onToggle={() => toggleStar(job.id)} label={t(job.starred ? 'job.hero.unstar' : 'job.hero.star')} />
              <Menu
                width={236}
                items={items}
                trigger={({ onClick, open }) => (
                  <IconButton label={t('core.action.more')} size="md" variant="ghost" className={cn(onCover, open && 'bg-white')} onClick={onClick}>
                    <MoreHorizontal className="size-4.5" />
                  </IconButton>
                )}
              />
            </div>
          </div>

          <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(250px,300px)] lg:gap-4">
            {/* main glass panel */}
            <motion.div
              className="glass glass-strong min-w-0 rounded-[24px] p-4 sm:p-5"
              initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.08 }}
            >
              <div className="relative z-[1]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={job.status} initial={{ opacity: 0, scale: 0.7, filter: 'blur(4px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.7 }} transition={spring.bouncy}>
                      <StatusBadge status={job.status} className="h-7 px-3" />
                    </motion.span>
                  </AnimatePresence>
                  <PriorityBadge priority={job.priority} />
                  <DisciplineBadge id={job.discipline} />
                  {!closed && risk.level !== 'low' && (
                    <Tooltip content={risk.reason}>
                      <RiskBadge level={risk.level} className="gap-1" />
                    </Tooltip>
                  )}
                </div>
                <h2 className="mt-3 text-balance text-[24px] font-medium leading-[1.08] tracking-[-0.035em] text-ink sm:text-[32px]">{job.title}</h2>
                <p className="mt-2 line-clamp-2 max-w-3xl text-[14px] leading-relaxed text-ink-2">{job.summary}</p>

                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={job.progress} className="flex-1" height={8} />
                  <span className="w-12 text-right text-[14px] font-medium">
                    <AnimatedCounter value={job.progress} suffix="%" startOnView={false} />
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-line bg-[var(--line)] sm:grid-cols-4">
                  <Cell label={t(side === 'client' ? 'core.common.designer' : 'core.common.client')}>
                    <button
                      type="button"
                      onClick={() => counterpart && navigate(`/network/${counterpart.id}`)}
                      className="group/cp flex min-w-0 items-center gap-2 text-left"
                    >
                      <PersonAvatar person={counterpart} size={22} />
                      <span className="truncate underline-offset-4 group-hover/cp:underline">{counterpart?.name ?? '—'}</span>
                    </button>
                  </Cell>
                  <Cell label={t('core.common.budget')}>
                    <AnimatedCounter value={job.budget} currency={job.currency} startOnView={false} />
                  </Cell>
                  <Cell label={t('job.hero.created')} sub={timeAgo(job.createdAt, lang)}>
                    <span className="font-mono text-[14px]">{shortDate(job.createdAt, lang)}</span>
                  </Cell>
                  <Cell label={t('core.common.due')} sub={fmt(job.dueAt, 'EEE · HH:mm', lang)}>
                    <span className="font-mono text-[14px]">{shortDate(job.dueAt, lang)}</span>
                  </Cell>
                </div>
              </div>
            </motion.div>

            {/* right column: poster + live countdown */}
            <div className="flex min-w-0 flex-col gap-3">
              <motion.button
                type="button"
                onClick={() => setTab(latest ? 'deliveries' : 'assets')}
                className="group/poster relative hidden aspect-[4/3] w-full overflow-hidden rounded-[22px] shadow-[0_24px_50px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/25 lg:block"
                initial={{ opacity: 0, rotate: 4, y: 20, scale: 0.94 }}
                animate={{ opacity: 1, rotate: 0, y: 0, scale: 1 }}
                whileHover={{ rotate: -1.5, scale: 1.02, y: -4 }}
                transition={spring.smooth}
              >
                <MediaView media={poster} className="transition-transform duration-700 ease-[var(--ease-out)] group-hover/poster:scale-[1.06]" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.65))] px-3.5 pb-3 pt-8 text-left text-[12.5px] font-medium text-white">
                  <span className="truncate">{latest ? t('job.hero.latestDelivery', { n: latest.version }) : t('job.hero.cover')}</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 font-mono text-[11px] backdrop-blur">{latest ? `v${latest.version}` : job.discipline}</span>
                </span>
              </motion.button>
              <Countdown />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Cell({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] px-3.5 py-3">
      <div className="truncate text-[11.5px] text-ink-3">{label}</div>
      <div className="mt-1 truncate text-[15px] font-medium tracking-[-0.01em] text-ink">{children}</div>
      {sub && <div className="mt-0.5 truncate font-mono text-[11px] text-ink-3">{sub}</div>}
    </div>
  )
}

/** Live due countdown — ticks every second, turns red when overdue. */
function Countdown() {
  const t = useT()
  const lang = useLang()
  const { job } = useJobCtx()
  const closed = job.status === 'approved' || job.status === 'declined' || job.status === 'cancelled'
  const now = useNow(1000, !closed)
  const c = countdown(job.dueAt, now)
  const total = new Date(job.dueAt).getTime() - new Date(job.createdAt).getTime()
  const elapsed = Math.min(1, Math.max(0, (now - new Date(job.createdAt).getTime()) / (total || 1)))

  if (closed) {
    const at = job.status === 'approved' ? (job.approvedAt ?? job.updatedAt) : job.updatedAt
    return (
      <div className={cn('rounded-[22px] p-4', job.status === 'approved' ? 'glass-accent' : 'glass-night')}>
        <div className="relative z-[1]">
          <div className="text-[12px] font-medium opacity-70">{t(`job.hero.closed.${job.status}`)}</div>
          <div className="mt-1.5 text-[26px] font-medium tracking-[-0.03em]">{shortDate(at, lang)}</div>
          <div className="mt-0.5 font-mono text-[11.5px] opacity-70">
            {t('job.hero.wasDue', { date: shortDate(job.dueAt, lang) })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={cn('relative overflow-hidden rounded-[22px] p-4', c.overdue ? 'bg-danger text-white shadow-[0_18px_40px_-16px_var(--danger)]' : 'glass-night')}
      animate={c.overdue ? { scale: [1, 1.012, 1] } : { scale: 1 }}
      transition={c.overdue ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-2 text-[12px] font-medium opacity-80">
          <span>{t(c.overdue ? 'job.hero.overdueBy' : 'job.hero.dueIn')}</span>
          <LiveDot color={c.overdue ? '#fff' : c.urgent ? 'var(--warning)' : 'var(--accent)'} />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 text-[30px] font-medium leading-none tracking-[-0.02em] sm:text-[32px]">
          <RollingText value={String(c.days)} />
          <span className="text-[13px] font-medium opacity-60">{t('job.hero.daysShort')}</span>
          <RollingText value={c.clock} className="ml-1" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full"
            style={{ background: c.overdue ? '#fff' : 'var(--accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(elapsed * 100)}%` }}
            transition={{ duration: 1.2, ease: EASE_OUT }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] opacity-70">
          <span>{fmt(job.dueAt, 'EEE d MMM · HH:mm', lang)}</span>
          <span>{t('job.hero.elapsed', { pct: Math.round(elapsed * 100) })}</span>
        </div>
      </div>
    </motion.div>
  )
}

function StarButton({ starred, onToggle, label }: { starred: boolean; onToggle: () => void; label: string }) {
  const [burst, setBurst] = useState(0)
  return (
    <IconButton
      label={label}
      size="md"
      variant="ghost"
      className={onCover}
      onClick={() => {
        if (!starred) setBurst((b) => b + 1)
        onToggle()
      }}
      aria-pressed={starred}
    >
      <motion.span animate={starred ? { scale: [1, 1.45, 1], rotate: [0, -18, 0] } : { scale: 1 }} transition={{ duration: 0.45, ease: EASE_OUT }} className="relative">
        <Star className={cn('size-4.5 transition-colors', starred ? 'fill-[#FFB21E] text-[#FFB21E]' : 'text-[#0b0b0c]')} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 size-1.5 rounded-full bg-[#FFB21E]"
                initial={{ x: '-50%', y: '-50%', scale: 1 }}
                animate={{ x: `calc(-50% + ${Math.cos((i / 6) * Math.PI * 2) * 22}px)`, y: `calc(-50% + ${Math.sin((i / 6) * Math.PI * 2) * 22}px)`, scale: 0 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </IconButton>
  )
}

/** "Live" pill that flashes "Updated" whenever the job changes (simulation or you). */
function LiveBadge({ updatedAt }: { updatedAt: string }) {
  const t = useT()
  const first = useRef(true)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setFlash(true)
    const id = window.setTimeout(() => setFlash(false), 2400)
    return () => window.clearTimeout(id)
  }, [updatedAt])
  return (
    <motion.span
      layout
      className={cn(
        'hidden h-9 items-center gap-2 rounded-full px-3 text-[12px] font-medium backdrop-blur-xl transition-colors duration-300 sm:inline-flex',
        flash ? 'bg-accent text-accent-ink' : 'bg-black/30 text-white',
      )}
      transition={spring.snappy}
    >
      <LiveDot color={flash ? 'var(--accent-ink)' : 'var(--accent)'} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={flash ? 'u' : 'l'} initial={{ y: 8, opacity: 0, filter: 'blur(3px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ y: -8, opacity: 0 }}>
          {flash ? t('job.hero.updated') : t('job.hero.live')}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  )
}

export function NotMineBanner() {
  const t = useT()
  const { job, side } = useJobCtx()
  const setRole = useApp((s) => s.setRole)
  const mine = job.clientId === ME_CLIENT_ID || job.designerId === ME_DESIGNER_ID
  return (
    <Card variant="accent" className="flex flex-wrap items-center justify-between gap-3 py-3.5 sm:py-3.5">
      <div className="relative z-[1] min-w-0 text-[14px] font-medium">
        {mine ? t('job.notMine.body', { role: t(side === 'client' ? 'core.role.clientWorkspace' : 'core.role.designerStudio') }) : t('job.notMine.readOnly')}
      </div>
      {mine && (
        <Button size="sm" className="relative z-[1]" onClick={() => setRole(side)}>
          {t('job.notMine.switch')}
        </Button>
      )}
    </Card>
  )
}
