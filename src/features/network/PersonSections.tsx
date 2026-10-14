import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Clock3,
  Eye,
  FileArchive,
  FileText,
  Folder,
  Globe,
  Heart,
  Languages,
  Link2,
  MessageSquareQuote,
  Music,
  ShieldCheck,
  Type,
  Users,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, stagger } from '@/lib/motion'
import { dueLabel, shortDate, timeAgo } from '@/lib/dates'
import { formatBytes, formatMoney, formatNumber } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Job, type MediaRef } from '@/store/types'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineBadge, DisciplineIcon, StatusBadge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/ui/RatingStars'
import { ProgressBar } from '@/components/ui/Progress'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { MediaView } from '@/components/art/MediaView'
import { MatchRing, PersonAvatar, PortfolioFolders, fmtMoney0, fmtRating, useMediaViewer } from '@/features/discover/ProfileBits'
import type { PersonActions } from '@/features/discover/personActions'
import { RelationCTA } from '@/features/discover/personActions'
import { disciplinesOf, headlineOf, personOf, primaryOf, ratingOf, reasonsFor, type Person } from '@/features/discover/model'
import { NoteEditor } from './NoteEditor'
import { isActiveJob, type SharedFile } from './model'

type OpenMedia = ReturnType<typeof useMediaViewer>['open']

export function Section({ title, icon, action, children, className }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={item} className={cn('card p-5 sm:p-6', className)}>
      <div className="relative z-[1] mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.02em]">
          {icon && <span className="text-ink-3 [&_svg]:size-4">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      <div className="relative z-[1]">{children}</div>
    </motion.section>
  )
}

export const tabMotion = { variants: stagger(0.07, 0.02), initial: 'hidden', animate: 'show', className: 'space-y-4' } as const

// ───────────────────────────── portfolio ─────────────────────────────

export function PortfolioTab({ p, openMedia }: { p: Person; openMedia: OpenMedia }) {
  const t = useT()
  const lang = useLang()
  if (p.kind !== 'designer') return null
  const d = p.data
  const all = d.portfolio.flatMap((it) => (it.media.length ? it.media : [it.cover]).map((m) => ({ m, title: it.title })))
  const likes = d.portfolio.reduce((n, it) => n + it.likes, 0)
  const views = d.portfolio.reduce((n, it) => n + it.views, 0)
  if (!d.portfolio.length)
    return (
      <motion.div {...tabMotion}>
        <Section title={t('discover.drawer.portfolio')}>
          <EmptyState icon={<Folder />} title={t('network.person.noPortfolio')} description={t('network.person.noPortfolioHint', { name: d.name.split(' ')[0] })} />
        </Section>
      </motion.div>
    )
  return (
    <motion.div {...tabMotion}>
      <Section
        title={t('network.person.projects', { count: d.portfolio.length })}
        icon={<Folder />}
        action={
          <span className="flex items-center gap-3 font-mono text-[12px] text-ink-3">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" />
              {formatNumber(likes, lang, { notation: 'compact' })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {formatNumber(views, lang, { notation: 'compact' })}
            </span>
          </span>
        }
      >
        <PortfolioFolders person={p} onOpen={openMedia} size="md" cols="grid-cols-2 md:grid-cols-3" className="pb-2" />
      </Section>

      <Section title={t('network.person.projectList')} icon={<FileText />}>
        <ul className="divide-y divide-[var(--line)]">
          {d.portfolio.map((it) => {
            const media = it.media.length ? it.media : [it.cover]
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={(e) => openMedia(media, 0, it.title, e.currentTarget.querySelector('[data-thumb]'))}
                  className="group flex w-full items-center gap-3 py-3 text-left"
                >
                  <span data-thumb className="size-14 shrink-0 overflow-hidden rounded-[14px] bg-[var(--surface-2)] transition-transform duration-300 group-hover:scale-105">
                    <MediaView media={it.cover} playBadge={false} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium">{it.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-3">{it.year}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-3">{it.description}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {it.client && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-text">{it.client}</span>}
                      {it.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-ink-2">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 font-mono text-[11.5px] text-ink-3 sm:flex">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3" />
                      {formatNumber(it.likes, lang)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" />
                      {formatNumber(it.views, lang, { notation: 'compact' })}
                    </span>
                  </span>
                  <DisciplineIcon id={it.discipline} size={26} />
                </button>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title={t('network.person.allShots', { count: all.length })} icon={<Eye />}>
        <div className="columns-2 gap-2 sm:columns-3 [&>*]:mb-2">
          {all.map((s, i) => (
            <motion.button
              key={i}
              type="button"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              onClick={(e) =>
                openMedia(
                  all.map((x) => x.m),
                  i,
                  d.name,
                  e.currentTarget,
                  all.map((x) => x.title),
                )
              }
              className={cn('block w-full overflow-hidden rounded-[16px] bg-[var(--surface-2)]', i % 3 === 0 ? 'aspect-[4/5]' : i % 3 === 1 ? 'aspect-[4/3]' : 'aspect-square')}
              aria-label={s.title}
            >
              <MediaView media={s.m} playBadge={false} />
            </motion.button>
          ))}
        </div>
      </Section>
    </motion.div>
  )
}

// ───────────────────────────── client briefs ─────────────────────────────

export function BriefsTab({ p, a, openMedia }: { p: Person; a: PersonActions; openMedia: OpenMedia }) {
  const t = useT()
  const lang = useLang()
  if (p.kind !== 'client') return null
  const c = p.data
  return (
    <motion.div {...tabMotion}>
      <Section title={t('network.person.openBriefs', { count: c.openBriefs.length })} icon={<Folder />}>
        {c.openBriefs.length ? (
          <PortfolioFolders person={p} onOpen={openMedia} size="md" cols="grid-cols-2 md:grid-cols-3" className="pb-2" />
        ) : (
          <EmptyState icon={<Folder />} title={t('network.person.noBriefs')} />
        )}
      </Section>
      {c.openBriefs.length > 0 && (
        <Section title={t('network.person.briefDetails')} icon={<FileText />}>
          <ul className="space-y-2">
            {c.openBriefs.map((b) => (
              <li key={b.title} className="flex flex-wrap items-center gap-3 rounded-[18px] bg-[var(--surface-2)] p-3">
                <DisciplineIcon id={b.discipline} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{b.title}</div>
                  <div className="text-[12px] text-ink-3">{t(`core.discipline.${b.discipline}`)}</div>
                </div>
                <span className="font-mono text-[14px] font-medium">{fmtMoney0(b.budget, c.currency, lang)}</span>
                {a.relation === 'matched' ? (
                  <Button size="xs" variant="soft" onClick={a.message}>
                    {t('network.person.askAbout')}
                  </Button>
                ) : (
                  a.roleOk && a.relation !== 'liked' && a.relation !== 'super' && (
                    <Button size="xs" onClick={(e) => a.act('like', e.currentTarget)} icon={<Heart className="size-3 fill-current" />}>
                      {t('network.person.interested')}
                    </Button>
                  )
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </motion.div>
  )
}

// ───────────────────────────── about ─────────────────────────────

function Fact({ icon, label, children }: { icon: ReactNode; label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-[var(--surface-2)] p-3.5">
      <span className="mt-0.5 text-ink-3 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11.5px] text-ink-3">{label}</div>
        <div className="mt-0.5 text-[13.5px] font-medium text-ink">{children}</div>
      </div>
    </div>
  )
}

export function AboutTab({ p }: { p: Person }) {
  const t = useT()
  const lang = useLang()
  return (
    <motion.div {...tabMotion}>
      <Section title={t('discover.drawer.about')}>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{p.data.bio}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {disciplinesOf(p).map((d) => (
            <DisciplineBadge key={d} id={d} />
          ))}
        </div>
      </Section>

      {p.kind === 'designer' ? (
        <>
          <Section title={t('network.person.inNumbers')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: t('core.common.completedJobs'), v: p.data.completedJobs },
                { label: t('core.common.onTime'), v: Math.round(p.data.onTimeRate * 100), suffix: '%' },
                { label: t('discover.drawer.repeat'), v: Math.round(p.data.repeatClientRate * 100), suffix: '%' },
                { label: t('core.common.responseTime'), v: p.data.responseTimeHrs, suffix: t('network.stats.h') },
              ].map((s, i) => (
                <div key={i} className={cn('rounded-[18px] p-4', i === 0 ? 'bg-night text-on-night' : 'bg-[var(--surface-2)]')}>
                  <div className={cn('truncate text-[12px]', i === 0 ? 'text-white/60' : 'text-ink-3')}>{s.label}</div>
                  <div className="mt-2 text-[30px] font-medium leading-none tracking-[-0.03em]">
                    <AnimatedCounter value={s.v} suffix={s.suffix} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <Section title={t('discover.drawer.skills')}>
            <div className="flex flex-wrap gap-1.5">
              {p.data.skills.map((s) => (
                <span key={s} className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-text">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.data.tools.map((s) => (
                <span key={s} className="rounded-full border border-line-2 px-3 py-1.5 text-[13px] text-ink-2">
                  {s}
                </span>
              ))}
            </div>
          </Section>
          <Section title={t('network.person.details')}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Fact icon={<Languages />} label={t('core.common.languages')}>
                {p.data.languages.join(' · ')}
              </Fact>
              <Fact icon={<Clock3 />} label={t('network.person.timezone')}>
                {p.data.timezone} · {p.data.location}
              </Fact>
              <Fact icon={<CalendarDays />} label={t('discover.drawer.memberSince')}>
                {shortDate(p.data.joinedAt, lang)} {new Date(p.data.joinedAt).getFullYear()}
              </Fact>
              <Fact icon={<Briefcase />} label={t('discover.filters.availability')}>
                {t(`core.availability.${p.data.availability}`)}
              </Fact>
            </div>
            {p.data.socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {p.data.socials.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-transparent hover:bg-ink hover:text-[var(--surface)]"
                  >
                    <Link2 className="size-3.5" />
                    {s.label}
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : (
        <Section title={t('network.person.details')}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Fact icon={<Briefcase />} label={t('network.person.industry')}>
              {p.data.industry}
            </Fact>
            <Fact icon={<Users />} label={t('network.person.contact')}>
              {p.data.contactName} · {p.data.contactRole}
            </Fact>
            <Fact icon={<Globe />} label={t('network.person.website')}>
              <a href={p.data.website} target="_blank" rel="noreferrer" className="hover:underline">
                {p.data.website.replace(/^https?:\/\//, '')}
              </a>
            </Fact>
            <Fact icon={<Clock3 />} label={t('core.common.location')}>
              {p.data.location}
            </Fact>
            <Fact icon={<ShieldCheck />} label={t('network.person.payment')}>
              {p.data.paymentVerified ? t('discover.badge.paymentVerified') : t('network.person.paymentPending')}
            </Fact>
            <Fact icon={<CalendarDays />} label={t('discover.drawer.memberSince')}>
              {shortDate(p.data.joinedAt, lang)} {new Date(p.data.joinedAt).getFullYear()}
            </Fact>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: t('discover.drawer.hires'), v: p.data.hiresCount },
              { label: t('core.common.rating'), v: p.data.rating, decimals: 1 },
              { label: t('network.person.budgetUpTo'), v: p.data.budgetRange[1], currency: p.data.currency },
            ].map((s, i) => (
              <div key={i} className={cn('rounded-[18px] p-4', i === 0 ? 'bg-night text-on-night' : 'bg-[var(--surface-2)]')}>
                <div className={cn('truncate text-[12px]', i === 0 ? 'text-white/60' : 'text-ink-3')}>{s.label}</div>
                <div className="mt-2 text-[28px] font-medium leading-none tracking-[-0.03em]">
                  <AnimatedCounter value={s.v} decimals={s.decimals} currency={s.currency} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  )
}

// ───────────────────────────── reviews ─────────────────────────────

export function ReviewsTab({ p }: { p: Person }) {
  const t = useT()
  const lang = useLang()
  if (p.kind !== 'designer') return null
  const reviews = p.data.reviews
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => Math.round(r.rating) === n).length }))
  const max = Math.max(1, ...dist.map((d) => d.c))
  return (
    <motion.div {...tabMotion}>
      <Section title={t('discover.drawer.reviews')} icon={<MessageSquareQuote />}>
        {reviews.length === 0 ? (
          <EmptyState icon={<MessageSquareQuote />} title={t('discover.card.noReviews')} description={t('network.person.noReviewsHint')} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="rounded-[22px] bg-night p-5 text-on-night">
              <div className="text-[52px] font-medium leading-none tracking-[-0.04em]">
                <AnimatedCounter value={ratingOf(p) ?? 0} decimals={2} />
              </div>
              <RatingStars value={ratingOf(p) ?? 0} size={16} className="mt-3" />
              <div className="mt-2 text-[12.5px] text-white/60">{t('network.person.basedOn', { count: p.data.reviewsCount })}</div>
            </div>
            <div className="space-y-2 self-center">
              {dist.map((d, i) => (
                <div key={d.n} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-4 font-mono text-ink-2">{d.n}</span>
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#FFB21E]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.c / max) * 100}%` }}
                      transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-ink-3">{d.c}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
      {reviews.map((r) => (
        <motion.article key={r.id} variants={item} className="card p-5">
          <div className="relative z-[1] flex items-center gap-3">
            <Avatar seed={r.authorAvatarSeed} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{r.authorName}</div>
              <div className="truncate text-[12px] text-ink-3">{r.authorCompany}</div>
            </div>
            <div className="text-right">
              <RatingStars value={r.rating} size={14} />
              <div className="mt-1 font-mono text-[11px] text-ink-3">{timeAgo(r.createdAt, lang)}</div>
            </div>
          </div>
          <p className="relative z-[1] mt-3 text-[14.5px] leading-relaxed text-ink">“{r.text}”</p>
        </motion.article>
      ))}
    </motion.div>
  )
}

// ───────────────────────────── work together ─────────────────────────────

export function WorkTab({ p, a, jobs }: { p: Person; a: PersonActions; jobs: Job[] }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const active = jobs.filter(isActiveJob)
  const done = jobs.filter((j) => j.status === 'approved')
  const value = jobs.filter((j) => j.status !== 'declined' && j.status !== 'cancelled').reduce((n, j) => n + j.budget, 0)
  const rated = jobs.filter((j) => j.rating)
  const avg = rated.length ? rated.reduce((n, j) => n + (j.rating ?? 0), 0) / rated.length : 0
  const youPay = p.kind === 'designer'
  const first = p.data.name.split(' ')[0]

  if (!jobs.length)
    return (
      <motion.div {...tabMotion}>
        <Section title={t('network.person.workTogether')} icon={<Briefcase />}>
          <EmptyState
            icon={<Briefcase />}
            title={t('network.person.noJobs', { name: first })}
            description={t(a.canBrief ? 'network.person.noJobsBrief' : 'network.person.noJobsChat')}
            action={
              a.relation === 'matched' ? (
                a.canBrief ? (
                  <Button onClick={a.brief} icon={<FileText className="size-4" />}>
                    {t('discover.cta.sendBrief')}
                  </Button>
                ) : (
                  <Button onClick={a.message}>{t('core.action.message')}</Button>
                )
              ) : undefined
            }
          />
        </Section>
      </motion.div>
    )

  return (
    <motion.div {...tabMotion}>
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('network.person.jobsTotal'), node: <AnimatedCounter value={jobs.length} />, dark: true },
          { label: t('network.person.jobsActive'), node: <AnimatedCounter value={active.length} /> },
          { label: t(youPay ? 'network.person.spent' : 'network.person.earned'), node: <AnimatedCounter value={value} currency={jobs[0]?.currency ?? 'EUR'} compact={value >= 10000} /> },
          { label: t('network.person.avgRating'), node: avg ? <AnimatedCounter value={avg} decimals={1} /> : <span>—</span> },
        ].map((s, i) => (
          <div key={i} className={cn('rounded-[22px] p-4', s.dark ? 'glass-night' : 'card')}>
            <div className={cn('relative z-[1] truncate text-[12px]', s.dark ? 'text-white/60' : 'text-ink-3')}>{s.label}</div>
            <div className="relative z-[1] mt-2 text-[28px] font-medium leading-none tracking-[-0.03em]">{s.node}</div>
          </div>
        ))}
      </motion.div>
      <Section
        title={t('network.person.jobsList')}
        icon={<Briefcase />}
        action={<span className="font-mono text-[12px] text-ink-3">{t('network.person.completedCount', { count: done.length })}</span>}
      >
        <ul className="space-y-2">
          {jobs.map((j, i) => (
            <motion.li key={j.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={`/jobs/${j.id}`}
                className="group flex items-center gap-3 rounded-[20px] bg-[var(--surface-2)] p-2.5 pr-3.5 transition-colors hover:bg-[var(--surface-3)]"
              >
                <span className="size-14 shrink-0 overflow-hidden rounded-[14px]">
                  <MediaView media={j.cover} playBadge={false} className="transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11.5px] text-ink-3">{j.id}</span>
                    <StatusBadge status={j.status} size="xs" />
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] font-medium">{j.title}</span>
                  {isActiveJob(j) && <ProgressBar value={j.progress} height={5} className="mt-1.5 max-w-[240px]" tone="accent" />}
                </span>
                <span className="hidden shrink-0 text-right sm:block">
                  <span className="block font-mono text-[13px] font-medium">{formatMoney(j.budget, j.currency, lang)}</span>
                  <span className="block text-[11.5px] text-ink-3">{isActiveJob(j) ? dueLabel(j.dueAt, lang) : shortDate(j.approvedAt ?? j.updatedAt, lang)}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </motion.li>
          ))}
        </ul>
        {a.canBrief && a.relation === 'matched' && (
          <Button variant="glass" size="sm" className="mt-4" icon={<FileText className="size-4" />} onClick={a.brief}>
            {t('network.person.newBrief', { name: first })}
          </Button>
        )}
        {!a.canBrief && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate('/jobs')}>
            {t('network.person.allJobs')}
          </Button>
        )}
      </Section>
    </motion.div>
  )
}

// ───────────────────────────── files ─────────────────────────────

const KIND_ICON: Record<string, ReactNode> = {
  doc: <FileText />,
  font: <Type />,
  audio: <Music />,
  link: <Link2 />,
  archive: <FileArchive />,
  video: <Video />,
}

const visual = (m: MediaRef, kind: SharedFile['kind']) => m.kind === 'art' || kind === 'image' || kind === 'video' || kind === 'delivery'

export function FilesTab({ files, openMedia }: { files: SharedFile[]; openMedia: OpenMedia }) {
  const t = useT()
  const lang = useLang()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const nameOf = (id: string) =>
    id === ME_CLIENT_ID || id === ME_DESIGNER_ID ? t('core.common.you') : (designers.find((d) => d.id === id)?.name ?? clients.find((c) => c.id === id)?.name ?? '—')
  const totalSize = files.reduce((n, f) => n + f.size, 0)
  const viewable = useMemo(() => files.filter((f) => visual(f.media, f.kind)), [files])
  return (
    <motion.div {...tabMotion}>
      <Section
        title={t('network.person.sharedFiles', { count: files.length })}
        icon={<Folder />}
        action={files.length ? <span className="font-mono text-[12px] text-ink-3">{formatBytes(totalSize)}</span> : undefined}
      >
        {files.length === 0 ? (
          <EmptyState icon={<Folder />} title={t('network.person.noFiles')} description={t('network.person.noFilesHint')} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {files.map((f, i) => {
              const isVisual = visual(f.media, f.kind)
              return (
                <motion.button
                  key={f.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 16) * 0.03 }}
                  whileHover={{ y: -3 }}
                  onClick={(e) => {
                    if (isVisual) {
                      const idx = viewable.findIndex((x) => x.id === f.id)
                      openMedia(
                        viewable.map((x) => x.media),
                        Math.max(0, idx),
                        f.jobTitle,
                        e.currentTarget.querySelector('[data-thumb]'),
                        viewable.map((x) => `${x.name} · ${x.jobId}`),
                      )
                    } else if (f.media.kind === 'url') window.open(f.media.url, '_blank', 'noreferrer')
                    else openMedia([f.media], 0, f.name, e.currentTarget)
                  }}
                  className="group overflow-hidden rounded-[18px] bg-[var(--surface-2)] text-left"
                >
                  <span data-thumb className="relative block aspect-[4/3] overflow-hidden">
                    {isVisual ? (
                      <MediaView media={f.media} playBadge={false} className="transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <span className="flex size-full items-center justify-center bg-[var(--surface-3)] text-ink-3 [&_svg]:size-8">{KIND_ICON[f.kind] ?? <FileText />}</span>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur">
                      {f.kind === 'delivery' ? t('network.person.delivery') : t(`core.asset.${f.kind}`)}
                    </span>
                  </span>
                  <span className="block p-2.5">
                    <span className="block truncate text-[12.5px] font-medium">{f.name}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[10.5px] text-ink-3">
                      <span className="truncate">{f.jobId}</span>
                      <span className="shrink-0">{f.size ? formatBytes(f.size) : shortDate(f.addedAt, lang)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-ink-3">{nameOf(f.addedBy)}</span>
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}
      </Section>
    </motion.div>
  )
}

// ───────────────────────────── side cards ─────────────────────────────

export function MatchSideCard({ p, a }: { p: Person; a: PersonActions }) {
  const t = useT()
  const lang = useLang()
  const role = useApp((s) => s.settings.role)
  const discipline = useApp((s) => s.settings.discipline)
  const score = matchScore(p.data, a.pair?.role ?? role, discipline)
  const reasons = useMemo(() => reasonsFor(p, discipline), [p, discipline])
  return (
    <motion.div variants={item} className="glass-night relative overflow-hidden p-5">
      <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_40%,transparent),transparent)] blur-xl" />
      <div className="relative flex items-center gap-4">
        <MatchRing score={score} size={76} stroke={7} onDark />
        <div className="min-w-0">
          <div className="text-[17px] font-medium tracking-[-0.02em] text-white">{t('core.common.matchScore', { score })}</div>
          <div className="mt-0.5 text-[12.5px] text-white/55">
            {a.match
              ? `${t('discover.drawer.matchedAgo', { ago: timeAgo(a.match.createdAt, lang) })} · ${t(a.match.initiatedBy === (a.pair?.role ?? role) ? 'network.card.youFirst' : 'network.card.theyFirst')}`
              : t(`network.person.relation.${a.relation}`)}
          </div>
        </div>
      </div>
      <ul className="relative mt-4 space-y-2">
        {reasons.map((r) => (
          <li key={r.key} className="flex items-center gap-2.5 text-[13px] text-white/80">
            <span className={cn('size-1.5 shrink-0 rounded-full', r.tone === 'good' ? 'bg-[var(--accent)]' : r.tone === 'warn' ? 'bg-[#f5a524]' : 'bg-[#7cc8ff]')} />
            {t(`discover.${r.key}`, r.vars)}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export function NoteSideCard({ a }: { a: PersonActions }) {
  const t = useT()
  if (!a.match) return null
  return (
    <motion.div variants={item} className="card p-5">
      <h3 className="relative z-[1] mb-3 text-[16px] font-medium tracking-[-0.02em]">{t('network.note.title')}</h3>
      <NoteEditor match={a.match} className="relative z-[1]" />
    </motion.div>
  )
}

export function FactsSideCard({ p }: { p: Person }) {
  const t = useT()
  const lang = useLang()
  const rows: [ReactNode, ReactNode, ReactNode][] =
    p.kind === 'designer'
      ? [
          [<Briefcase key="i" />, t('discover.filters.rate'), fmtMoney0(p.data.hourlyRate, p.data.currency, lang) + t('core.common.perHour')],
          [<Clock3 key="i" />, t('core.common.responseTime'), t('discover.drawer.hours', { count: p.data.responseTimeHrs })],
          [<BadgeCheck key="i" />, t('core.common.onTime'), `${Math.round(p.data.onTimeRate * 100)}%`],
          [<Globe key="i" />, t('network.person.timezone'), p.data.timezone],
          [<Languages key="i" />, t('core.common.languages'), p.data.languages.join(', ')],
        ]
      : [
          [<Briefcase key="i" />, t('discover.filters.budget'), `${formatMoney(p.data.budgetRange[0], p.data.currency, lang, true)} – ${formatMoney(p.data.budgetRange[1], p.data.currency, lang, true)}`],
          [<Users key="i" />, t('discover.drawer.hires'), String(p.data.hiresCount)],
          [<ShieldCheck key="i" />, t('network.person.payment'), p.data.paymentVerified ? t('discover.badge.paymentVerified') : t('network.person.paymentPending')],
          [<Globe key="i" />, t('network.person.website'), p.data.website.replace(/^https?:\/\//, '')],
        ]
  return (
    <motion.div variants={item} className="card p-5">
      <h3 className="relative z-[1] text-[16px] font-medium tracking-[-0.02em]">{t('network.person.quickFacts')}</h3>
      <dl className="relative z-[1] mt-3 divide-y divide-[var(--line)]">
        {rows.map(([icon, label, value], i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 text-[13px]">
            <span className="text-ink-3 [&_svg]:size-4">{icon}</span>
            <dt className="text-ink-3">{label}</dt>
            <dd className="ml-auto truncate text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  )
}

export function SimilarSideCard({ p }: { p: Person }) {
  const t = useT()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const role = useApp((s) => s.settings.role)
  const discipline = useApp((s) => s.settings.discipline)
  const list = useMemo(() => {
    const primary = primaryOf(p)
    const pool: Person[] =
      p.kind === 'designer'
        ? designers.filter((d) => d.id !== p.data.id && d.id !== ME_DESIGNER_ID && d.disciplines.includes(primary)).map(personOf)
        : clients.filter((c) => c.id !== p.data.id && c.id !== ME_CLIENT_ID && c.disciplinesNeeded.includes(primary)).map(personOf)
    return pool.sort((a, b) => matchScore(b.data, role, discipline) - matchScore(a.data, role, discipline)).slice(0, 4)
  }, [p, designers, clients, role, discipline])
  if (!list.length) return null
  return (
    <motion.div variants={item} className="card p-5">
      <h3 className="relative z-[1] text-[16px] font-medium tracking-[-0.02em]">{t(p.kind === 'designer' ? 'network.person.similarDesigners' : 'network.person.similarClients')}</h3>
      <ul className="relative z-[1] mt-3 space-y-1">
        {list.map((x) => (
          <li key={x.data.id}>
            <Link to={`/network/${x.data.id}`} className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-[var(--surface-2)]">
              <PersonAvatar person={x} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{x.data.name}</span>
                <span className="block truncate text-[12px] text-ink-3">{headlineOf(x)}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-ink-3">
                <Heart className="size-3" />
                {matchScore(x.data, role, discipline)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export function CtaSideCard({ p, a }: { p: Person; a: PersonActions }) {
  return (
    <motion.div variants={item} className="card p-4 lg:hidden">
      <RelationCTA p={p} a={a} block className="relative z-[1] w-full" />
    </motion.div>
  )
}

export const ratingLabel = (v: number) => (v ? fmtRating(v) : '—')
