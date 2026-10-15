import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Banknote, Briefcase, CalendarDays, Clock3, ExternalLink, Globe, Heart, Languages, MapPin, MessageCircle, Repeat, Send, Star, Target, Timer } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, stagger } from '@/lib/motion'
import { shortDate, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { toast } from '@/store/toasts'
import type { Client, Designer } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/ui/RatingStars'
import { Avatar } from '@/components/ui/Avatar'
import { MediaView } from '@/components/art/MediaView'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { PersonAvatar, PersonBadges, PortfolioFolders, StatTile, fmtMoney0, fmtRating, useMediaViewer } from '@/features/discover/ProfileBits'
import { personOf } from '@/features/discover/model'
import { AvailDot } from './ui'
import { localTimeIn, prettyUrl } from './data'

function Block({ title, icon, children, className }: { title: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={item} className={className}>
      <h4 className="mb-3 flex items-center gap-2 text-[15px] font-medium tracking-[-0.015em]">
        {icon && <span className="text-ink-3 [&_svg]:size-4">{icon}</span>}
        {title}
      </h4>
      {children}
    </motion.section>
  )
}

function Chips({ items, tone = 'neutral' }: { items: string[]; tone?: 'neutral' | 'accent' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <motion.span
          key={s}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.02 * i, type: 'spring', stiffness: 400, damping: 22 }}
          className={cn('rounded-full px-3 py-1 text-[12.5px] font-medium', tone === 'accent' ? 'bg-accent-soft text-accent-text' : 'bg-[var(--surface-2)] text-ink-2')}
        >
          {s}
        </motion.span>
      ))}
    </div>
  )
}

const previewOnly = (t: (k: string) => string) => () => toast({ title: t('profile.preview.onlyPreview'), description: t('profile.preview.onlyPreviewHint'), tone: 'info' })

/** Public designer profile, exactly the data clients see. */
export function DesignerProfileMock({ designer: d, className }: { designer: Designer; className?: string }) {
  const t = useT()
  const lang = useLang()
  const viewer = useMediaViewer()
  const p = personOf(d)
  const cover = d.portfolio[0]?.cover
  const local = localTimeIn(d.timezone)
  const onlyPreview = previewOnly(t)

  return (
    <Glass className={cn('overflow-hidden p-0', className)}>
      {/* cover */}
      <div className="relative h-40 overflow-hidden sm:h-56">
        <motion.div className="absolute inset-0" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.23, 1, 0.32, 1] }}>
          {cover ? <MediaView media={cover} playBadge={false} /> : <GenerativeArt seed={d.avatarSeed} variant="mesh" discipline={d.primary} playBadge={false} className="size-full" />}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/25" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          <PersonBadges person={p} onDark />
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-black/35 px-2.5 py-1 font-mono text-[11px] text-white/85 backdrop-blur-md">{t('profile.preview.publicView')}</span>
      </div>

      <motion.div variants={stagger(0.06, 0.1)} initial="hidden" animate="show" className="relative space-y-7 px-4 pb-6 sm:px-7 sm:pb-8">
        {/* identity */}
        <motion.div variants={item} className="-mt-12 flex flex-col gap-4 sm:-mt-14">
          <div className="flex min-w-0 items-end gap-4">
            <span className="shrink-0 rounded-full bg-[var(--surface)] p-1 shadow-[0_14px_30px_-14px_rgba(0,0,0,.55)]">
              <PersonAvatar person={p} size={96} />
            </span>
            <div className="min-w-0 pb-1">
              <h2 className="flex items-center gap-1.5 text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[28px]">
                <span className="truncate">{d.name || t('profile.preview.yourName')}</span>
                {d.verified && <BadgeCheck className="size-5 shrink-0 text-info" />}
              </h2>
              <div className="truncate font-mono text-[12px] text-ink-3">{d.handle}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Send className="size-4" />} onClick={onlyPreview}>
              {t('profile.preview.sendBrief')}
            </Button>
            <Button variant="glass" size="sm" icon={<Heart className="size-4" />} onClick={onlyPreview}>
              {t('core.action.like')}
            </Button>
            <Button variant="glass" size="sm" icon={<MessageCircle className="size-4" />} onClick={onlyPreview}>
              {t('core.action.message')}
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          <p className="text-balance text-[17px] font-medium leading-snug tracking-[-0.015em] sm:text-[19px]">{d.headline || <span className="text-ink-3">{t('profile.preview.noHeadline')}</span>}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-ink-3" />
              {d.location || '—'}
            </span>
            {local && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
                <Clock3 className="size-3.5 text-ink-3" />
                {d.timezone} · {local}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <AvailDot value={d.availability} pulse />
              {t(`core.availability.${d.availability}`)}
            </span>
            {d.languages.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Languages className="size-3.5 text-ink-3" />
                {d.languages.join(', ')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {d.disciplines.map((x) => (
              <DisciplineBadge key={x} id={x} />
            ))}
          </div>
        </motion.div>

        {/* stats */}
        <motion.div variants={item} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatTile label={t('profile.stats.rate')} dark>
            <span className="font-mono">{fmtMoney0(d.hourlyRate, d.currency, lang)}</span>
            <span className="text-[13px] text-white/60">/h</span>
          </StatTile>
          <StatTile label={t('core.common.rating')} hint={d.reviewsCount ? t('profile.stats.reviews', { count: d.reviewsCount }) : t('profile.stats.noReviews')}>
            <span className="inline-flex items-center gap-1">
              <Star className="size-4 fill-[#FFB21E] text-[#FFB21E]" />
              {d.reviewsCount ? fmtRating(d.rating) : '—'}
            </span>
          </StatTile>
          <StatTile label={t('core.common.completedJobs')}>{d.completedJobs}</StatTile>
          <StatTile label={t('core.common.responseTime')}>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-4 text-ink-3" />
              {d.responseTimeHrs}h
            </span>
          </StatTile>
          <StatTile label={t('core.common.onTime')}>
            <span className="inline-flex items-center gap-1">
              <Target className="size-4 text-ink-3" />
              {Math.round(d.onTimeRate * 100)}%
            </span>
          </StatTile>
          <StatTile label={t('profile.stats.repeat')}>
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-4 text-ink-3" />
              {Math.round(d.repeatClientRate * 100)}%
            </span>
          </StatTile>
        </motion.div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Block title={t('profile.preview.about')}>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{d.bio || <span className="text-ink-3">{t('profile.preview.noBio')}</span>}</p>
          </Block>
          <div className="space-y-6">
            <Block title={t('profile.craft.skills')}>{d.skills.length ? <Chips items={d.skills} tone="accent" /> : <Empty />}</Block>
            <Block title={t('profile.craft.tools')}>{d.tools.length ? <Chips items={d.tools} /> : <Empty />}</Block>
          </div>
        </div>

        <Block title={t('profile.preview.portfolio', { count: d.portfolio.length })} icon={<Briefcase />}>
          {d.portfolio.length ? <PortfolioFolders person={p} onOpen={viewer.open} size="sm" cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" className="pt-2" /> : <Empty text={t('profile.preview.noWork')} />}
        </Block>

        <div className="grid gap-7 lg:grid-cols-2">
          <Block title={t('profile.reviews.title')} icon={<Star />}>
            {d.reviews.length ? (
              <div className="space-y-3">
                {d.reviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="tile p-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={r.authorAvatarSeed} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{r.authorName}</div>
                        <div className="truncate text-[11.5px] text-ink-3">{r.authorCompany}</div>
                      </div>
                      <RatingStars value={r.rating} size={13} />
                    </div>
                    <p className="mt-2 line-clamp-3 text-[13px] text-ink-2">“{r.text}”</p>
                    <div className="mt-1.5 font-mono text-[11px] text-ink-3">{timeAgo(r.createdAt, lang)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text={t('profile.reviews.none')} />
            )}
          </Block>
          <Block title={t('profile.socials.title')} icon={<Globe />}>
            {d.socials.length ? (
              <div className="grid gap-2">
                {d.socials.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-3)]">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium">{s.label}</span>
                      <span className="block truncate font-mono text-[11.5px] text-ink-3">{prettyUrl(s.url)}</span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                ))}
              </div>
            ) : (
              <Empty />
            )}
            <div className="mt-3 flex items-center gap-1.5 font-mono text-[11.5px] text-ink-3">
              <CalendarDays className="size-3.5" />
              {t('profile.preview.memberSince', { date: shortDate(d.joinedAt, lang) })}
            </div>
          </Block>
        </div>
      </motion.div>
      {viewer.element}
    </Glass>
  )
}

/** Public company profile, as designers see it. */
export function ClientProfileMock({ client: c, className }: { client: Client; className?: string }) {
  const t = useT()
  const lang = useLang()
  const viewer = useMediaViewer()
  const p = personOf(c)
  const onlyPreview = previewOnly(t)
  return (
    <Glass className={cn('overflow-hidden p-0', className)}>
      <div className="relative h-40 overflow-hidden sm:h-52" style={{ background: `linear-gradient(135deg, ${c.logoColor}, color-mix(in oklab, ${c.logoColor} 45%, #000))` }}>
        <motion.div className="absolute inset-0 opacity-40 mix-blend-overlay" initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.23, 1, 0.32, 1] }}>
          <GenerativeArt seed={c.avatarSeed} variant="pattern" discipline={c.disciplinesNeeded[0] ?? 'brand'} playBadge={false} className="size-full" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-4 top-4">
          <PersonBadges person={p} onDark />
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-black/35 px-2.5 py-1 font-mono text-[11px] text-white/85 backdrop-blur-md">{t('profile.preview.publicView')}</span>
      </div>
      <motion.div variants={stagger(0.06, 0.1)} initial="hidden" animate="show" className="relative space-y-7 px-4 pb-6 sm:px-7 sm:pb-8">
        <motion.div variants={item} className="-mt-12 flex flex-col gap-4">
          <div className="flex min-w-0 items-end gap-4">
            <span className="shrink-0 rounded-[30%] bg-[var(--surface)] p-1 shadow-[0_14px_30px_-14px_rgba(0,0,0,.55)]">
              <PersonAvatar person={p} size={92} />
            </span>
            <div className="min-w-0 pb-1">
              <h2 className="flex items-center gap-1.5 text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[28px]">
                <span className="truncate">{c.name || t('profile.client.companyPh')}</span>
                {c.verified && <BadgeCheck className="size-5 shrink-0 text-info" />}
              </h2>
              <div className="truncate text-[13px] text-ink-3">
                {c.contactName} · {c.contactRole}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" size="sm" icon={<Heart className="size-4" />} onClick={onlyPreview}>
              {t('core.action.like')}
            </Button>
            <Button size="sm" icon={<MessageCircle className="size-4" />} onClick={onlyPreview}>
              {t('core.action.message')}
            </Button>
          </div>
        </motion.div>
        <motion.div variants={item} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="size-3.5 text-ink-3" />
            {c.industry || '—'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-ink-3" />
            {c.location || '—'}
          </span>
          {c.website && (
            <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[12px] text-accent-text hover:underline">
              <Globe className="size-3.5" />
              {prettyUrl(c.website)}
            </a>
          )}
        </motion.div>
        <motion.div variants={item} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label={t('profile.client.budget')} dark>
            <span className="font-mono text-[18px]">
              {fmtMoney0(c.budgetRange[0], c.currency, 'en', true)}–{fmtMoney0(c.budgetRange[1], c.currency, 'en', true)}
            </span>
          </StatTile>
          <StatTile label={t('profile.client.hires')}>{c.hiresCount}</StatTile>
          <StatTile label={t('core.common.rating')}>
            <span className="inline-flex items-center gap-1">
              <Star className="size-4 fill-[#FFB21E] text-[#FFB21E]" />
              {fmtRating(c.rating)}
            </span>
          </StatTile>
          <StatTile label={t('profile.stats.since')}>
            <span className="font-mono text-[18px]">{shortDate(c.joinedAt, lang)}</span>
          </StatTile>
        </motion.div>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Block title={t('profile.preview.about')}>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{c.bio || <span className="text-ink-3">{t('profile.preview.noBio')}</span>}</p>
          </Block>
          <Block title={t('profile.client.needs')} icon={<Banknote />}>
            {c.disciplinesNeeded.length ? (
              <div className="flex flex-wrap gap-1.5">
                {c.disciplinesNeeded.map((x) => (
                  <DisciplineBadge key={x} id={x} />
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Block>
        </div>
        <Block title={t('profile.client.openBriefs', { count: c.openBriefs.length })}>
          {c.openBriefs.length ? (
            <PortfolioFolders person={p} onOpen={viewer.open} size="sm" cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" className="pt-2" />
          ) : (
            <Empty text={t('profile.client.noBriefs')} />
          )}
          {c.openBriefs.length > 0 && (
            <div className="mt-4 font-mono text-[12px] text-ink-3">
              {t('profile.client.briefsTotal', { total: formatMoney(c.openBriefs.reduce((n, b) => n + b.budget, 0), c.currency, lang) })}
            </div>
          )}
        </Block>
      </motion.div>
      {viewer.element}
    </Glass>
  )
}

function Empty({ text }: { text?: string }) {
  const t = useT()
  return <p className="rounded-2xl border border-dashed border-line-2 px-4 py-5 text-center text-[13px] text-ink-3">{text ?? t('profile.preview.nothingYet')}</p>
}
