import { useState } from 'react'
import { motion } from 'motion/react'
import { Bell, Check, Copy, Filter, Heart, Inbox, MoreHorizontal, Plus, Send, Settings2, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { stagger, item } from '@/lib/motion'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { BOARD_STATUSES, type GlassLevel, type Lang, type MotionLevel, type ThemeMode } from '@/store/types'
import { Glass, CardHeader } from '@/components/ui/Glass'
import { Button, IconButton } from '@/components/ui/Button'
import { CountBadge, DisciplineBadge, DisciplineIcon, Kbd, Pill, PriorityBadge, RiskBadge, StatusBadge } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { Menu } from '@/components/ui/Menu'
import { Drawer, Modal } from '@/components/ui/Overlay'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dropzone } from '@/components/ui/Dropzone'
import { Chip, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Marquee } from '@/components/ui/Marquee'
import { DISCIPLINE_ONLY } from '@/theme/disciplines'
import { ChartsSection, FoldersSection, GaugeSection } from './KitShowcase'
import { FeedbackSection, InputsSection, LightboxSection, MarqueeSection, StepperSection } from './KitInputs'
import { Demo, Section } from './kitUi'

const NAV = [
  ['folders', 'Folders'],
  ['gauge', 'Gauge'],
  ['charts', 'Charts'],
  ['inputs', 'Inputs'],
  ['stepper', 'Stepper'],
  ['lightbox', 'Lightbox'],
  ['feedback', 'Feedback'],
  ['marquee', 'Marquee'],
  ['primitives', 'Primitives'],
] as const

/**
 * /kit — living gallery of every designTab component with live controls.
 * Dev/QA page: copy is intentionally English-only.
 */
export default function KitPage() {
  return (
    // lang="en": the kit's own copy is English-only (keeps CSS uppercase correct under tr)
    <motion.div lang="en" variants={stagger(0.06)} initial="hidden" animate="show" className="flex flex-col gap-4">
      <Hero />
      <FoldersSection />
      <GaugeSection />
      <ChartsSection />
      <InputsSection />
      <StepperSection />
      <LightboxSection />
      <FeedbackSection />
      <MarqueeSection />
      <PrimitivesSection />
    </motion.div>
  )
}

function Hero() {
  const settings = useApp((s) => s.settings)
  const setSettings = useApp((s) => s.setSettings)
  const jump = (id: string) => document.getElementById(`kit-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <motion.div variants={item}>
      <Glass spotlight className="overflow-hidden p-5 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[var(--accent)] opacity-30 blur-[90px]" />
        <div className="relative z-[1] grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div className="min-w-0">
            <Pill tone="night" icon={<Sparkles className="size-3.5" />}>
              designTab UI kit
            </Pill>
            <h2 className="mt-4 text-balance text-[30px] font-medium leading-[1.05] tracking-[-0.04em] sm:text-[44px]">
              <span className="shimmer-text">Liquid glass</span> components, wired for motion.
            </h2>
            <p className="mt-3 max-w-xl text-[14px] text-ink-2">
              Every component in the product, with live controls. Switch the discipline tab above to re-theme everything — Photoshop blue, Premiere violet, Illustrator orange…
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {NAV.map(([id, label]) => (
                <Chip key={id} onClick={() => jump(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: 12, l: 'new components' },
              { n: 6, l: 'chart types' },
              { n: 3, l: 'languages' },
            ].map((s) => (
              <Glass key={s.l} variant="tile" className="p-3.5">
                <div className="text-[28px] font-medium leading-none tracking-[-0.04em]">
                  <AnimatedCounter value={s.n} />
                </div>
                <div className="mt-1 text-[12px] text-ink-3">{s.l}</div>
              </Glass>
            ))}
          </div>
        </div>

        {/* QA toolbar */}
        <div className="relative z-[1] mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
          <Settings2 className="size-4 text-ink-3" />
          <Segmented
            size="sm"
            value={settings.theme}
            onChange={(v: ThemeMode) => setSettings({ theme: v })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <Segmented
            size="sm"
            value={settings.motion}
            onChange={(v: MotionLevel) => setSettings({ motion: v })}
            options={[
              { value: 'expressive', label: 'Expressive' },
              { value: 'subtle', label: 'Subtle' },
              { value: 'off', label: 'Off' },
            ]}
          />
          <Segmented
            size="sm"
            value={settings.glass}
            onChange={(v: GlassLevel) => setSettings({ glass: v })}
            options={[
              { value: 'clear', label: 'Clear' },
              { value: 'frosted', label: 'Frosted' },
              { value: 'solid', label: 'Solid' },
            ]}
          />
          <Segmented
            size="sm"
            value={settings.lang}
            onChange={(v: Lang) => setSettings({ lang: v })}
            options={[
              { value: 'en', label: 'EN' },
              { value: 'de', label: 'DE' },
              { value: 'tr', label: 'TR' },
            ]}
          />
        </div>
        <div className="relative z-[1] mt-5">
          <Marquee speed={30} gap={10} ariaLabel="Disciplines">
            {DISCIPLINE_ONLY.map((d) => (
              <span key={d.id} className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] py-1 pl-1 pr-3 text-[12.5px] font-medium text-ink-2">
                <DisciplineIcon id={d.id} size={22} />
                {d.inspiredBy}
              </span>
            ))}
          </Marquee>
        </div>
      </Glass>
    </motion.div>
  )
}

// ─────────────────────────── Existing primitives ───────────────────────────

function PrimitivesSection() {
  const [seg, setSeg] = useState<'today' | '7d' | '30d'>('7d')
  const [on, setOn] = useState(true)
  const [count, setCount] = useState(1284)
  const [progress, setProgress] = useState(78)
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState<null | 'right' | 'bottom'>(null)
  const [files, setFiles] = useState<string[]>([])
  const [chips, setChips] = useState<string[]>(['Minimal'])
  const designers = useApp((s) => s.designers)

  return (
    <Section id="primitives" kicker="Primitives" title="The base layer" description="Existing building blocks from src/components/ui, for reference.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Demo label="Button">
          <div className="flex flex-wrap gap-2">
            <Button icon={<Plus className="size-4" />}>New brief</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="glass">Glass</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={<Trash2 className="size-4" />}>
              Delete
            </Button>
            <Button loading>Saving</Button>
            <Button size="xs">XS</Button>
            <Button size="sm">Small</Button>
            <Button size="lg" iconRight={<Send className="size-4" />}>
              Large
            </Button>
          </div>
        </Demo>
        <Demo label="IconButton · Tooltip · Menu">
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip content="Notifications">
              <IconButton label="Notifications" badge>
                <Bell className="size-4.5" />
              </IconButton>
            </Tooltip>
            <IconButton label="Filters" variant="soft">
              <Filter className="size-4" />
            </IconButton>
            <IconButton label="Inbox" variant="primary">
              <Inbox className="size-4" />
            </IconButton>
            <IconButton label="Like" variant="ghost" onClick={() => toast({ title: 'Liked', tone: 'match' })}>
              <Heart className="size-4" />
            </IconButton>
            <Menu
              trigger={({ onClick }) => (
                <IconButton label="More" variant="soft" onClick={onClick}>
                  <MoreHorizontal className="size-4" />
                </IconButton>
              )}
              items={[
                { label: 'Copy link', icon: <Copy />, onClick: () => toast({ title: 'Link copied', tone: 'success' }) },
                { label: 'Mark done', icon: <Check />, hint: '⌘D' },
                { divider: true, label: '' },
                { label: 'Delete', icon: <Trash2 />, danger: true, onClick: () => toast({ title: 'Deleted', tone: 'error' }) },
              ]}
            />
            <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
        </Demo>
        <Demo label="Badges">
          <div className="flex flex-wrap gap-1.5">
            {BOARD_STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            <PriorityBadge priority="urgent" />
            <PriorityBadge priority="medium" />
            <RiskBadge level="high" />
            <RiskBadge level="low" />
            <Pill tone="accent" dot>
              7 need attention
            </Pill>
            <Pill tone="night">AI</Pill>
            <Pill tone="info">Info</Pill>
            <CountBadge>128</CountBadge>
            <DisciplineBadge id="video" />
            <DisciplineBadge id="3d" />
          </div>
        </Demo>
        <Demo label="Segmented · Toggle · Chip">
          <div className="space-y-4">
            <Segmented
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'today', label: 'Today' },
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days', count: 12 },
              ]}
            />
            <div className="flex items-center gap-3">
              <Toggle checked={on} onChange={setOn} label="AI assistant" />
              <Toggle checked={!on} onChange={(v) => setOn(!v)} tone="accent" size="sm" label="Accent toggle" />
              <span className="text-[13px] text-ink-2">{on ? 'On' : 'Off'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Minimal', 'Playful', 'Bold', 'Retro'].map((c) => (
                <Chip key={c} active={chips.includes(c)} onClick={() => setChips((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        </Demo>
        <Demo label="Progress · AnimatedCounter">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[36px] font-medium tracking-[-0.04em]">
                <AnimatedCounter value={count} />
              </span>
              <div className="ml-auto flex gap-1.5">
                <Button size="xs" variant="soft" onClick={() => setCount((c) => c + Math.round(Math.random() * 500))}>
                  +
                </Button>
                <Button size="xs" variant="soft" onClick={() => setCount((c) => Math.max(0, c - Math.round(Math.random() * 500)))}>
                  −
                </Button>
              </div>
            </div>
            <ProgressBar value={progress} showLabel />
            <ProgressBar value={progress} tone="accent" height={6} />
            <div className="flex items-center gap-3">
              <ProgressRing value={progress} size={52} stroke={6}>
                <span className="text-[12px] font-medium">{progress}%</span>
              </ProgressRing>
              <ProgressRing value={100 - progress} size={40} color="var(--ink)" />
              <Button size="xs" variant="outline" onClick={() => setProgress(Math.round(Math.random() * 100))}>
                Shuffle
              </Button>
            </div>
          </div>
        </Demo>
        <Demo label="Avatar · AvatarStack">
          <div className="flex flex-wrap items-center gap-3">
            {designers.slice(0, 3).map((d, i) => (
              <Avatar key={d.id} seed={d.avatarSeed} media={d.avatar} size={44} status={(['online', 'away', 'offline'] as const)[i]} />
            ))}
            <Avatar kind="brand" name="Northlight Studio" color="#5B5BD6" seed="north" size={44} />
            <AvatarStack seeds={designers.slice(0, 7).map((d) => d.avatarSeed)} />
          </div>
        </Demo>
        <Demo label="Field · Input · Select · Textarea">
          <div className="space-y-3">
            <Field label="Project title" hint="Required">
              <Input placeholder="e.g. Spring campaign key visual" />
            </Field>
            <Field label="Discipline">
              <Select defaultValue="visual">
                {DISCIPLINE_ONLY.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.inspiredBy}
                  </option>
                ))}
              </Select>
            </Field>
            <Textarea placeholder="Describe the brief…" className="min-h-[80px]" />
          </div>
        </Demo>
        <Demo label="Modal · Drawer · EmptyState">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setModal(true)}>
              Modal
            </Button>
            <Button variant="outline" onClick={() => setDrawer('right')}>
              Drawer
            </Button>
            <Button variant="outline" onClick={() => setDrawer('bottom')}>
              Bottom sheet
            </Button>
          </div>
          <EmptyState icon={<Inbox />} title="No requests yet" description="New job requests from clients land here." className="py-6" />
          <Modal open={modal} onClose={() => setModal(false)} title="Liquid glass modal" description="Bottom sheet on phones." footer={<Button onClick={() => setModal(false)}>Done</Button>}>
            <p className="text-[14px] text-ink-2">Modal content. Press Esc or click the backdrop to close.</p>
          </Modal>
          <Drawer open={drawer !== null} onClose={() => setDrawer(null)} side={drawer ?? 'right'} title="Drawer">
            <div className="p-5 text-[14px] text-ink-2">Drawer content — drag the bottom sheet down to dismiss.</div>
          </Drawer>
        </Demo>
        <Demo label="Dropzone">
          <Dropzone onFiles={(f) => setFiles(f.map((x) => x.name))} compact />
          {files.length > 0 && <p className="mt-2 truncate font-mono text-[11.5px] text-ink-3">{files.join(', ')}</p>}
        </Demo>
        <Demo label="Glass variants" className="md:col-span-2 xl:col-span-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(['card', 'glass', 'strong', 'night', 'accent'] as const).map((v) => (
              <Glass key={v} variant={v} spotlight tilt interactive className="p-4">
                {v === 'night' || v === 'accent' ? (
                  <div className="relative z-[1]">
                    <h3 className="text-[19px] font-medium tracking-[-0.02em]">{v}</h3>
                    <p className="mt-0.5 text-[13px] opacity-60">spotlight · tilt</p>
                  </div>
                ) : (
                  <CardHeader title={v} subtitle="spotlight · tilt" />
                )}
                <p className={cn('relative z-[1] mt-6 truncate font-mono text-[11px]', v === 'night' ? 'text-white/50' : 'opacity-60')}>variant=&quot;{v}&quot;</p>
              </Glass>
            ))}
          </div>
        </Demo>
      </div>
    </Section>
  )
}
