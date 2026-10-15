import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { BadgeCheck, Building2, CreditCard, FilePlus2, Globe, GripVertical, Loader2, MapPin, Palette, Pipette, Plus, ShieldCheck, Target, Trash2, UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { fmtMoney0 } from '@/features/discover/ProfileBits'
import { shortDate } from '@/lib/dates'
import { fireStars } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { DISCIPLINE_IDS, type Client, type DisciplineId } from '@/store/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Slider } from '@/components/ui/Slider'
import { Segmented } from '@/components/ui/Segmented'
import { Avatar } from '@/components/ui/Avatar'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { DisciplineIcon } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { normalizeHex, readableOn } from '@/components/ui/ColorPicker'
import { disciplineColor } from '@/theme/disciplines'
import { BioEditor } from '../shared/BioEditor'
import { BRAND_COLORS, CITY_SUGGESTIONS, INDUSTRIES, isValidUrl, polishClientBio } from '../shared/data'
import { markSaved, markSaving, useDebouncedCommit } from '../shared/saveState'
import { DataList, DisciplineChips, GroupLabel, SectionCard, TextField } from '../shared/ui'

export function useClientCommit(section: string) {
  const update = useApp((s) => s.updateClientProfile)
  return useCallback(
    (patch: Partial<Client>) => {
      markSaving(section)
      update(patch)
      window.setTimeout(() => markSaved(section), 380)
    },
    [section, update],
  )
}

// ───────────────────────────── brand ─────────────────────────────

export function BrandSection({ c }: { c: Client }) {
  const t = useT()
  const update = useApp((s) => s.updateClientProfile)
  const [color, setColor] = useDebouncedCommit(c.logoColor, (v: string) => update({ logoColor: v }), 'brand', 250)
  const [hex, setHex] = useState('')
  const pickId = useId()
  const applyHex = () => {
    const n = normalizeHex(hex)
    if (!n) {
      toast({ title: t('profile.brand.badHex'), tone: 'error' })
      return
    }
    setColor(n)
    setHex('')
  }
  return (
    <SectionCard id="brand" icon={<Palette />} title={t('profile.brand.title')} subtitle={t('profile.brand.subtitle')}>
      <div className="grid gap-6 @2xl:grid-cols-[220px_minmax(0,1fr)]">
        {/* stage */}
        <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[24px] p-6" style={{ background: `linear-gradient(150deg, color-mix(in oklab, ${color} 30%, var(--surface)), var(--surface-2))` }}>
          <motion.span
            aria-hidden
            className="absolute -inset-10 opacity-60 blur-3xl"
            animate={{ background: `radial-gradient(closest-side, ${color}, transparent)` }}
            transition={{ duration: 0.6 }}
          />
          <motion.div key={color} initial={{ scale: 0.7, rotate: -12, filter: 'blur(6px)' }} animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }} transition={spring.bouncy} className="relative">
            <Avatar kind="brand" name={c.name || '?'} color={color} seed={c.avatarSeed} size={96} className="drop-shadow-[0_16px_24px_rgba(0,0,0,.25)]" />
          </motion.div>
          <div className="relative flex items-end gap-3">
            {[28, 40, 54].map((s) => (
              <Avatar key={s} kind="brand" name={c.name || '?'} color={color} seed={c.avatarSeed} size={s} />
            ))}
          </div>
          <span className="relative rounded-full bg-[var(--surface)]/70 px-2.5 py-1 font-mono text-[11.5px] uppercase text-ink-2 backdrop-blur">{color}</span>
        </div>

        <div className="min-w-0 space-y-5">
          <TextField label={t('profile.client.company')} section="brand" value={c.name} max={40} placeholder={t('profile.client.companyPh')} onCommit={(name) => {
            if (name.trim().length >= 2) update({ name: name.trim() })
          }} error={(v) => (v.trim().length < 2 ? t('profile.client.companyRequired') : null)} />
          <div>
            <GroupLabel>{t('profile.brand.color')}</GroupLabel>
            <div className="flex flex-wrap gap-2">
              {BRAND_COLORS.map((col) => {
                const on = col.toLowerCase() === color.toLowerCase()
                return (
                  <motion.button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    whileHover={{ y: -3, scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={col}
                    aria-pressed={on}
                    className="relative size-9 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08),inset_0_1px_0_rgba(255,255,255,.4)]"
                    style={{ background: col }}
                  >
                    {on && (
                      <motion.span layoutId="brand-ring" className="absolute -inset-1 rounded-full border-2" style={{ borderColor: col }} transition={spring.pill}>
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="size-2 rounded-full" style={{ background: readableOn(col) }} />
                        </span>
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
              <label htmlFor={pickId} className="relative flex size-9 cursor-pointer items-center justify-center rounded-full border border-dashed border-line-2 text-ink-3 hover:text-ink" title={t('profile.brand.custom')}>
                <Pipette className="size-4" />
                <input id={pickId} type="color" value={normalizeHex(color) ?? '#000000'} onChange={(e) => setColor(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
            </div>
            <div className="mt-3 flex max-w-xs gap-2">
              <Input value={hex} onChange={(e) => setHex(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyHex()} placeholder="#FF6B3D" className="h-10 font-mono text-[13px]" aria-label={t('profile.brand.hex')} />
              <Button size="sm" variant="glass" className="h-10" onClick={applyHex} disabled={!hex.trim()}>
                {t('profile.brand.apply')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ───────────────────────────── company ─────────────────────────────

export function CompanySection({ c }: { c: Client }) {
  const t = useT()
  const update = useApp((s) => s.updateClientProfile)
  const [bio, setBio, flush] = useDebouncedCommit(c.bio, (v: string) => update({ bio: v }), 'company')
  return (
    <SectionCard id="company" icon={<Building2 />} title={t('profile.company.title')} subtitle={t('profile.company.subtitle')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('profile.company.contact')} section="company" value={c.contactName} icon={<UserRound />} max={40} onCommit={(contactName) => update({ contactName })} />
        <TextField label={t('profile.company.role')} section="company" value={c.contactRole} max={50} placeholder={t('profile.company.rolePh')} onCommit={(contactRole) => update({ contactRole })} />
        <TextField label={t('profile.company.industry')} section="company" value={c.industry} list="pf-industries" onCommit={(industry) => update({ industry })} />
        <DataList id="pf-industries" options={INDUSTRIES} />
        <TextField label={t('core.common.location')} section="company" value={c.location} icon={<MapPin />} list="pf-cities-c" onCommit={(location) => update({ location })} />
        <DataList id="pf-cities-c" options={CITY_SUGGESTIONS} />
        <TextField
          className="sm:col-span-2"
          label={t('profile.company.website')}
          section="company"
          value={c.website}
          icon={<Globe />}
          inputMode="url"
          placeholder="https://yourstudio.com"
          onCommit={(v) => update({ website: v && !/^https?:\/\//i.test(v) ? `https://${v}` : v })}
          error={(v) => (v && !isValidUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`) ? t('profile.company.badUrl') : null)}
        />
      </div>
      <BioEditor
        className="mt-5"
        label={t('profile.company.bio')}
        placeholder={t('profile.company.bioPh')}
        value={bio}
        onChange={setBio}
        onBlur={flush}
        checks={false}
        rows={5}
        generate={(tone, v) => polishClientBio({ name: c.name, industry: c.industry, location: c.location, disciplines: c.disciplinesNeeded, budget: c.budgetRange, currency: c.currency }, tone, v)}
      />
    </SectionCard>
  )
}

// ───────────────────────────── hiring ─────────────────────────────

export function HiringSection({ c }: { c: Client }) {
  const t = useT()
  const lang = useLang()
  const commit = useClientCommit('hiring')
  const update = useApp((s) => s.updateClientProfile)
  const designers = useApp((s) => s.designers)
  const [range, setRange] = useDebouncedCommit<[number, number]>(c.budgetRange, (v) => update({ budgetRange: v }), 'hiring', 350)
  const reach = useMemo(
    () => designers.filter((d) => d.id !== 'd-ali' && (c.disciplinesNeeded.length === 0 || d.disciplines.some((x) => c.disciplinesNeeded.includes(x)))).length,
    [designers, c.disciplinesNeeded],
  )
  const hours = Math.round(range[1] / 70)
  return (
    <SectionCard id="hiring" icon={<Target />} title={t('profile.hiring.title')} subtitle={t('profile.hiring.subtitle')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[12.5px] text-ink-3">{t('profile.client.budget')}</div>
          <div className="text-[34px] font-medium leading-none tracking-[-0.04em] sm:text-[40px]">
            <AnimatedCounter value={range[0]} currency={c.currency} startOnView={false} />
            <span className="mx-1.5 text-ink-3">–</span>
            <AnimatedCounter value={range[1]} currency={c.currency} startOnView={false} />
          </div>
        </div>
        <Segmented<'EUR' | 'USD'>
          size="sm"
          value={c.currency}
          onChange={(currency) => commit({ currency })}
          options={[
            { value: 'EUR', label: '€ EUR' },
            { value: 'USD', label: '$ USD' },
          ]}
        />
      </div>
      <Slider
        className="mt-5"
        value={range}
        onChange={setRange}
        min={0}
        max={20000}
        step={100}
        minGap={200}
        format={(v) => fmtMoney0(v, c.currency, lang)}
        ariaLabel={t('profile.client.budget')}
        marks={[0, 5000, 10000, 15000, 20000].map((v) => ({ value: v, label: formatMoney(v, c.currency, lang, true) }))}
      />
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-[18px] bg-night p-3.5 text-on-night">
          <div className="text-[12px] text-white/60">{t('profile.hiring.reach')}</div>
          <div className="mt-1 text-[24px] font-medium tracking-[-0.02em]">
            <AnimatedCounter value={reach} startOnView={false} />
          </div>
          <div className="mt-0.5 text-[11.5px] text-white/50">{t('profile.hiring.reachHint')}</div>
        </div>
        <div className="tile p-3.5">
          <div className="text-[12px] text-ink-3">{t('profile.hiring.hours')}</div>
          <div className="mt-1 text-[24px] font-medium tracking-[-0.02em]">
            ≈ <AnimatedCounter value={hours} startOnView={false} />h
          </div>
          <div className="mt-0.5 text-[11.5px] text-ink-3">{t('profile.hiring.hoursHint')}</div>
        </div>
        <div className="tile col-span-2 p-3.5 sm:col-span-1">
          <div className="text-[12px] text-ink-3">{t('profile.hiring.escrow')}</div>
          <div className="mt-1 text-[24px] font-medium tracking-[-0.02em]">
            <AnimatedCounter value={Math.round(range[1] * 0.3)} currency={c.currency} startOnView={false} />
          </div>
          <div className="mt-0.5 text-[11.5px] text-ink-3">{t('profile.hiring.escrowHint')}</div>
        </div>
      </div>
      <GroupLabel className="mt-6" right={<span className="font-mono text-[11px] text-ink-3">{c.disciplinesNeeded.length}/7</span>}>
        {t('profile.client.needs')}
      </GroupLabel>
      <DisciplineChips value={c.disciplinesNeeded} onChange={(disciplinesNeeded) => commit({ disciplinesNeeded })} />
      <div className="mt-3 flex gap-2">
        <Button size="xs" variant="ghost" onClick={() => commit({ disciplinesNeeded: [...DISCIPLINE_IDS] })}>
          {t('profile.hiring.all')}
        </Button>
        <Button size="xs" variant="ghost" onClick={() => commit({ disciplinesNeeded: [] })}>
          {t('profile.hiring.none')}
        </Button>
      </div>
    </SectionCard>
  )
}

// ───────────────────────────── open briefs ─────────────────────────────

interface BriefRow {
  key: string
  title: string
  discipline: DisciplineId
  budget: number
}
let bn = 0
const bKey = () => `br-${++bn}`
const BRIEF_IDEAS: Record<DisciplineId, string> = {
  visual: 'Campaign key visual',
  video: 'Brand film edit',
  motion: 'Logo animation',
  illustration: 'Editorial illustrations',
  brand: 'Packaging refresh',
  uiux: 'App onboarding redesign',
  '3d': 'Product renders',
}

export function BriefsSection({ c }: { c: Client }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const update = useApp((s) => s.updateClientProfile)
  const [rows, setRows] = useState<BriefRow[]>(() => c.openBriefs.map((b) => ({ key: bKey(), ...b })))
  const [, commitLater] = useDebouncedCommit(c.openBriefs, (v: Client['openBriefs']) => update({ openBriefs: v }), 'briefs', 550)
  const sent = useRef(JSON.stringify(c.openBriefs))
  useEffect(() => {
    const now = JSON.stringify(c.openBriefs)
    if (now !== sent.current) {
      sent.current = now
      setRows(c.openBriefs.map((b) => ({ key: bKey(), ...b })))
    }
  }, [c.openBriefs])
  const change = (next: BriefRow[]) => {
    setRows(next)
    const v = next.filter((r) => r.title.trim()).map(({ title, discipline, budget }) => ({ title: title.trim(), discipline, budget: Math.max(0, budget || 0) }))
    sent.current = JSON.stringify(v)
    commitLater(v)
  }
  const addRow = () => {
    const d = c.disciplinesNeeded.find((x) => !rows.some((r) => r.discipline === x)) ?? c.disciplinesNeeded[0] ?? 'visual'
    change([...rows, { key: bKey(), title: BRIEF_IDEAS[d], discipline: d, budget: Math.round((c.budgetRange[0] + c.budgetRange[1]) / 2 / 100) * 100 }])
  }
  const total = rows.reduce((n, r) => n + (r.title.trim() ? r.budget || 0 : 0), 0)
  return (
    <SectionCard
      id="briefs"
      icon={<FilePlus2 />}
      title={t('profile.briefs.title')}
      subtitle={t('profile.briefs.subtitle', { total: formatMoney(total, c.currency, lang) })}
      action={
        <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={addRow} disabled={rows.length >= 6}>
          <span className="hidden sm:inline">{t('profile.briefs.add')}</span>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<FilePlus2 />}
          title={t('profile.briefs.emptyTitle')}
          description={t('profile.briefs.emptyText')}
          action={
            <Button size="sm" icon={<Plus className="size-4" />} onClick={addRow}>
              {t('profile.briefs.add')}
            </Button>
          }
        />
      ) : (
        <Reorder.Group axis="y" values={rows} onReorder={change} className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <BriefRowItem key={r.key} row={r} currency={c.currency} onChange={(p) => change(rows.map((x) => (x.key === r.key ? { ...x, ...p } : x)))} onRemove={() => change(rows.filter((x) => x.key !== r.key))} />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-accent-softer px-4 py-3">
        <p className="text-[13px] text-ink-2">{t('profile.briefs.fullHint')}</p>
        <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={() => navigate('/brief/new')}>
          {t('profile.briefs.full')}
        </Button>
      </div>
    </SectionCard>
  )
}

function BriefRowItem({ row, currency, onChange, onRemove }: { row: BriefRow; currency: 'EUR' | 'USD'; onChange: (p: Partial<BriefRow>) => void; onRemove: () => void }) {
  const t = useT()
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      whileDrag={{ scale: 1.02, boxShadow: '0 18px 40px -18px rgba(0,0,0,.45)', zIndex: 5 }}
      className="relative"
    >
      <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-[var(--surface-2)]/70 p-1.5 @xl:grid-cols-[32px_minmax(0,1fr)_170px_130px_auto]">
        <button type="button" onPointerDown={(e) => controls.start(e)} aria-label={t('profile.socials.drag')} className="flex size-8 cursor-grab touch-none items-center justify-center rounded-xl text-ink-3 hover:bg-[var(--surface-3)]">
          <GripVertical className="size-4" />
        </button>
        <Input value={row.title} onChange={(e) => onChange({ title: e.target.value })} placeholder={t('profile.briefs.titlePh')} className="h-10 rounded-xl text-[13.5px]" aria-label={t('profile.briefs.titleLabel')} />
        <span className="@xl:hidden">
          <IconButton label={t('core.action.remove')} variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="size-4" />
          </IconButton>
        </span>
        <div className="relative col-span-2 col-start-2 flex gap-2 @xl:col-span-1 @xl:col-start-auto @xl:contents">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2">
              <DisciplineIcon id={row.discipline} size={20} />
            </span>
            <Select value={row.discipline} onChange={(e) => onChange({ discipline: e.target.value as DisciplineId })} className="h-10 rounded-xl pl-10 text-[13px]" style={{ boxShadow: `inset 3px 0 0 ${disciplineColor(row.discipline)}` }} aria-label={t('profile.work.discipline')}>
              {DISCIPLINE_IDS.map((d) => (
                <option key={d} value={d}>
                  {t(`core.discipline.${d}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-[104px] shrink-0 @xl:w-auto">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={row.budget || ''}
              onChange={(e) => onChange({ budget: Number(e.target.value) })}
              className="h-10 rounded-xl pl-8 font-mono text-[13px]"
              icon={<span className="font-mono text-[13px]">{currency === 'USD' ? '$' : '€'}</span>}
              aria-label={t('core.common.budget')}
            />
          </div>
        </div>
        <span className="hidden @xl:block">
          <IconButton label={t('core.action.remove')} variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="size-4" />
          </IconButton>
        </span>
      </div>
    </Reorder.Item>
  )
}

// ───────────────────────────── trust ─────────────────────────────

export function TrustSection({ c }: { c: Client }) {
  const t = useT()
  const lang = useLang()
  const commit = useClientCommit('trust')
  const [busy, setBusy] = useState<'verified' | 'paymentVerified' | null>(null)
  const verify = (key: 'verified' | 'paymentVerified', el: HTMLElement | null) => {
    setBusy(key)
    window.setTimeout(() => {
      commit({ [key]: true } as Partial<Client>)
      setBusy(null)
      fireStars({ from: el })
      toast({ title: t(`profile.trust.${key}Done`), tone: 'success' })
    }, 1500)
  }
  const items: { key: 'verified' | 'paymentVerified'; icon: React.ReactNode; on: boolean }[] = [
    { key: 'verified', icon: <BadgeCheck className="size-5" />, on: c.verified },
    { key: 'paymentVerified', icon: <CreditCard className="size-5" />, on: c.paymentVerified },
  ]
  return (
    <SectionCard id="trust" icon={<ShieldCheck />} title={t('profile.trust.title')} subtitle={t('profile.trust.subtitle')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <motion.div key={it.key} layout className={cn('relative overflow-hidden rounded-[22px] border p-4 transition-colors', it.on ? 'border-transparent bg-success-soft' : 'border-dashed border-line-2')}>
            <div className="flex items-start gap-3">
              <motion.span
                className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', it.on ? 'bg-success text-white' : 'bg-[var(--surface-2)] text-ink-3')}
                animate={it.on ? { rotate: [0, -12, 10, 0], scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.6 }}
              >
                {busy === it.key ? <Loader2 className="size-5 animate-spin" /> : it.icon}
              </motion.span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium">{t(`profile.trust.${it.key}`)}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">{t(`profile.trust.${it.key}Hint`)}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={busy === it.key ? 'busy' : String(it.on)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-medium', it.on ? 'text-success' : 'text-ink-3')}
                >
                  <span className={cn('size-1.5 rounded-full', it.on ? 'bg-success' : busy === it.key ? 'animate-pulse bg-warning' : 'bg-ink-4')} />
                  {busy === it.key ? t('profile.trust.checking') : it.on ? t('profile.trust.active') : t('profile.trust.inactive')}
                </motion.span>
              </AnimatePresence>
              {it.on ? (
                <Button size="xs" variant="ghost" onClick={() => commit({ [it.key]: false } as Partial<Client>)}>
                  {t('profile.trust.revoke')}
                </Button>
              ) : (
                <Button size="sm" loading={busy === it.key} disabled={!!busy} onClick={(e) => verify(it.key, e.currentTarget)}>
                  {t('profile.trust.verify')}
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="tile p-3">
          <div className="text-[11.5px] text-ink-3">{t('profile.client.hires')}</div>
          <div className="mt-1 text-[20px] font-medium">
            <AnimatedCounter value={c.hiresCount} />
          </div>
        </div>
        <div className="tile p-3">
          <div className="text-[11.5px] text-ink-3">{t('core.common.rating')}</div>
          <div className="mt-1 text-[20px] font-medium">
            <AnimatedCounter value={c.rating} decimals={1} />
          </div>
        </div>
        <div className="tile p-3">
          <div className="text-[11.5px] text-ink-3">{t('profile.stats.since')}</div>
          <div className="mt-1 truncate font-mono text-[15px] font-medium leading-[30px]">{shortDate(c.joinedAt, lang)}</div>
        </div>
      </div>
    </SectionCard>
  )
}

