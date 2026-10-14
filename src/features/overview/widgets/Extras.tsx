import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  CalendarDays,
  Compass,
  FolderOpen,
  ImagePlus,
  Inbox,
  MessageCircle,
  PenLine,
  Sparkles,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { fileToAsset } from '@/lib/files'
import { useLang, useT } from '@/i18n'
import { useApp, meIdFor } from '@/store'
import { useDiscipline, useRole, useUnreadMessages } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { CardHeader } from '@/components/ui/Glass'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { Marquee } from '@/components/ui/Marquee'
import { FolderCard } from '@/components/ui/FolderCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaView } from '@/components/art/MediaView'
import { CLOSED, ts } from '../data'
import { useIsMobile } from '../hooks'
import { Card, LinkButton, listItem } from '../ui'

// ───────────────────────── Quick actions ─────────────────────────

interface Action {
  id: string
  icon: LucideIcon
  label: string
  sub: string
  to: string
  badge?: number
  primary?: boolean
}

export function QuickActionsCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const role = useRole()
  const navigate = useNavigate()
  const unread = useUnreadMessages()
  const invoices = useApp((s) => s.invoices)
  const events = useApp((s) => s.events)

  const actions: Action[] = useMemo(() => {
    const files = jobs.reduce((a, j) => a + j.assets.length + j.versions.reduce((b, v) => b + v.media.length, 0), 0)
    const me = meIdFor(role)
    const dueInvoices = invoices.filter((i) => (role === 'client' ? i.clientId === me : i.designerId === me) && ['pending', 'overdue'].includes(i.status)).length
    const today = new Date().toDateString()
    const todayEvents = events.filter((e) => e.role === role && new Date(e.at).toDateString() === today).length
    const requests = jobs.filter((j) => j.status === 'requested').length
    if (role === 'client')
      return [
        { id: 'brief', icon: PenLine, label: t('overview.quick.brief'), sub: t('overview.quick.briefSub'), to: '/brief/new', primary: true },
        { id: 'discover', icon: Compass, label: t('overview.quick.discover'), sub: t('overview.quick.discoverSub'), to: '/discover' },
        { id: 'messages', icon: MessageCircle, label: t('core.nav.messages'), sub: t('overview.quick.unread', { count: unread }), to: '/messages', badge: unread },
        { id: 'files', icon: FolderOpen, label: t('core.nav.files'), sub: t('overview.quick.files', { count: files }), to: '/files' },
        { id: 'calendar', icon: CalendarDays, label: t('core.nav.calendar'), sub: t('overview.quick.today', { count: todayEvents }), to: '/calendar' },
        { id: 'payments', icon: Wallet, label: t('core.nav.payments'), sub: t('overview.quick.invoices', { count: dueInvoices }), to: '/payments', badge: dueInvoices },
      ]
    return [
      { id: 'requests', icon: Inbox, label: t('core.nav.requests'), sub: t('overview.quick.requests', { count: requests }), to: '/requests', primary: true, badge: requests },
      { id: 'work', icon: ImagePlus, label: t('overview.quick.addWork'), sub: t('overview.quick.addWorkSub'), to: '/profile?add=1' },
      { id: 'messages', icon: MessageCircle, label: t('core.nav.messages'), sub: t('overview.quick.unread', { count: unread }), to: '/messages', badge: unread },
      { id: 'profile', icon: UserRound, label: t('core.nav.profile'), sub: t('overview.quick.profileSub'), to: '/profile' },
      { id: 'calendar', icon: CalendarDays, label: t('core.nav.calendar'), sub: t('overview.quick.today', { count: todayEvents }), to: '/calendar' },
      { id: 'earnings', icon: Wallet, label: t('core.nav.earnings'), sub: t('overview.quick.invoices', { count: dueInvoices }), to: '/payments', badge: dueInvoices },
    ]
  }, [role, jobs, invoices, events, unread, t])

  return (
    <Card className={cn('@container', className)}>
      <CardHeader title={t('overview.quick.title')} subtitle={t('overview.quick.sub')} />
      <motion.div initial="hidden" animate="show" className="relative z-[1] mt-4 grid grid-cols-2 gap-2 @lg:grid-cols-3">
        {actions.map((a, i) => (
          <motion.button
            key={a.id}
            type="button"
            custom={i}
            variants={listItem}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(a.to)}
            className={cn(
              'group/qa relative flex min-h-[96px] min-w-0 flex-col justify-between rounded-[18px] p-3 text-left transition-colors',
              a.primary ? 'bg-night text-on-night' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
            )}
          >
            <span className="flex items-start justify-between">
              <motion.span
                className={cn('flex size-9 items-center justify-center rounded-full', a.primary ? 'bg-accent text-accent-ink' : 'bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgba(0,0,0,.06)]')}
                whileHover={{ rotate: [0, -12, 10, -6, 0], transition: { duration: 0.5 } }}
              >
                <a.icon className="size-4" />
              </motion.span>
              {!!a.badge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.4 + i * 0.05 }}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff6b3d] px-1.5 text-[11px] font-semibold text-white"
                >
                  {a.badge}
                </motion.span>
              )}
            </span>
            <span className="mt-2 block min-w-0">
              <span className="block truncate text-[13.5px] font-medium">{a.label}</span>
              <span className={cn('block truncate text-[11.5px]', a.primary ? 'text-white/55' : 'text-ink-3')}>{a.sub}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>
    </Card>
  )
}

// ───────────────────────── New on designTab (marquee) ─────────────────────────

export function NewOnCard({ className }: { className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const discipline = useDiscipline()
  const navigate = useNavigate()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)

  const fresh = useMemo(() => {
    if (role === 'client') {
      const all = designers.filter((d) => d.isNew && d.id !== 'd-ali')
      const inTab = all.filter((d) => discipline === 'all' || d.disciplines.includes(discipline))
      return (inTab.length >= 3 ? inTab : all).sort((a, b) => ts(b.joinedAt) - ts(a.joinedAt))
    }
    const all = clients.filter((c) => c.isNew && c.id !== 'c-ali')
    const inTab = all.filter((c) => discipline === 'all' || c.disciplinesNeeded.includes(discipline))
    return (inTab.length >= 3 ? inTab : all).sort((a, b) => ts(b.joinedAt) - ts(a.joinedAt))
  }, [role, designers, clients, discipline])

  const covers = useMemo(() => {
    if (role !== 'client') return []
    return designers
      .filter((d) => d.isNew && d.id !== 'd-ali')
      .flatMap((d) => d.portfolio.slice(0, 2).map((p) => ({ id: p.id, cover: p.cover, title: p.title, who: d.name, discipline: p.discipline })))
      .filter((p) => discipline === 'all' || p.discipline === discipline)
      .slice(0, 14)
  }, [designers, role, discipline])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {t('overview.newOn.title')}
            <Pill tone="accent" size="xs" icon={<Sparkles className="size-3" />}>
              {fresh.length}
            </Pill>
          </span>
        }
        subtitle={role === 'client' ? t('overview.newOn.designersSub') : t('overview.newOn.clientsSub')}
        action={<LinkButton onClick={() => navigate('/discover')}>{t('core.nav.discover')}</LinkButton>}
      />
      {fresh.length === 0 ? (
        <EmptyState className="py-6" icon={<Sparkles />} title={t('overview.newOn.empty')} />
      ) : (
        <div className="relative z-[1] -mx-4 mt-4 space-y-3 sm:-mx-5">
          <Marquee speed={34} gap={10} ariaLabel={t('overview.newOn.title')}>
            {fresh.map((p) =>
              'primary' in p ? (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="glass glass-pill flex h-14 shrink-0 items-center gap-2.5 pl-1.5 pr-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Avatar seed={p.avatarSeed} media={p.avatar} size={42} className="relative z-[1]" />
                  <span className="relative z-[1] min-w-0">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                      {p.name}
                      <DisciplineIcon id={p.primary} size={16} />
                    </span>
                    <span className="block max-w-[200px] truncate text-[11.5px] text-ink-3">{p.headline}</span>
                  </span>
                </button>
              ) : (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="glass glass-pill flex h-14 shrink-0 items-center gap-2.5 pl-1.5 pr-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Avatar kind="brand" name={p.name} color={p.logoColor} seed={p.avatarSeed} size={42} className="relative z-[1]" />
                  <span className="relative z-[1] min-w-0">
                    <span className="block text-[13.5px] font-medium text-ink">{p.name}</span>
                    <span className="block max-w-[220px] truncate text-[11.5px] text-ink-3">
                      {p.industry} · {formatMoney(p.budgetRange[1], p.currency, lang, true)}
                    </span>
                  </span>
                </button>
              ),
            )}
          </Marquee>
          {role === 'client' && covers.length > 3 && (
            <Marquee speed={22} gap={10} direction="right" ariaLabel={t('overview.newOn.work')}>
              {covers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="group/cv relative h-[92px] w-[148px] shrink-0 overflow-hidden rounded-[16px] bg-night"
                  title={`${c.title} — ${c.who}`}
                >
                  <MediaView media={c.cover} playBadge={false} className="pointer-events-none transition-transform duration-500 group-hover/cv:scale-110" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] font-medium text-white">{c.who}</span>
                </button>
              ))}
            </Marquee>
          )}
          {role === 'designer' && (
            <Marquee speed={22} gap={10} direction="right" ariaLabel={t('overview.newOn.briefs')}>
              {fresh.flatMap((p) =>
                'openBriefs' in p
                  ? p.openBriefs.map((b, i) => (
                      <button
                        key={`${p.id}-${i}`}
                        type="button"
                        onClick={() => navigate('/discover')}
                        className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--surface-2)] pl-1.5 pr-3.5 text-[12.5px] text-ink transition-colors hover:bg-[var(--surface-3)]"
                      >
                        <DisciplineIcon id={b.discipline} size={28} />
                        <span className="max-w-[220px] truncate font-medium">{b.title}</span>
                        <span className="font-mono text-[11.5px] text-ink-3">{formatMoney(b.budget, p.currency, lang, true)}</span>
                      </button>
                    ))
                  : [],
              )}
            </Marquee>
          )}
        </div>
      )}
    </Card>
  )
}

// ───────────────────────── Job folders ─────────────────────────

export function FoldersCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const role = useRole()
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const addAssets = useApp((s) => s.addAssets)

  const folders = useMemo(
    () =>
      jobs
        .filter((j) => !CLOSED.includes(j.status) && j.status !== 'requested')
        .sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt))
        .slice(0, 4),
    [jobs],
  )

  const onDrop = async (job: Job, files: File[]) => {
    try {
      const assets = await Promise.all(files.map((f) => fileToAsset(f, meIdFor(role))))
      addAssets(job.id, assets)
      toast({ title: t('overview.folders.added', { count: assets.length }), description: job.title, tone: 'success', link: `/jobs/${job.id}` })
    } catch {
      toast({ title: t('core.toast.error'), tone: 'error' })
    }
  }

  return (
    <Card className={className}>
      <CardHeader
        title={t('overview.folders.title')}
        subtitle={t('overview.folders.sub')}
        action={<LinkButton onClick={() => navigate('/files')}>{t('overview.folders.all')}</LinkButton>}
      />
      {folders.length === 0 ? (
        <EmptyState className="py-8" icon={<FolderOpen />} title={t('overview.folders.empty')} />
      ) : (
        <motion.div initial="hidden" animate="show" className="relative z-[1] mt-6 grid grid-cols-2 gap-x-3 gap-y-6 pb-1 pt-6 lg:grid-cols-4">
          {folders.map((j, i) => {
            const media = [...(j.versions[j.versions.length - 1]?.media ?? []), ...j.assets.filter((a) => a.kind === 'image' || a.kind === 'video').map((a) => a.media), j.cover]
            const count = j.assets.length + j.versions.reduce((a, v) => a + v.media.length, 0)
            return (
              <motion.div key={j.id} custom={i} variants={listItem} className="flex justify-center">
                <FolderCard
                  items={media.slice(0, 3)}
                  title={j.title}
                  subtitle={t('overview.folders.files', { count })}
                  color={disciplineTheme(j.discipline).accent}
                  icon={<DisciplineIcon id={j.discipline} size={mobile ? 18 : 22} />}
                  size={mobile ? 'sm' : 'md'}
                  onClick={() => navigate(`/jobs/${j.id}`)}
                  onFilesDrop={(files) => onDrop(j, files)}
                  ariaLabel={`${j.id} ${j.title}`}
                />
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </Card>
  )
}
