import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, MessageCircle, PenLine, Star, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useDiscipline, useMyMatches, useRole } from '@/store/selectors'
import type { Availability, Client, Designer, Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Avatar } from '@/components/ui/Avatar'
import { Button, IconButton } from '@/components/ui/Button'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CLOSED } from '../data'
import { Card, listItem } from '../ui'

const AVAIL: Record<Availability, 'online' | 'away' | 'offline'> = { available: 'online', limited: 'away', booked: 'offline' }

/**
 * "Your designers" (client) / "Your clients" (designer): matched people and
 * people you already work with, with availability and one-tap actions.
 */
export function PeopleCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const discipline = useDiscipline()
  const navigate = useNavigate()
  const matches = useMyMatches()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const ensureConversation = useApp((s) => s.ensureConversation)
  const scroller = useRef<HTMLDivElement>(null)

  const people = useMemo(() => {
    const live = jobs.filter((j) => !CLOSED.includes(j.status))
    const activeWith = (id: string) => live.filter((j) => (role === 'client' ? j.designerId : j.clientId) === id).length
    const doneWith = (id: string) => jobs.filter((j) => j.status === 'approved' && (role === 'client' ? j.designerId : j.clientId) === id).length
    const ids = new Set<string>([
      ...matches.map((m) => (role === 'client' ? m.match.designerId : m.match.clientId)),
      ...jobs.map((j) => (role === 'client' ? j.designerId : j.clientId)),
    ])
    if (role === 'client') {
      return designers
        .filter((d) => ids.has(d.id) && d.id !== 'd-ali' && (discipline === 'all' || d.disciplines.includes(discipline)))
        .map((d) => ({ kind: 'designer' as const, d, active: activeWith(d.id), done: doneWith(d.id) }))
        .sort((a, b) => b.active - a.active || b.done - a.done || b.d.rating - a.d.rating)
    }
    return clients
      .filter((c) => ids.has(c.id) && c.id !== 'c-ali' && (discipline === 'all' || c.disciplinesNeeded.includes(discipline) || jobs.some((j) => j.clientId === c.id)))
      .map((c) => ({ kind: 'client' as const, c, active: activeWith(c.id), done: doneWith(c.id) }))
      .sort((a, b) => b.active - a.active || b.done - a.done)
  }, [matches, jobs, designers, clients, role, discipline])

  const scroll = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 260, behavior: 'smooth' })
  const message = (clientId: string, designerId: string) => navigate(`/messages/${ensureConversation(clientId, designerId)}`)

  return (
    <Card className={className}>
      <CardHeader
        title={role === 'client' ? t('overview.people.designers') : t('overview.people.clients')}
        subtitle={t('overview.people.sub', { count: people.length })}
        action={
          <>
            <IconButton label={t('core.action.back')} variant="soft" size="sm" onClick={() => scroll(-1)} className="hidden sm:inline-flex">
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton label={t('core.action.next')} variant="soft" size="sm" onClick={() => scroll(1)} className="hidden sm:inline-flex">
              <ChevronRight className="size-4" />
            </IconButton>
            <Button size="sm" variant="soft" onClick={() => navigate(role === 'client' ? '/discover' : '/network')}>
              {role === 'client' ? t('overview.people.findMore') : t('overview.people.network')}
            </Button>
          </>
        }
      />
      {people.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<Users />}
          title={t('overview.people.empty')}
          description={t('overview.people.emptyBody')}
          action={
            <Button size="sm" onClick={() => navigate('/discover')}>
              {t('core.nav.discover')}
            </Button>
          }
        />
      ) : (
        <motion.div
          ref={scroller}
          initial="hidden"
          animate="show"
          className="relative z-[1] -mx-1 mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {people.map((p, i) =>
            p.kind === 'designer' ? (
              <DesignerTile
                key={p.d.id}
                i={i}
                d={p.d}
                active={p.active}
                done={p.done}
                rate={formatMoney(p.d.hourlyRate, p.d.currency, lang)}
                onOpen={() => navigate(`/network/${p.d.id}`)}
                onBrief={() => navigate(`/brief/new?designer=${p.d.id}`)}
                onMessage={() => message('c-ali', p.d.id)}
              />
            ) : (
              <ClientTile
                key={p.c.id}
                i={i}
                c={p.c}
                active={p.active}
                done={p.done}
                budget={`${formatMoney(p.c.budgetRange[0], p.c.currency, lang, true)}–${formatMoney(p.c.budgetRange[1], p.c.currency, lang, true)}`}
                onOpen={() => navigate(`/network/${p.c.id}`)}
                onMessage={() => message(p.c.id, 'd-ali')}
              />
            ),
          )}
        </motion.div>
      )}
    </Card>
  )
}

function TileShell({ i, children, onOpen }: { i: number; children: React.ReactNode; onOpen: () => void }) {
  return (
    <motion.div
      custom={i}
      variants={listItem}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      onClick={onOpen}
      className="tile group/p flex w-[228px] shrink-0 cursor-pointer snap-start flex-col p-3.5 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,.35)]"
    >
      {children}
    </motion.div>
  )
}

function DesignerTile({ i, d, active, done, rate, onOpen, onBrief, onMessage }: { i: number; d: Designer; active: number; done: number; rate: string; onOpen: () => void; onBrief: () => void; onMessage: () => void }) {
  const t = useT()
  return (
    <TileShell i={i} onOpen={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <motion.span whileHover={{ rotate: -6, scale: 1.06 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
          <Avatar seed={d.avatarSeed} media={d.avatar} size={48} status={AVAIL[d.availability]} />
        </motion.span>
        <DisciplineIcon id={d.primary} size={24} />
      </div>
      <p className="mt-2.5 truncate text-[14.5px] font-medium text-ink">{d.name}</p>
      <p className="line-clamp-2 min-h-[2.5em] text-[12px] leading-snug text-ink-3">{d.headline}</p>
      <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-0.5 font-medium">
          <Star className="size-3.5 fill-[var(--warning)] text-[var(--warning)]" />
          {d.rating.toFixed(1)}
        </span>
        <span className="text-ink-4">·</span>
        <span className="font-mono text-[11.5px]">{t('overview.people.rate', { v: rate })}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Pill size="xs" tone={d.availability === 'available' ? 'success' : d.availability === 'limited' ? 'warning' : 'neutral'}>
          {t(`core.availability.${d.availability}`)}
        </Pill>
        {active > 0 && (
          <Pill size="xs" tone="accent">
            {t('overview.people.active', { count: active })}
          </Pill>
        )}
        {active === 0 && done > 0 && (
          <Pill size="xs" tone="outline">
            {t('overview.people.done', { count: done })}
          </Pill>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button size="xs" icon={<PenLine className="size-3.5" />} onClick={onBrief} className="flex-1">
          {t('overview.people.brief')}
        </Button>
        <IconButton label={t('core.action.message')} variant="soft" size="sm" onClick={onMessage}>
          <MessageCircle className="size-3.5" />
        </IconButton>
      </div>
    </TileShell>
  )
}

function ClientTile({ i, c, active, done, budget, onOpen, onMessage }: { i: number; c: Client; active: number; done: number; budget: string; onOpen: () => void; onMessage: () => void }) {
  const t = useT()
  return (
    <TileShell i={i} onOpen={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <Avatar kind="brand" name={c.name} color={c.logoColor} seed={c.avatarSeed} size={48} />
        {c.paymentVerified && (
          <Pill size="xs" tone="success">
            {t('core.common.verified')}
          </Pill>
        )}
      </div>
      <p className="mt-2.5 truncate text-[14.5px] font-medium text-ink">{c.name}</p>
      <p className="truncate text-[12px] text-ink-3">
        {c.contactName} · {c.industry}
      </p>
      <p className="mt-2 font-mono text-[11.5px] text-ink-2">{budget}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {active > 0 && (
          <Pill size="xs" tone="accent">
            {t('overview.people.active', { count: active })}
          </Pill>
        )}
        {done > 0 && (
          <Pill size="xs" tone="outline">
            {t('overview.people.done', { count: done })}
          </Pill>
        )}
        {active === 0 && done === 0 && (
          <Pill size="xs" tone="info">
            {t('overview.people.matched')}
          </Pill>
        )}
      </div>
      <div className={cn('mt-auto flex items-center gap-1.5 pt-3')} onClick={(e) => e.stopPropagation()}>
        <Button size="xs" icon={<MessageCircle className="size-3.5" />} onClick={onMessage} className="flex-1">
          {t('core.action.message')}
        </Button>
      </div>
    </TileShell>
  )
}
