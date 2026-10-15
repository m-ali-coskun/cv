import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import {
  AtSign,
  BadgeCheck,
  Clock3,
  ExternalLink,
  GripVertical,
  Languages,
  Link2,
  MapPin,
  MessageSquareQuote,
  Palette,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Wallet,
  Wand2,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { fmtMoney0 } from '@/features/discover/ProfileBits'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { ME_DESIGNER_ID, type Designer } from '@/store/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import { Slider } from '@/components/ui/Slider'
import { Segmented } from '@/components/ui/Segmented'
import { RatingStars } from '@/components/ui/RatingStars'
import { Avatar } from '@/components/ui/Avatar'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { EmptyState } from '@/components/ui/EmptyState'
import { AvatarPicker } from '../shared/AvatarPicker'
import { BioEditor } from '../shared/BioEditor'
import {
  CITY_SUGGESTIONS,
  LANGUAGE_OPTIONS,
  RESPONSE_OPTIONS,
  SKILLS,
  SOCIAL_PLATFORMS,
  TIMEZONES,
  TOOLS,
  handleFrom,
  headlineIdeas,
  isValidUrl,
  localTimeIn,
  marketRate,
  normalizeHandle,
  polishBio,
  prettyUrl,
  socialUrl,
  suggestionsFor,
  type WritingInput,
} from '../shared/data'
import { markSaved, markSaving, useDebouncedCommit } from '../shared/saveState'
import { AvailabilityPicker, DataList, DisciplineChips, GroupLabel, PrimaryDisciplinePicker, SectionCard, TextField } from '../shared/ui'

/** Immediate commit (toggles, pickers) with a short "Saving…" beat. */
export function useCommit(section: string) {
  const update = useApp((s) => s.updateMyProfile)
  return useCallback(
    (patch: Partial<Designer>) => {
      markSaving(section)
      update(patch)
      window.setTimeout(() => markSaved(section), 380)
    },
    [section, update],
  )
}

export function writingInput(d: Designer): WritingInput {
  return { name: d.name, location: d.location, primary: d.primary, disciplines: d.disciplines, skills: d.skills, tools: d.tools, availability: d.availability, bio: d.bio }
}

// ───────────────────────────── identity ─────────────────────────────

export function IdentitySection({ d }: { d: Designer }) {
  const t = useT()
  const commit = useCommit('identity')
  const update = useApp((s) => s.updateMyProfile)
  const designers = useApp((s) => s.designers)
  const [ideaV, setIdeaV] = useState(0)
  const ideas = useMemo(() => headlineIdeas(writingInput(d), ideaV), [d, ideaV])
  const taken = useMemo(() => new Set(designers.filter((x) => x.id !== ME_DESIGNER_ID).map((x) => x.handle.toLowerCase())), [designers])
  const local = localTimeIn(d.timezone)

  return (
    <SectionCard id="identity" icon={<UserRound />} title={t('profile.identity.title')} subtitle={t('profile.identity.subtitle')}>
      <AvatarPicker seed={d.avatarSeed} media={d.avatar} onSeed={(avatarSeed) => commit({ avatarSeed })} onMedia={(avatar) => commit({ avatar })} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <TextField label={t('profile.identity.name')} section="identity" value={d.name} max={40} onCommit={(name) => {
            if (name.trim().length >= 2) update({ name: name.trim() })
          }} autoComplete="name" error={(v) => (v.trim().length < 2 ? t('profile.identity.nameRequired') : null)} />
        <TextField
          label={t('profile.identity.handle')}
          section="identity"
          value={d.handle}
          icon={<AtSign />}
          transform={(v) => normalizeHandle(v).slice(0, 31)}
          onCommit={(handle) => {
            if (handle.length >= 3 && !taken.has(handle.toLowerCase())) update({ handle })
          }}
          error={(v) => (v.length < 3 ? t('profile.identity.handleShort') : taken.has(v.toLowerCase()) ? t('profile.identity.handleTaken') : null)}
          right={
            <IconButton label={t('profile.identity.suggestHandle')} variant="soft" size="sm" onClick={() => commit({ handle: handleFrom(d.name) || d.handle })}>
              <Wand2 className="size-3.5" />
            </IconButton>
          }
        />
      </div>

      <div className="mt-4">
        <TextField label={t('profile.identity.headline')} section="identity" value={d.headline} max={90} min={30} placeholder={t('profile.identity.headlinePh')} onCommit={(headline) => update({ headline })} />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
            <Sparkles className="size-3.5 text-accent-text" />
            {t('profile.identity.ideas')}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            {ideas.map((idea, i) => (
              <motion.button
                key={idea}
                type="button"
                layout
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.05, duration: 0.35, ease: EASE_OUT } }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => commit({ headline: idea })}
                className="max-w-full truncate rounded-full border border-line-2 bg-[var(--surface)]/60 px-3 py-1 text-left text-[12.5px] text-ink-2 hover:border-[var(--accent-line)] hover:text-ink"
              >
                {idea}
              </motion.button>
            ))}
          </AnimatePresence>
          <motion.button
            type="button"
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.85 }}
            transition={spring.snappy}
            onClick={() => setIdeaV((v) => v + 1)}
            aria-label={t('profile.identity.moreIdeas')}
            title={t('profile.identity.moreIdeas')}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2"
          >
            <RefreshCw className="size-3.5" />
          </motion.button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label={t('core.common.location')} section="identity" value={d.location} icon={<MapPin />} list="pf-cities" placeholder="Berlin, DE" onCommit={(location) => update({ location })} />
        <DataList id="pf-cities" options={CITY_SUGGESTIONS} />
        <div>
          <Label hint={local ? <span className="inline-flex items-center gap-1 font-mono text-[11.5px]"><Clock3 className="size-3" />{local}</span> : undefined}>{t('profile.identity.timezone')}</Label>
          <Select value={d.timezone} onChange={(e) => commit({ timezone: e.target.value })}>
            {TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.id} · {tz.offset} · {tz.city}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-4">
        <Label hint={`${d.languages.length}/8`}>{t('core.common.languages')}</Label>
        <TagInput value={d.languages} onChange={(languages) => commit({ languages })} suggestions={LANGUAGE_OPTIONS} max={8} quickPicks={4} transform="capitalize" icon={<Languages className="size-4" />} />
      </div>
    </SectionCard>
  )
}

// ───────────────────────────── about ─────────────────────────────

export function AboutSection({ d }: { d: Designer }) {
  const t = useT()
  const update = useApp((s) => s.updateMyProfile)
  const [bio, setBio, flush] = useDebouncedCommit(d.bio, (v: string) => update({ bio: v }), 'about')
  return (
    <SectionCard id="about" icon={<MessageSquareQuote />} title={t('profile.about.title')} subtitle={t('profile.about.subtitle')}>
      <BioEditor value={bio} onChange={setBio} onBlur={flush} generate={(tone, v) => polishBio(writingInput({ ...d, bio }), tone, v)} />
    </SectionCard>
  )
}

// ───────────────────────────── craft ─────────────────────────────

export function CraftSection({ d }: { d: Designer }) {
  const t = useT()
  const commit = useCommit('craft')
  const skillSugg = useMemo(() => suggestionsFor(SKILLS, d.primary, d.disciplines), [d.primary, d.disciplines])
  const toolSugg = useMemo(() => suggestionsFor(TOOLS, d.primary, d.disciplines), [d.primary, d.disciplines])
  return (
    <SectionCard id="craft" icon={<Palette />} title={t('profile.craft.title')} subtitle={t('profile.craft.subtitle')}>
      <GroupLabel>{t('profile.craft.primary')}</GroupLabel>
      <PrimaryDisciplinePicker value={d.primary} onChange={(primary) => commit({ primary, disciplines: d.disciplines.includes(primary) ? d.disciplines : [primary, ...d.disciplines] })} />
      <GroupLabel className="mt-6" right={<span className="font-mono text-[11px] text-ink-3">{d.disciplines.length}/7</span>}>
        {t('profile.craft.disciplines')}
      </GroupLabel>
      <DisciplineChips value={d.disciplines} locked={d.primary} onChange={(v) => commit({ disciplines: v.includes(d.primary) ? v : [d.primary, ...v] })} />
      <div className="mt-6 grid gap-5 @2xl:grid-cols-2">
        <div>
          <Label hint={`${d.skills.length}/12`}>{t('profile.craft.skills')}</Label>
          <TagInput value={d.skills} onChange={(skills) => commit({ skills })} suggestions={skillSugg} max={12} quickPicks={6} transform="capitalize" icon={<Sparkles className="size-4" />} />
        </div>
        <div>
          <Label hint={`${d.tools.length}/10`}>{t('profile.craft.tools')}</Label>
          <TagInput value={d.tools} onChange={(tools) => commit({ tools })} suggestions={toolSugg} max={10} quickPicks={6} icon={<Wrench className="size-4" />} />
        </div>
      </div>
    </SectionCard>
  )
}

// ───────────────────────────── rates ─────────────────────────────

export function RatesSection({ d }: { d: Designer }) {
  const t = useT()
  const lang = useLang()
  const commit = useCommit('rates')
  const update = useApp((s) => s.updateMyProfile)
  const designers = useApp((s) => s.designers)
  const [rate, setRate] = useDebouncedCommit(d.hourlyRate, (v: number) => update({ hourlyRate: v }), 'rates', 350)
  const market = useMemo(() => marketRate(designers, d.primary, ME_DESIGNER_ID), [designers, d.primary])
  const lo = 15
  const hi = 250
  const pos = (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100
  const verdict = !market ? null : rate < market.low ? 'below' : rate > market.high ? 'above' : 'within'

  return (
    <SectionCard id="rates" icon={<Wallet />} title={t('profile.rates.title')} subtitle={t('profile.rates.subtitle')}>
      <div className="grid gap-6 @2xl:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[12.5px] text-ink-3">{t('profile.rates.hourly')}</div>
              <div className="text-[44px] font-medium leading-none tracking-[-0.04em]">
                <AnimatedCounter value={rate} currency={d.currency} startOnView={false} />
                <span className="ml-1 text-[18px] text-ink-3">/h</span>
              </div>
            </div>
            <Segmented<'EUR' | 'USD'>
              size="sm"
              value={d.currency}
              onChange={(currency) => commit({ currency })}
              options={[
                { value: 'EUR', label: '€ EUR' },
                { value: 'USD', label: '$ USD' },
              ]}
            />
          </div>
          <Slider
            className="mt-5"
            value={rate}
            onChange={setRate}
            min={lo}
            max={hi}
            step={5}
            format={(v) => fmtMoney0(v, d.currency, lang)}
            ariaLabel={t('profile.rates.hourly')}
            marks={[
              { value: 25, label: fmtMoney0(25, d.currency, lang) },
              { value: 75, label: fmtMoney0(75, d.currency, lang) },
              { value: 150, label: fmtMoney0(150, d.currency, lang) },
              { value: 250, label: fmtMoney0(250, d.currency, lang) },
            ]}
          />
          {market && (
            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-ink-3">{t('profile.rates.market', { discipline: t(`core.discipline.${d.primary}`), count: market.count })}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={verdict}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-medium', verdict === 'within' ? 'bg-success-soft text-success' : 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_60%,var(--ink))]')}
                  >
                    {t(`profile.rates.verdict.${verdict}`)}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="relative h-3 rounded-full bg-[var(--surface-2)]">
                <motion.div
                  className="absolute inset-y-0 rounded-full bg-[color-mix(in_oklab,var(--success)_35%,transparent)]"
                  initial={false}
                  animate={{ left: `${pos(market.low)}%`, width: `${pos(market.high) - pos(market.low)}%` }}
                  transition={spring.smooth}
                />
                <motion.div className="absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-ink-3/60" animate={{ left: `${pos(market.median)}%` }} transition={spring.smooth} />
                <motion.div
                  className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--surface)] bg-ink shadow-md dark:bg-accent"
                  animate={{ left: `${pos(rate)}%` }}
                  transition={spring.snappy}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[11px] text-ink-3">
                <span>{fmtMoney0(market.low, d.currency, lang)}</span>
                <span>
                  {t('profile.rates.median')} {fmtMoney0(market.median, d.currency, lang)}
                </span>
                <span>{fmtMoney0(market.high, d.currency, lang)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-1">
          <div className="rounded-[18px] bg-night p-3.5 text-on-night">
            <div className="text-[12px] text-white/60">{t('profile.rates.day')}</div>
            <div className="mt-1 text-[22px] font-medium tracking-[-0.02em]">
              <AnimatedCounter value={rate * 8} currency={d.currency} startOnView={false} />
            </div>
          </div>
          <div className="tile p-3.5">
            <div className="text-[12px] text-ink-3">{t('profile.rates.project')}</div>
            <div className="mt-1 text-[22px] font-medium tracking-[-0.02em]">
              <AnimatedCounter value={rate * 20} currency={d.currency} startOnView={false} />
            </div>
          </div>
          <div className="tile col-span-2 p-3.5 @2xl:col-span-1">
            <div className="text-[12px] text-ink-3">{t('profile.rates.youKeep')}</div>
            <div className="mt-1 text-[22px] font-medium tracking-[-0.02em]">
              <AnimatedCounter value={Math.round(rate * 20 * 0.92)} currency={d.currency} startOnView={false} />
            </div>
            <div className="mt-0.5 text-[11.5px] text-ink-3">{t('profile.rates.feeHint')}</div>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 @2xl:grid-cols-2">
        <div>
          <GroupLabel>{t('profile.rates.availability')}</GroupLabel>
          <AvailabilityPicker value={d.availability} onChange={(availability) => commit({ availability })} />
        </div>
        <div className="min-w-0">
          <GroupLabel>{t('core.common.responseTime')}</GroupLabel>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <Segmented<string>
              value={String(d.responseTimeHrs)}
              onChange={(v) => commit({ responseTimeHrs: Number(v) })}
              options={RESPONSE_OPTIONS.map((h) => ({ value: String(h), label: h === 1 ? '≤ 1h' : `${h}h` }))}
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-3">{t('profile.rates.responseHint')}</p>
        </div>
      </div>
    </SectionCard>
  )
}

// ───────────────────────────── socials ─────────────────────────────

interface SocialRow {
  key: string
  label: string
  input: string
}

let rowN = 0
const rowKey = () => `sr-${++rowN}`

export function SocialsSection({ d }: { d: Designer }) {
  const t = useT()
  const update = useApp((s) => s.updateMyProfile)
  const [rows, setRows] = useState<SocialRow[]>(() => d.socials.map((s) => ({ key: rowKey(), label: s.label, input: prettyUrl(s.url) })))
  const toSocials = (list: SocialRow[]) => list.map((r) => ({ label: r.label, url: socialUrl(r.label, r.input) })).filter((s) => s.url)
  const [, commitLater] = useDebouncedCommit(d.socials, (v: Designer['socials']) => update({ socials: v }), 'socials', 600)
  const sent = useRef(JSON.stringify(d.socials))
  // external changes (reset demo, another tab) flow back into the rows
  useEffect(() => {
    const now = JSON.stringify(d.socials)
    if (now !== sent.current) {
      sent.current = now
      setRows(d.socials.map((s) => ({ key: rowKey(), label: s.label, input: prettyUrl(s.url) })))
    }
  }, [d.socials])
  const change = (next: SocialRow[]) => {
    setRows(next)
    const v = toSocials(next)
    sent.current = JSON.stringify(v)
    commitLater(v)
  }
  const used = new Set(rows.map((r) => r.label))
  const nextPlatform = SOCIAL_PLATFORMS.find((p) => !used.has(p.id))?.id ?? 'Website'
  const valid = toSocials(rows).filter((s) => isValidUrl(s.url)).length

  return (
    <SectionCard
      id="socials"
      icon={<Link2 />}
      title={t('profile.socials.title')}
      subtitle={t('profile.socials.subtitle', { count: valid })}
      action={
        <Button size="sm" variant="soft" icon={<Plus className="size-4" />} disabled={rows.length >= 8} onClick={() => change([...rows, { key: rowKey(), label: nextPlatform, input: '' }])}>
          <span className="hidden sm:inline">{t('profile.socials.add')}</span>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<Link2 />}
          title={t('profile.socials.emptyTitle')}
          description={t('profile.socials.emptyText')}
          action={
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => change([{ key: rowKey(), label: 'Behance', input: '' }])}>
              {t('profile.socials.add')}
            </Button>
          }
        />
      ) : (
        <Reorder.Group axis="y" values={rows} onReorder={change} className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <SocialRowItem
                key={r.key}
                row={r}
                onChange={(patch) => change(rows.map((x) => (x.key === r.key ? { ...x, ...patch } : x)))}
                onRemove={() => change(rows.filter((x) => x.key !== r.key))}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </SectionCard>
  )
}

function SocialRowItem({ row, onChange, onRemove }: { row: SocialRow; onChange: (p: Partial<SocialRow>) => void; onRemove: () => void }) {
  const t = useT()
  const controls = useDragControls()
  const url = socialUrl(row.label, row.input)
  const ok = isValidUrl(url)
  const ph = SOCIAL_PLATFORMS.find((p) => p.id === row.label)?.placeholder ?? 'yourname'
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      transition={spring.smooth}
      className="relative"
      whileDrag={{ scale: 1.02, boxShadow: '0 18px 40px -18px rgba(0,0,0,.45)', zIndex: 5 }}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--surface-2)]/70 p-1.5 sm:flex-nowrap">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label={t('profile.socials.drag')}
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-ink-3 hover:bg-[var(--surface-3)] active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1 sm:w-[140px] sm:flex-none">
          <Select value={row.label} onChange={(e) => onChange({ label: e.target.value })} className="h-10 rounded-xl pr-8 text-[13px]">
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </Select>
        </div>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <Input value={row.input} placeholder={ph} onChange={(e) => onChange({ input: e.target.value })} className="h-10 rounded-xl font-mono text-[12.5px]" aria-label={row.label} />
        </div>
        <span className="hidden w-6 shrink-0 justify-center sm:flex" title={ok ? t('profile.socials.valid') : t('profile.socials.invalid')}>
          <motion.span key={String(ok)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className={cn('size-2 rounded-full', ok ? 'bg-success shadow-[0_0_8px_var(--success)]' : row.input ? 'bg-warning' : 'bg-ink-4')} />
        </span>
        {ok ? (
          <a href={url} target="_blank" rel="noreferrer" aria-label={t('core.action.open')} title={url} className="hidden size-8 shrink-0 items-center justify-center rounded-xl text-ink-3 hover:bg-[var(--surface-3)] hover:text-ink sm:flex">
            <ExternalLink className="size-4" />
          </a>
        ) : null}
        <IconButton label={t('core.action.remove')} variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </Reorder.Item>
  )
}

// ───────────────────────────── reviews ─────────────────────────────

export function ReviewsSection({ d }: { d: Designer }) {
  const t = useT()
  const lang = useLang()
  const [filter, setFilter] = useState<'all' | 'top' | 'critical'>('all')
  const reviews = useMemo(() => [...d.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [d.reviews])
  const shown = reviews.filter((r) => (filter === 'top' ? r.rating >= 5 : filter === 'critical' ? r.rating <= 4 : true))
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => Math.round(r.rating) === s).length }))
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/network/${ME_DESIGNER_ID}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: t('profile.reviews.linkCopied'), description: url, tone: 'success' })
    } catch {
      toast({ title: url, tone: 'info' })
    }
  }
  return (
    <SectionCard
      id="reviews"
      saveKey={false}
      icon={<Star />}
      title={t('profile.reviews.title')}
      subtitle={t('profile.reviews.subtitle')}
      action={
        <Button size="sm" variant="glass" icon={<Share2 className="size-4" />} onClick={share}>
          <span className="hidden sm:inline">{t('profile.reviews.ask')}</span>
        </Button>
      }
    >
      {reviews.length === 0 ? (
        <EmptyState className="py-8" icon={<Star />} title={t('profile.reviews.none')} description={t('profile.reviews.noneHint')} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="rounded-[20px] bg-night p-4 text-on-night">
              <div className="text-[46px] font-medium leading-none tracking-[-0.04em]">
                <AnimatedCounter value={avg} decimals={1} />
              </div>
              <RatingStars value={avg} size={15} className="mt-2" />
              <div className="mt-2 text-[12px] text-white/60">{t('profile.stats.reviews', { count: d.reviewsCount || reviews.length })}</div>
              {d.verified && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
                  <BadgeCheck className="size-3 text-accent" />
                  {t('profile.reviews.verified')}
                </div>
              )}
            </div>
            <div className="space-y-1.5 self-center">
              {dist.map(({ s, n }, i) => (
                <div key={s} className="flex items-center gap-2.5 text-[12px]">
                  <span className="w-3 font-mono text-ink-3">{s}</span>
                  <Star className="size-3 fill-[#FFB21E] text-[#FFB21E]" />
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#FFB21E]"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: i * 0.07, ease: EASE_OUT }}
                    />
                  </div>
                  <span className="w-5 text-right font-mono text-ink-3">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <Segmented<'all' | 'top' | 'critical'>
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('profile.reviews.all'), count: reviews.length },
                { value: 'top', label: '5★', count: reviews.filter((r) => r.rating >= 5).length },
                { value: 'critical', label: '≤ 4★', count: reviews.filter((r) => r.rating <= 4).length },
              ]}
            />
          </div>
          <motion.div layout className="mt-3 grid gap-2.5 @2xl:grid-cols-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((r, i) => (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.04, duration: 0.45, ease: EASE_OUT } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  className="tile p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={r.authorAvatarSeed} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{r.authorName}</div>
                      <div className="truncate text-[12px] text-ink-3">{r.authorCompany}</div>
                    </div>
                    <span className="font-mono text-[11px] text-ink-3">{timeAgo(r.createdAt, lang)}</span>
                  </div>
                  <RatingStars value={r.rating} size={14} className="mt-2.5" />
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">“{r.text}”</p>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </SectionCard>
  )
}
