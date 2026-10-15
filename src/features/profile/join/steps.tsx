import { useId, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Banknote,
  Check,
  Clock3,
  Globe,
  Heart,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Wand2,
  Wrench,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, item, spring, stagger } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { ME_CLIENT_ID, type DisciplineId } from '@/store/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import { Slider } from '@/components/ui/Slider'
import { Segmented } from '@/components/ui/Segmented'
import { FolderCard } from '@/components/ui/FolderCard'
import { DisciplineBadge, DisciplineIcon } from '@/components/ui/Badge'
import { AvatarStack } from '@/components/ui/Avatar'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { disciplineColor } from '@/theme/disciplines'
import { PortfolioFolders, fmtMoney0, useMediaViewer } from '@/features/discover/ProfileBits'
import { personOf } from '@/features/discover/model'
import { AvatarPicker } from '../shared/AvatarPicker'
import { BioEditor } from '../shared/BioEditor'
import { DiscoverCardPreview } from '../shared/DiscoverPreview'
import { WorkModal, type WorkInput } from '../shared/WorkModal'
import { AvailabilityPicker, CharCount, DataList, DisciplineChips, GroupLabel, PrimaryDisciplinePicker } from '../shared/ui'
import { CITY_SUGGESTIONS, LANGUAGE_OPTIONS, RESPONSE_OPTIONS, SKILLS, TIMEZONES, TOOLS, handleFrom, headlineIdeas, localTimeIn, marketRate, polishBio, sampleProject, suggestionsFor } from '../shared/data'
import { HEADLINE_MAX, MAX_WORKS, draftToDesigner, writingFrom, type JoinDraft } from './model'
import { uid } from '@/lib/ids'

export interface StepProps {
  d: JoinDraft
  set: (patch: Partial<JoinDraft>) => void
  errors: Record<string, string>
  show: boolean
}

export function FieldError({ code, show }: { code?: string; show: boolean }) {
  const t = useT()
  return (
    <AnimatePresence initial={false}>
      {show && code && (
        <motion.p
          key={code}
          initial={{ opacity: 0, height: 0, x: 0 }}
          animate={{ opacity: 1, height: 'auto', x: [0, -5, 5, -3, 3, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-1.5 overflow-hidden text-[12.5px] font-medium text-danger"
          role="alert"
        >
          {t(`profile.join.err.${code}`)}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

const errCls = (on: boolean) => (on ? 'border-danger focus:border-danger focus:shadow-[0_0_0_4px_var(--danger-soft)]' : '')

export function StepHeading({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <motion.div variants={item} className="mb-6">
      <span className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-accent-text">{kicker}</span>
      <h2 className="mt-1.5 text-balance text-[26px] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[32px]">{title}</h2>
      {text && <p className="mt-2 max-w-xl text-[14px] text-ink-2">{text}</p>}
    </motion.div>
  )
}

// ───────────────────────────── welcome ─────────────────────────────

export function WelcomeStep({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  const t = useT()
  const lang = useLang()
  const clients = useApp((s) => s.clients)
  const designers = useApp((s) => s.designers)
  const others = useMemo(() => clients.filter((c) => c.id !== ME_CLIENT_ID), [clients])
  const briefs = others.reduce((n, c) => n + c.openBriefs.length, 0)
  const budget = others.reduce((n, c) => n + c.openBriefs.reduce((a, b) => a + b.budget, 0), 0)
  const fresh = designers.filter((x) => x.registeredInApp).length
  const words = t('profile.join.welcome.title').split(' ')
  const benefits = [
    { icon: <Heart className="size-4" />, k: 'match' },
    { icon: <Zap className="size-4" />, k: 'briefs' },
    { icon: <MessageCircle className="size-4" />, k: 'chat' },
    { icon: <Banknote className="size-4" />, k: 'paid' },
  ]
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <motion.div variants={stagger(0.07, 0.05)} initial="hidden" animate="show">
        <motion.span variants={item} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-accent-ink">
          <Sparkles className="size-3.5" />
          {t('profile.join.welcome.kicker')}
        </motion.span>
        <h2 className="mt-4 text-[34px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[48px] xl:text-[56px]" aria-label={t('profile.join.welcome.title')}>
          {words.map((w, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="mr-[0.22em] inline-block"
              initial={{ opacity: 0, y: 28, rotate: 4, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.7, ease: EASE_OUT }}
            >
              {i === words.length - 1 ? <span className="shimmer-text">{w}</span> : w}
            </motion.span>
          ))}
        </h2>
        <motion.p variants={item} className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-2">
          {t('profile.join.welcome.text')}
        </motion.p>
        <motion.ul variants={stagger(0.06, 0.4)} className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {benefits.map((b) => (
            <motion.li key={b.k} variants={item} className="flex items-start gap-3 rounded-[18px] bg-[var(--surface-2)]/70 p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">{b.icon}</span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{t(`profile.join.welcome.b.${b.k}`)}</span>
                <span className="block text-[12px] text-ink-3">{t(`profile.join.welcome.b.${b.k}Hint`)}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div variants={item} className="mt-7 flex flex-wrap items-center gap-3">
          <Button size="lg" className="h-13" iconRight={<ArrowRight className="size-4" />} onClick={onStart}>
            {t('profile.join.welcome.cta')}
          </Button>
          <Button size="lg" variant="glass" className="h-13" icon={<Wand2 className="size-4" />} onClick={onSample}>
            {t('profile.join.sample')}
          </Button>
        </motion.div>
        <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3 text-[12.5px] text-ink-3">
          <AvatarStack seeds={others.map((c) => c.avatarSeed)} size={28} max={5} />
          <span>{t('profile.join.welcome.social', { clients: others.length, briefs, budget: formatMoney(budget, 'EUR', lang, true) })}</span>
          {fresh > 0 && <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px]">{t('profile.join.welcome.joined', { count: fresh })}</span>}
        </motion.div>
      </motion.div>

      <HeroArt />

      <motion.ol variants={stagger(0.08, 0.6)} initial="hidden" animate="show" className="grid gap-2.5 sm:grid-cols-3 lg:col-span-2">
        {['one', 'two', 'three'].map((k, i) => (
          <motion.li key={k} variants={item} className="relative flex items-center gap-3 overflow-hidden rounded-[20px] border border-line p-4">
            <span className="font-mono text-[28px] font-medium leading-none tracking-[-0.04em] text-accent-text">0{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">{t(`profile.join.how.${k}`)}</span>
              <span className="block text-[12px] text-ink-3">{t(`profile.join.how.${k}Hint`)}</span>
            </span>
            {i < 2 && <ArrowRight className="absolute right-3 hidden size-4 text-ink-4 sm:block" />}
          </motion.li>
        ))}
      </motion.ol>
    </div>
  )
}

function HeroArt() {
  const t = useT()
  const cards: { v: 'poster' | 'blob3d' | 'ui'; d: DisciplineId; x: number; r: number; delay: number }[] = [
    { v: 'poster', d: 'visual', x: -34, r: -10, delay: 0.25 },
    { v: 'blob3d', d: '3d', x: 34, r: 9, delay: 0.35 },
    { v: 'ui', d: 'uiux', x: 0, r: 0, delay: 0.45 },
  ]
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
      <motion.div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute inset-[6%] rounded-full border border-dashed border-line-2" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />
      {cards.map((c, i) => (
        <motion.div
          key={c.v}
          className="absolute left-1/2 top-1/2 w-[48%]"
          initial={{ opacity: 0, x: '-50%', y: '-30%', rotate: 0, scale: 0.6 }}
          animate={{ opacity: 1, x: `calc(-50% + ${c.x}%)`, y: i === 2 ? '-46%' : '-54%', rotate: c.r, scale: i === 2 ? 1.05 : 0.92 }}
          transition={{ ...spring.bouncy, delay: c.delay }}
          style={{ zIndex: i === 2 ? 3 : 1 }}
        >
          <motion.div animate={{ y: [0, i % 2 ? -10 : 10, 0] }} transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }} className="overflow-hidden rounded-[26px] bg-[var(--surface)] p-1.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,.55)]">
            <div className="aspect-[3/4] overflow-hidden rounded-[20px]">
              <GenerativeArt seed={`join-hero-${c.v}`} variant={c.v} discipline={c.d} playBadge={false} className="size-full" />
            </div>
          </motion.div>
        </motion.div>
      ))}
      <Floating className="left-[2%] top-[14%]" delay={0.9}>
        <Heart className="size-3.5 fill-[#ff3b6b] text-[#ff3b6b]" />
        {t('profile.join.hero.match')}
      </Floating>
      <Floating className="right-[0%] top-[30%]" delay={1.05}>
        <Zap className="size-3.5 text-accent-text" />
        {t('profile.join.hero.brief')}
      </Floating>
      <Floating className="bottom-[12%] left-[6%]" delay={1.2}>
        <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
        {t('profile.join.hero.review')}
      </Floating>
      <Floating className="bottom-[4%] right-[8%]" delay={1.35} dark>
        <BadgeCheck className="size-3.5 text-accent" />
        {t('profile.join.hero.paid')}
      </Floating>
    </div>
  )
}

function Floating({ children, className, delay, dark }: { children: ReactNode; className?: string; delay: number; dark?: boolean }) {
  return (
    <motion.div
      className={cn('absolute z-[5]', className)}
      initial={{ opacity: 0, scale: 0.6, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...spring.bouncy, delay }}
    >
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay }}
        className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium shadow-[0_12px_30px_-12px_rgba(0,0,0,.4)]', dark ? 'bg-night text-on-night' : 'glass glass-strong text-ink')}
      >
        {children}
      </motion.span>
    </motion.div>
  )
}

// ───────────────────────────── basics ─────────────────────────────

export function BasicsStep({ d, set, errors, show }: StepProps) {
  const t = useT()
  const ids = { name: useId(), email: useId(), loc: useId(), web: useId() }
  const local = localTimeIn(d.timezone)
  const handle = handleFrom(d.name)
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <StepHeading kicker={t('profile.join.basics.kicker')} title={t('profile.join.basics.title')} text={t('profile.join.basics.text')} />
      <motion.div variants={item} className="rounded-[24px] bg-[var(--surface-2)]/60 p-4 sm:p-5">
        <AvatarPicker compact seed={d.avatarSeed} media={d.avatar} onSeed={(avatarSeed) => set({ avatarSeed })} onMedia={(avatar) => set({ avatar })} size={104} />
      </motion.div>
      <motion.div variants={item} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={ids.name} hint={handle ? <span className="font-mono text-[11.5px]">{handle}</span> : undefined}>
            {t('profile.join.basics.name')} <span className="text-danger">*</span>
          </Label>
          <Input id={ids.name} value={d.name} autoComplete="name" icon={<UserRound />} placeholder={t('profile.join.basics.namePh')} onChange={(e) => set({ name: e.target.value })} className={errCls(show && !!errors.name)} aria-invalid={show && !!errors.name} />
          <FieldError code={errors.name} show={show} />
        </div>
        <div>
          <Label htmlFor={ids.email} hint={t('profile.join.basics.emailHint')}>
            {t('profile.join.basics.email')} <span className="text-danger">*</span>
          </Label>
          <Input id={ids.email} type="email" inputMode="email" autoComplete="email" value={d.email} icon={<Mail />} placeholder="you@studio.com" onChange={(e) => set({ email: e.target.value })} className={errCls(show && !!errors.email)} aria-invalid={show && !!errors.email} />
          <FieldError code={errors.email} show={show} />
        </div>
        <div>
          <Label htmlFor={ids.loc}>
            {t('core.common.location')} <span className="text-danger">*</span>
          </Label>
          <Input id={ids.loc} value={d.location} list="join-cities" icon={<MapPin />} placeholder="Lisbon, PT" onChange={(e) => set({ location: e.target.value })} className={errCls(show && !!errors.location)} aria-invalid={show && !!errors.location} />
          <DataList id="join-cities" options={CITY_SUGGESTIONS} />
          <FieldError code={errors.location} show={show} />
        </div>
        <div>
          <Label hint={local ? <span className="inline-flex items-center gap-1 font-mono text-[11.5px]"><Clock3 className="size-3" />{local}</span> : undefined}>{t('profile.identity.timezone')}</Label>
          <Select value={d.timezone} onChange={(e) => set({ timezone: e.target.value })}>
            {TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.id} · {tz.offset} · {tz.city}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label hint={`${d.languages.length}/8`}>{t('core.common.languages')}</Label>
          <TagInput value={d.languages} onChange={(languages) => set({ languages })} suggestions={LANGUAGE_OPTIONS} max={8} quickPicks={5} transform="capitalize" icon={<Languages className="size-4" />} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={ids.web} hint={t('profile.work.optional')}>
            {t('profile.join.basics.website')}
          </Label>
          <Input id={ids.web} value={d.website} inputMode="url" icon={<Globe />} placeholder="behance.net/yourname" onChange={(e) => set({ website: e.target.value })} className={errCls(show && !!errors.website)} />
          <FieldError code={errors.website} show={show} />
        </div>
      </motion.div>
    </motion.div>
  )
}

// ───────────────────────────── craft ─────────────────────────────

export function CraftStep({ d, set, errors, show }: StepProps) {
  const t = useT()
  const lang = useLang()
  const designers = useApp((s) => s.designers)
  const primary = d.primary
  const skillSugg = useMemo(() => (primary ? suggestionsFor(SKILLS, primary, d.disciplines) : []), [primary, d.disciplines])
  const toolSugg = useMemo(() => (primary ? suggestionsFor(TOOLS, primary, d.disciplines) : []), [primary, d.disciplines])
  const market = useMemo(() => (primary ? marketRate(designers, primary) : null), [designers, primary])
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <StepHeading kicker={t('profile.join.craft.kicker')} title={t('profile.join.craft.title')} text={t('profile.join.craft.text')} />
      <motion.div variants={item}>
        <GroupLabel>
          {t('profile.craft.primary')} <span className="text-danger">*</span>
        </GroupLabel>
        <PrimaryDisciplinePicker
          value={primary}
          onChange={(p) => set({ primary: p, disciplines: d.disciplines.includes(p) ? d.disciplines : [p, ...d.disciplines] })}
          className={cn(show && errors.primary && 'rounded-[20px] ring-2 ring-danger ring-offset-4 ring-offset-[var(--surface)]')}
        />
        <FieldError code={errors.primary} show={show} />
      </motion.div>
      <AnimatePresence initial={false}>
        {primary && (
          <motion.div initial={{ opacity: 0, height: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }} transition={{ duration: 0.45, ease: EASE_OUT }} className="overflow-hidden">
            <GroupLabel className="mt-6">{t('profile.join.craft.also')}</GroupLabel>
            <DisciplineChips value={d.disciplines} locked={primary} onChange={(v) => set({ disciplines: v.includes(primary) ? v : [primary, ...v] })} />
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <Label hint={`${d.skills.length}/12`}>
                  {t('profile.craft.skills')} <span className="text-danger">*</span>
                </Label>
                <TagInput value={d.skills} onChange={(skills) => set({ skills })} suggestions={skillSugg} max={12} quickPicks={6} transform="capitalize" icon={<Sparkles className="size-4" />} className={cn(show && errors.skills && 'rounded-2xl ring-2 ring-danger')} />
                <FieldError code={errors.skills} show={show} />
              </div>
              <div>
                <Label hint={`${d.tools.length}/10`}>{t('profile.craft.tools')}</Label>
                <TagInput value={d.tools} onChange={(tools) => set({ tools })} suggestions={toolSugg} max={10} quickPicks={6} icon={<Wrench className="size-4" />} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div variants={item} className="mt-7 rounded-[24px] bg-[var(--surface-2)]/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[12.5px] text-ink-3">{t('profile.rates.hourly')}</div>
            <div className="text-[38px] font-medium leading-none tracking-[-0.04em]">
              {fmtMoney0(d.hourlyRate, d.currency, lang)}
              <span className="ml-1 text-[16px] text-ink-3">/h</span>
            </div>
          </div>
          <Segmented<'EUR' | 'USD'>
            size="sm"
            value={d.currency}
            onChange={(currency) => set({ currency })}
            options={[
              { value: 'EUR', label: '€ EUR' },
              { value: 'USD', label: '$ USD' },
            ]}
          />
        </div>
        <Slider className="mt-4" value={d.hourlyRate} onChange={(hourlyRate: number) => set({ hourlyRate })} min={15} max={250} step={5} format={(v) => fmtMoney0(v, d.currency, lang)} ariaLabel={t('profile.rates.hourly')} />
        {market && primary && (
          <p className="mt-3 text-[12.5px] text-ink-3">
            {t('profile.join.craft.market', { discipline: t(`core.discipline.${primary}`), low: fmtMoney0(market.low, d.currency, lang), high: fmtMoney0(market.high, d.currency, lang) })}
          </p>
        )}
        <FieldError code={errors.rate} show={show} />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <GroupLabel>{t('profile.rates.availability')}</GroupLabel>
            <AvailabilityPicker value={d.availability} onChange={(availability) => set({ availability })} />
          </div>
          <div className="min-w-0">
            <GroupLabel>{t('core.common.responseTime')}</GroupLabel>
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
              <Segmented<string> value={String(d.responseTimeHrs)} onChange={(v) => set({ responseTimeHrs: Number(v) })} options={RESPONSE_OPTIONS.map((h) => ({ value: String(h), label: h === 1 ? '≤ 1h' : `${h}h` }))} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ───────────────────────────── story ─────────────────────────────

export function StoryStep({ d, set, errors, show }: StepProps) {
  const t = useT()
  const id = useId()
  const [v, setV] = useState(0)
  const ideas = useMemo(() => headlineIdeas(writingFrom(d), v), [d, v])
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <StepHeading kicker={t('profile.join.story.kicker')} title={t('profile.join.story.title')} text={t('profile.join.story.text')} />
      <motion.div variants={item}>
        <Label htmlFor={id} hint={<CharCount value={d.headline.length} max={HEADLINE_MAX} />}>
          {t('profile.identity.headline')} <span className="text-danger">*</span>
        </Label>
        <Input id={id} value={d.headline} placeholder={t('profile.identity.headlinePh')} onChange={(e) => set({ headline: e.target.value })} className={errCls(show && !!errors.headline)} aria-invalid={show && !!errors.headline} />
        <FieldError code={errors.headline} show={show} />
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.05 } }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => set({ headline: idea })}
                className="max-w-full truncate rounded-full border border-line-2 px-3 py-1 text-[12.5px] text-ink-2 hover:border-[var(--accent-line)] hover:text-ink"
              >
                {idea}
              </motion.button>
            ))}
          </AnimatePresence>
          <IconButton label={t('profile.identity.moreIdeas')} size="sm" variant="soft" onClick={() => setV((x) => x + 1)}>
            <RefreshCw className="size-3.5" />
          </IconButton>
        </div>
      </motion.div>
      <motion.div variants={item} className="mt-7">
        <BioEditor value={d.bio} onChange={(bio) => set({ bio })} generate={(tone, n) => polishBio(writingFrom(d), tone, n)} rows={8} error={show && errors.bio ? t(`profile.join.err.${errors.bio}`) : undefined} />
      </motion.div>
    </motion.div>
  )
}

// ───────────────────────────── past work ─────────────────────────────

export function WorkStep({ d, set, errors, show }: StepProps) {
  const t = useT()
  const [modal, setModal] = useState<{ key?: string } | null>(null)
  const [sampleN, setSampleN] = useState(0)
  const primary = d.primary ?? 'visual'
  const editing = modal?.key ? d.works.find((w) => w.key === modal.key) : undefined
  const save = (input: WorkInput) => {
    if (modal?.key) set({ works: d.works.map((w) => (w.key === modal.key ? { ...input, key: w.key } : w)) })
    else set({ works: [...d.works, { ...input, key: uid('jw_') }] })
    setModal(null)
  }
  const addSample = () => {
    const disc = d.disciplines[sampleN % Math.max(1, d.disciplines.length)] ?? primary
    set({ works: [...d.works, { ...sampleProject(disc, sampleN), key: uid('jw_') }] })
    setSampleN((n) => n + 1)
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= d.works.length) return
    const works = [...d.works]
    ;[works[i], works[j]] = [works[j], works[i]]
    set({ works })
  }
  const full = d.works.length >= MAX_WORKS
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <StepHeading kicker={t('profile.join.work.kicker')} title={t('profile.join.work.title')} text={t('profile.join.work.text', { max: MAX_WORKS })} />
      <motion.div variants={item} className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: MAX_WORKS }, (_, i) => (
              <motion.span key={i} className="h-2 w-6 rounded-full" animate={{ background: i < d.works.length ? 'var(--accent)' : 'var(--surface-3)', scaleY: i === d.works.length - 1 ? [1, 1.6, 1] : 1 }} transition={{ duration: 0.4 }} />
            ))}
          </div>
          <span className="font-mono text-[12px] text-ink-3">
            {d.works.length}/{MAX_WORKS}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="glass" icon={<Wand2 className="size-4" />} onClick={addSample} disabled={full}>
            {t('profile.portfolio.sample')}
          </Button>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModal({})} disabled={full}>
            {t('profile.addWork')}
          </Button>
        </div>
      </motion.div>
      <FieldError code={errors.works} show={show} />
      <motion.div variants={item} className="grid grid-cols-2 items-start justify-items-center gap-x-3 gap-y-9 pt-9 sm:gap-x-5 md:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {d.works.map((w, i) => (
            <motion.div
              key={w.key}
              layout
              initial={{ opacity: 0, scale: 0.6, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.6, filter: 'blur(8px)', transition: { duration: 0.2 } }}
              transition={spring.bouncy}
              className="relative flex w-full justify-center"
            >
              <div className="relative w-full max-w-[250px]">
                <FolderCard
                  size="md"
                  items={[w.cover, ...w.media.filter((m) => m !== w.cover)]}
                  title={w.title}
                  subtitle={[w.client, w.year].filter(Boolean).join(' · ')}
                  color={disciplineColor(w.discipline)}
                  icon={<DisciplineIcon id={w.discipline} size={22} />}
                  onClick={() => setModal({ key: w.key })}
                />
                {i === 0 && (
                  <span className="pointer-events-none absolute -top-6 left-1 z-20 inline-flex items-center gap-1 rounded-full bg-night px-2 py-0.5 text-[11px] font-medium text-on-night">
                    <Sparkles className="size-3 text-accent" />
                    {t('profile.join.work.cover')}
                  </span>
                )}
                <div className="absolute -top-3 right-0 z-20 flex gap-1">
                  {i > 0 && (
                    <IconButton label={t('profile.work.moveLeft')} size="sm" onClick={() => move(i, -1)}>
                      <ArrowRight className="size-3.5 rotate-180" />
                    </IconButton>
                  )}
                  <IconButton label={t('core.action.edit')} size="sm" onClick={() => setModal({ key: w.key })}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label={t('core.action.remove')} size="sm" onClick={() => set({ works: d.works.filter((x) => x.key !== w.key) })}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </div>
            </motion.div>
          ))}
          {!full && (
            <motion.button
              key="add"
              layout
              type="button"
              onClick={() => setModal({})}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'group flex aspect-[5/4.1] w-full max-w-[250px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed text-ink-3 transition-colors hover:border-[var(--accent)] hover:bg-accent-softer hover:text-ink',
                show && errors.works ? 'border-danger' : 'border-line-2',
              )}
            >
              <motion.span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-ink" animate={d.works.length === 0 ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity }}>
                <Plus className="size-5" />
              </motion.span>
              <span className="text-[13px] font-medium">{d.works.length ? t('profile.join.work.another') : t('profile.join.work.first')}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
      <WorkModal open={!!modal} mode={modal?.key ? 'edit' : 'add'} initial={editing} defaultDiscipline={primary} onClose={() => setModal(null)} onSave={save} />
    </motion.div>
  )
}

// ───────────────────────────── preview ─────────────────────────────

export function PreviewStep({ d, set, errors, show, goTo, joinedAt }: StepProps & { goTo: (i: number) => void; joinedAt: string }) {
  const t = useT()
  const lang = useLang()
  const viewer = useMediaViewer()
  const designer = useMemo(() => draftToDesigner(d, joinedAt), [d, joinedAt])
  const person = personOf(designer)
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <StepHeading kicker={t('profile.join.preview.kicker')} title={t('profile.join.preview.title')} text={t('profile.join.preview.text')} />
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <motion.div variants={item}>
          <div className="lg:sticky lg:top-4">
            <DiscoverCardPreview person={person} />
          </div>
        </motion.div>
        <div className="min-w-0 space-y-3">
          <Summary title={t('profile.join.steps.basics')} onEdit={() => goTo(1)}>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">{designer.name}</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
                <AtSign className="size-3.5 text-ink-3" />
                {designer.handle.replace(/^@/, '')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 text-ink-3" />
                {d.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ink-3" />
                {d.location} · {d.timezone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="size-3.5 text-ink-3" />
                {d.languages.join(', ')}
              </span>
            </div>
          </Summary>
          <Summary title={t('profile.join.steps.craft')} onEdit={() => goTo(2)}>
            <div className="flex flex-wrap gap-1.5">
              {designer.disciplines.map((x) => (
                <DisciplineBadge key={x} id={x} />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[...d.skills, ...d.tools].map((s) => (
                <span key={s} className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[12px] text-ink-2">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-2.5 font-mono text-[12.5px] text-ink-2">
              {fmtMoney0(d.hourlyRate, d.currency, lang)}/h · {t(`core.availability.${d.availability}`)} · {t('profile.join.preview.replies', { h: d.responseTimeHrs })}
            </div>
          </Summary>
          <Summary title={t('profile.join.steps.story')} onEdit={() => goTo(3)}>
            <p className="text-[14px] font-medium">{d.headline}</p>
            <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-[13px] text-ink-2">{d.bio}</p>
          </Summary>
          <Summary title={t('profile.join.preview.portfolio', { count: d.works.length })} onEdit={() => goTo(4)}>
            <PortfolioFolders person={person} onOpen={viewer.open} size="sm" cols="grid-cols-2 sm:grid-cols-3" className="pt-4" />
          </Summary>
          <motion.label variants={item} className={cn('flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition-colors', d.agree ? 'border-transparent bg-accent-soft' : show && errors.agree ? 'border-danger' : 'border-line-2')}>
            <input type="checkbox" checked={d.agree} onChange={(e) => set({ agree: e.target.checked })} className="peer sr-only" />
            <motion.span
              className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]', d.agree ? 'border-ink bg-ink text-[var(--surface)] dark:border-accent dark:bg-accent dark:text-accent-ink' : 'border-line-2')}
              animate={{ scale: d.agree ? [0.8, 1.15, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {d.agree && <Check className="size-4" strokeWidth={3} />}
            </motion.span>
            <span className="text-[13.5px] text-ink-2">
              <span className="font-medium text-ink">{t('profile.join.preview.agree')}</span>
              <span className="mt-0.5 block text-[12.5px] text-ink-3">{t('profile.join.preview.agreeHint')}</span>
            </span>
          </motion.label>
          <FieldError code={errors.agree} show={show} />
          <motion.div variants={item} className="flex items-center gap-2 rounded-[18px] bg-night px-4 py-3 text-[12.5px] text-on-night">
            <Rocket className="size-4 shrink-0 text-accent" />
            {t('profile.join.preview.next')}
          </motion.div>
        </div>
      </div>
      {viewer.element}
    </motion.div>
  )
}

function Summary({ title, children, onEdit }: { title: string; children: ReactNode; onEdit: () => void }) {
  const t = useT()
  return (
    <motion.section variants={item} className="rounded-[22px] border border-line p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-3">{title}</h3>
        <Button size="xs" variant="ghost" icon={<Pencil className="size-3" />} onClick={onEdit}>
          {t('core.action.edit')}
        </Button>
      </div>
      {children}
    </motion.section>
  )
}
