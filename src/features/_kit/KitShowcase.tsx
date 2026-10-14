import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronRight, FileUp, Shuffle } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { FolderCard } from '@/components/ui/FolderCard'
import { Gauge } from '@/components/ui/Gauge'
import { Lightbox } from '@/components/ui/Lightbox'
import { Glass } from '@/components/ui/Glass'
import { Button, IconButton } from '@/components/ui/Button'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { Slider } from '@/components/ui/Slider'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AreaChart, BarChart, DonutChart, Heatmap, PipelineBar, Sparkline } from '@/components/charts'
import { saveFile } from '@/lib/files'
import { formatMoney } from '@/lib/format'
import { prng } from '@/lib/random'
import { fireConfetti } from '@/lib/confetti'
import { toast } from '@/store/toasts'
import { useLang } from '@/i18n'
import { disciplineColor } from '@/theme/disciplines'
import type { MediaRef } from '@/store/types'
import { Control, Demo, Section, art } from './kitUi'

// ─────────────────────────── Folders ───────────────────────────

const FOLDERS: { title: string; color?: string; disc: Parameters<typeof disciplineColor>[0]; items: MediaRef[] }[] = [
  { title: 'Brand refresh', disc: 'brand', items: [art('br-1', 'logo', 'brand'), art('br-2', 'poster', 'brand'), art('br-3', 'type', 'brand'), art('br-4', 'pattern', 'brand'), art('br-5', 'mesh', 'brand')] },
  { title: 'Launch film', disc: 'video', items: [art('vd-1', 'video', 'video'), art('vd-2', 'photo', 'video'), art('vd-3', 'poster', 'video')] },
  { title: 'Checkout UI', disc: 'uiux', items: [art('ux-1', 'ui', 'uiux'), art('ux-2', 'ui', 'uiux')] },
  { title: 'Campaign key visuals', disc: 'visual', items: [art('vi-1', 'poster', 'visual'), art('vi-2', 'mesh', 'visual'), art('vi-3', 'photo', 'visual'), art('vi-4', 'blob3d', 'visual')] },
  { title: 'Picture book', disc: 'illustration', items: [art('il-1', 'illustration', 'illustration')] },
  { title: 'Product renders', disc: '3d', items: [art('3d-1', 'blob3d', '3d'), art('3d-2', 'mesh', '3d'), art('3d-3', 'blob3d', '3d')] },
]

export function FoldersSection() {
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [forceOpen, setForceOpen] = useState(false)
  const [tint, setTint] = useState<'discipline' | 'accent' | 'ink'>('discipline')
  const [count, setCount] = useState(3)
  const [viewer, setViewer] = useState<{ items: MediaRef[]; title: string; index: number } | null>(null)
  const [dropped, setDropped] = useState<MediaRef[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const color = (d: (typeof FOLDERS)[number]['disc']) => (tint === 'accent' ? undefined : tint === 'ink' ? 'var(--ink)' : disciplineColor(d))
  const grid = size === 'lg' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : size === 'md' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6'

  return (
    <Section
      id="folders"
      kicker="Signature · FolderCard"
      title="Folders that open up"
      description="Hover (or focus, or tap on touch) — the liquid-glass flap tilts open in 3D while the papers spring up and fan out. Click opens the lightbox. The last folder accepts dropped files."
      actions={
        <>
          <Segmented size="sm" value={size} onChange={setSize} options={[{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }]} />
          <Segmented
            size="sm"
            value={tint}
            onChange={setTint}
            options={[
              { value: 'discipline', label: 'Discipline' },
              { value: 'accent', label: 'Accent' },
              { value: 'ink', label: 'Ink' },
            ]}
          />
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Control label="Force open">
          <Toggle checked={forceOpen} onChange={setForceOpen} size="sm" label="Force open" />
        </Control>
        <div className="w-56">
          <Slider value={count} onChange={setCount} min={0} max={5} label="Papers in first folder" bubble="never" />
        </div>
      </div>
      <div className={`grid items-start justify-items-center gap-x-6 gap-y-10 ${grid}`}>
        {FOLDERS.map((f, i) => {
          const items = i === 0 ? f.items.slice(0, count) : f.items
          return (
            <div key={f.title} data-folder={f.title} className="flex w-full justify-center">
            <FolderCard
              title={f.title}
              subtitle={`${items.length} file${items.length === 1 ? '' : 's'} · ${['2h', '1d', '3d', '5d', '1w', '2w'][i]} ago`}
              items={items}
              color={color(f.disc)}
              size={size}
              open={forceOpen || undefined}
              icon={<DisciplineIcon id={f.disc} size={size === 'sm' ? 18 : 22} />}
              badge={i === 0 ? <Pill tone="accent" size="xs">New</Pill> : undefined}
              selected={selected === f.title}
              onClick={() => {
                setSelected(f.title)
                if (items.length) setViewer({ items, title: f.title, index: 0 })
                else toast({ title: `${f.title} is empty`, description: 'Drop files onto a folder to fill it.', tone: 'info' })
              }}
            />
            </div>
          )
        })}
        <div data-folder="Drop zone" className="flex w-full justify-center">
        <FolderCard
          title="Drop zone"
          subtitle={dropped.length ? `${dropped.length} uploaded` : 'Drag files here'}
          items={dropped}
          color="var(--ink-3)"
          size={size}
          open={forceOpen || undefined}
          icon={<FileUp className="text-white" />}
          onFilesDrop={async (files) => {
            const refs = await Promise.all(files.map((f) => saveFile(f)))
            setDropped((d) => [...refs, ...d])
            toast({ title: `${files.length} file${files.length === 1 ? '' : 's'} added`, description: 'Stored locally in IndexedDB.', tone: 'success' })
          }}
          onClick={() => (dropped.length ? setViewer({ items: dropped, title: 'Drop zone', index: 0 }) : toast({ title: 'Drag a file from your desktop onto this folder', tone: 'info' }))}
        />
        </div>
      </div>
      <Lightbox
        items={viewer?.items ?? []}
        index={viewer ? viewer.index : null}
        title={viewer?.title}
        captions={viewer?.items.map((m, k) => (m.kind === 'art' ? `${viewer.title} — artboard ${k + 1}` : undefined))}
        onClose={() => setViewer(null)}
        originFor={(i) => (i === 0 && viewer ? document.querySelector(`[data-folder="${viewer.title}"] [aria-expanded]`) : null)}
      />
    </Section>
  )
}

// ─────────────────────────── Gauge ───────────────────────────

export function GaugeSection() {
  const [value, setValue] = useState(94)
  const [ticks, setTicks] = useState(44)
  return (
    <Section
      id="gauge"
      kicker="Gauge"
      title="Ready-to-ship meter"
      description="44 radial ticks fill one after another; the leading tick becomes a needle. Works on accent, white and night surfaces."
      actions={
        <Button size="sm" variant="glass" icon={<Shuffle className="size-4" />} onClick={() => setValue(Math.round(Math.random() * 100))}>
          Randomize
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Slider value={value} onChange={setValue} label="Value" format={(v) => `${v}%`} marks={[0, 25, 50, 75, 100]} />
        <Slider value={ticks} onChange={setTicks} min={18} max={72} step={2} label="Ticks" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Glass className="p-5">
          <div className="relative z-[1] mb-3 flex items-center justify-between">
            <h3 className="text-[17px] font-medium tracking-[-0.02em]">Delivery readiness</h3>
            <IconButton label="Open" size="sm" variant="soft">
              <ArrowUpRight className="size-4" />
            </IconButton>
          </div>
          <Glass variant="accent" className="px-4 pb-3 pt-6">
            <div className="relative z-[1]">
              <Gauge
                value={value}
                ticks={ticks}
                label="ready to deliver"
                footer={
                  <div className="flex items-center justify-between rounded-full bg-white/85 px-4 py-2 text-[13px] text-[#0b0b0c] shadow-[inset_0_1px_0_#fff]">
                    <span className="font-medium">Brand refresh</span>
                    <span className="font-mono text-[12px] text-black/50">{Math.round((value / 100) * 25)} / 25 done</span>
                  </div>
                }
              />
            </div>
          </Glass>
        </Glass>
        <Glass className="flex flex-col items-center justify-center p-6">
          <Gauge value={value} ticks={ticks} tone="accent" label="profile complete" sublabel="add 2 more projects" showScale />
        </Glass>
        <Glass variant="night" className="flex flex-col items-center justify-center p-6">
          <Gauge value={100 - value} ticks={ticks} tone="night" label="revision budget used" sublabel={`${Math.round(((100 - value) / 100) * 3)} of 3 rounds`} size={220} />
        </Glass>
      </div>
    </Section>
  )
}

// ─────────────────────────── Charts ───────────────────────────

const BAR_DISCIPLINES = ['visual', 'video', 'brand', 'uiux'] as const
const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']

function series(seed: string, n: number, base: number, spread: number, trend = 0.06) {
  const r = prng(seed)
  return Array.from({ length: n }, (_, i) => Math.round(base * (1 + trend * i) + r.range(-spread, spread)))
}

export function ChartsSection() {
  const lang = useLang()
  const [range, setRange] = useState<'6' | '12'>('12')
  const [salt, setSalt] = useState(0)
  const [barMode, setBarMode] = useState<'grouped' | 'stacked'>('stacked')
  const [stage, setStage] = useState<string | null>(null)
  const n = Number(range)
  const earn = useMemo(() => series(`earn${salt}`, 12, 2600, 700), [salt])
  const prev = useMemo(() => series(`prev${salt}`, 12, 2000, 500, 0.04), [salt])
  const money = (v: number) => formatMoney(v, 'EUR', lang, v >= 10000)

  const bars = useMemo(
    () =>
      BAR_DISCIPLINES.map((d, i) => ({
        id: d,
        label: { visual: 'Visual', video: 'Video', brand: 'Brand', uiux: 'UI/UX' }[d],
        data: series(`bar${d}${salt}`, 7, 3 + i, 2.4, 0.02).map((v) => Math.max(0, v)),
        color: disciplineColor(d),
      })),
    [salt],
  )

  const pipeline = useMemo(() => {
    const r = prng(`pipe${salt}`)
    return [
      { id: 'requested', label: 'Requested', count: r.int(8, 30) },
      { id: 'queued', label: 'Queued', count: r.int(10, 36) },
      { id: 'in_progress', label: 'In progress', count: r.int(30, 52) },
      { id: 'in_review', label: 'In review', count: r.int(10, 22) },
      { id: 'revisions', label: 'Revisions', count: r.int(5, 20) },
      { id: 'approved', label: 'Approved', count: r.int(8, 16) },
    ]
  }, [salt])

  const heat = useMemo(() => {
    const r = prng(`heat${salt}`)
    const out: Record<string, number> = {}
    for (let i = 0; i < 380; i++) {
      const d = subDays(new Date(), i)
      const weekend = d.getDay() === 0 || d.getDay() === 6
      out[format(d, 'yyyy-MM-dd')] = r.bool(weekend ? 0.25 : 0.82) ? Math.round(r.range(0.5, weekend ? 3 : 9) * 10) / 10 : 0
    }
    return out
  }, [salt])

  const tiles = [
    { label: 'Active jobs', value: 128, sub: '7 disciplines', spark: series(`t1${salt}`, 12, 80, 10), night: true },
    { label: 'In progress', value: 47, sub: '↗ 6 this week', spark: series(`t2${salt}`, 12, 30, 6) },
    { label: 'Awaiting review', value: 18, sub: '4.2 days in queue', spark: series(`t3${salt}`, 12, 22, 5, -0.03) },
    { label: 'At risk', value: 7, sub: 'needs action today', spark: series(`t4${salt}`, 12, 6, 3, 0.02) },
  ]

  return (
    <Section
      id="charts"
      kicker="Charts"
      title="Data, but make it alive"
      description="SVG charts that draw in, morph on data change, scrub with pointer or ← → keys, and recolour with the discipline tab."
      actions={
        <Button size="sm" variant="glass" icon={<Shuffle className="size-4" />} onClick={() => setSalt((s) => s + 1)}>
          New data
        </Button>
      }
    >
      {/* stat tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Glass key={t.label} variant={t.night ? 'night' : 'tile'} className="overflow-hidden p-4">
            <div className="relative z-[1]">
              <p className={t.night ? 'text-[12.5px] text-white/60' : 'text-[12.5px] text-ink-3'}>{t.label}</p>
              <p className="mt-1 text-[30px] font-medium leading-none tracking-[-0.04em]">
                <AnimatedCounter value={t.value} />
              </p>
              <p className={t.night ? 'mt-1.5 text-[12px] text-white/50' : 'mt-1.5 text-[12px] text-ink-3'}>{t.sub}</p>
              <Sparkline data={t.spark} height={34} className="mt-3" interactive color={t.night ? 'var(--accent)' : undefined} labels={MONTHS} />
            </div>
          </Glass>
        ))}
      </div>

      {/* pipeline (reference) */}
      <Glass variant="tile" className="mb-4 p-4 sm:p-5">
        <PipelineBar
          title="Job pipeline"
          meta={<span className="hidden sm:inline">Average approval 8.4 days</span>}
          action={
            <button type="button" onClick={() => setStage(null)} className="flex items-center gap-0.5 font-medium text-ink">
              {stage ? 'Clear' : 'Open'} <ChevronRight className="size-4" />
            </button>
          }
          segments={pipeline}
          highlightId="in_progress"
          activeId={stage}
          onSegmentClick={(id) => setStage((s) => (s === id ? null : id))}
        />
        {stage && <p className="mt-3 text-[12.5px] text-ink-3">Filtering by “{pipeline.find((p) => p.id === stage)?.label}” — click again to clear.</p>}
      </Glass>

      <div className="grid gap-4 lg:grid-cols-3">
        <Demo label="AreaChart" className="lg:col-span-2" hint="monotone · gradient · 2 series">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12.5px] text-ink-3">Earnings, last {range} months</p>
              <p className="text-[26px] font-medium tracking-[-0.03em]">
                <AnimatedCounter value={earn.slice(-n).reduce((a, b) => a + b, 0)} currency="EUR" />
              </p>
            </div>
            <Segmented size="sm" value={range} onChange={setRange} options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }]} />
          </div>
          <AreaChart
            key={range}
            labels={MONTHS.slice(-n)}
            series={[
              { id: 'now', label: 'This year', data: earn.slice(-n) },
              { id: 'prev', label: 'Last year', data: prev.slice(-n), lineOnly: true, dashed: true, color: 'var(--ink-4)' },
            ]}
            format={money}
            formatAxis={(v) => formatMoney(v, 'EUR', lang, true)}
            height={260}
            markIndex={n - 1}
            ariaLabel="Earnings per month"
            onPointClick={(i) => toast({ title: `${MONTHS.slice(-n)[i]}: ${money(earn.slice(-n)[i])}`, tone: 'info' })}
          />
        </Demo>
        <Demo label="DonutChart" hint="hover segments / legend">
          <DonutChart
            data={[
              { id: 'visual', label: 'Visual design', value: 42, color: disciplineColor('visual') },
              { id: 'video', label: 'Video editing', value: 23, color: disciplineColor('video') },
              { id: 'brand', label: 'Brand & print', value: 18, color: disciplineColor('brand') },
              { id: 'uiux', label: 'UI / UX', value: 11, color: disciplineColor('uiux') },
              { id: 'other', label: 'Other', value: 6, color: 'var(--ink-4)' },
            ]}
            centerLabel="jobs this year"
            size={210}
            ariaLabel="Jobs by discipline"
            onSegmentClick={(id) => toast({ title: `Filter: ${id}`, tone: 'info' })}
          />
        </Demo>
        <Demo label="BarChart" className="lg:col-span-2" hint="grouped / stacked · per-series colours">
          <div className="mb-3 flex justify-end">
            <Segmented size="sm" value={barMode} onChange={setBarMode} options={[{ value: 'stacked', label: 'Stacked' }, { value: 'grouped', label: 'Grouped' }]} />
          </div>
          <BarChart
            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            series={bars}
            mode={barMode}
            format={(v) => `${v}h`}
            height={250}
            ariaLabel="Hours logged per day by discipline"
            onBarClick={(i) => toast({ title: `Opened ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}`, tone: 'info' })}
          />
        </Demo>
        <Demo label="BarChart · highlight" hint="single series">
          <BarChart
            labels={MONTHS.slice(-6)}
            series={[{ id: 'rev', label: 'Revisions', data: series(`rev${salt}`, 6, 6, 3, 0).map((v) => Math.max(1, v)) }]}
            highlightIndex={5}
            showValues
            showYAxis={false}
            height={250}
            ariaLabel="Revisions per month"
          />
        </Demo>
        <Demo label="Heatmap" className="lg:col-span-3" hint="click a day">
          <Heatmap
            values={heat}
            weeks={52}
            valueLabel={(v) => `${v} h logged`}
            summary={<span><strong className="font-medium text-ink">{Object.values(heat).reduce((a, b) => a + b, 0).toFixed(0)} h</strong> logged in the last year</span>}
            onCellClick={(day, v) => {
              toast({ title: day, description: v ? `${v} hours logged` : 'Nothing logged', tone: 'info' })
              if (v > 8) fireConfetti({ particleCount: 60 })
            }}
          />
        </Demo>
      </div>
    </Section>
  )
}
