import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Heart, MapPin, PartyPopper, Rocket, Sparkles, Star, Trash2, Wand2 } from 'lucide-react'
import { addDays } from 'date-fns'
import { DatePicker, MonthCalendar } from '@/components/ui/DatePicker'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { TagInput } from '@/components/ui/TagInput'
import { Slider } from '@/components/ui/Slider'
import { RatingStars } from '@/components/ui/RatingStars'
import { Stepper } from '@/components/ui/Stepper'
import { Lightbox } from '@/components/ui/Lightbox'
import { Skeleton, SkeletonCard, SkeletonList, SkeletonText } from '@/components/ui/Skeleton'
import { Marquee } from '@/components/ui/Marquee'
import { ConfirmDialog, useConfirm } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineBadge, Pill, StatusBadge } from '@/components/ui/Badge'
import { Toggle } from '@/components/ui/Toggle'
import { Field } from '@/components/ui/Field'
import { MediaView } from '@/components/art/MediaView'
import { fireConfetti, fireEmoji, fireFireworks, fireHearts, fireSideCannons, fireStars } from '@/lib/confetti'
import { formatMoney } from '@/lib/format'
import { toast } from '@/store/toasts'
import { useApp } from '@/store'
import { useLang } from '@/i18n'
import { DISCIPLINE_ONLY } from '@/theme/disciplines'
import { ME_DESIGNER_ID, type MediaRef } from '@/store/types'
import { Control, Demo, Section, art } from './kitUi'

const SKILLS = [
  'Figma',
  'Photoshop',
  'Illustrator',
  'After Effects',
  'Premiere Pro',
  'DaVinci Resolve',
  'Blender',
  'Cinema 4D',
  'Brand strategy',
  'Typography',
  'Motion design',
  'Packaging',
  'Storyboarding',
  'Color grading',
  'Logo design',
  'Design systems',
  'Prototyping',
  'Webflow',
]

// ─────────────────────────── Inputs ───────────────────────────

const dayKey = (offset: number) => addDays(new Date(), offset).toISOString().slice(0, 10)
const MARKERS: Record<string, string | string[]> = {
  [dayKey(2)]: '#31A8FF',
  [dayKey(5)]: ['#FF3366', '#9999FF'],
  [dayKey(9)]: 'var(--accent)',
  [dayKey(16)]: ['#FF9A00', '#2EE6C5', '#CF96FD'],
}

export function InputsSection() {
  const lang = useLang()
  const [due, setDue] = useState<string | null>(addDays(new Date(), 9).toISOString())
  const [call, setCall] = useState<string | null>(null)
  const [palette, setPalette] = useState<string[]>(['#C9F158', '#0B0B0C', '#F3F3F5', '#31A8FF', '#FF6B3D'])
  const [tags, setTags] = useState<string[]>(['Figma', 'Brand strategy', 'Typography'])
  const [budget, setBudget] = useState(2400)
  const [rate, setRate] = useState<[number, number]>([45, 95])
  const [rating, setRating] = useState(4)
  const money = (v: number) => formatMoney(v, 'EUR', lang)

  return (
    <Section id="inputs" kicker="Inputs" title="Brief-grade form controls" description="Everything a client needs to write a brief: deadlines with presets, palettes, tags, budgets and ratings.">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Demo label="DatePicker" hint="presets · min today · relative label">
            <div className="space-y-4">
              <Field label="Deadline">
                <DatePicker value={due} onChange={setDue} min={new Date().toISOString()} markers={{ [new Date().toISOString().slice(0, 10)]: 'var(--accent)' }} />
              </Field>
              <Field label="Kick-off call (with time)">
                <DatePicker value={call} onChange={setCall} withTime onClear={() => setCall(null)} placeholder="Schedule a call" align="end" />
              </Field>
              <p className="truncate font-mono text-[11.5px] text-ink-3">value: {due ?? 'null'}</p>
              <div className="rounded-[18px] bg-[var(--surface-2)]/60 p-3">
                <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">MonthCalendar · inline + markers</p>
                <MonthCalendar
                  value={due ? new Date(due) : null}
                  onSelect={(d) => {
                    const next = new Date(d)
                    next.setHours(17, 0, 0, 0)
                    setDue(next.toISOString())
                  }}
                  markers={MARKERS}
                />
              </div>
            </div>
          </Demo>
          <Demo label="RatingStars" hint="hover preview · keys 1–5">
            <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
              <RatingStars value={rating} onChange={(v) => {
                setRating(v)
                if (v === 5) fireStars()
              }} size={30} showLabel />
              <RatingStars value={4.6} showValue count={128} />
              <RatingStars value={3.3} tone="accent" size={22} showValue />
              <RatingStars value={5} tone="ink" size={16} />
            </div>
          </Demo>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Demo label="ColorPicker" hint="click copies · drag reorders · harmonies">
            <ColorPicker value={palette} onChange={setPalette} max={8} />
          </Demo>
          <Demo label="TagInput" hint="Enter , Tab · Backspace · paste a, b, c">
            <TagInput value={tags} onChange={setTags} suggestions={SKILLS} max={8} quickPicks={4} transform="capitalize" placeholder="Add skills…" />
            <p className="mt-3 font-mono text-[11.5px] text-ink-3">{JSON.stringify(tags)}</p>
          </Demo>
          <Demo label="Slider" hint="single · range · marks">
            <div className="space-y-7 pt-1">
              <Slider
                value={budget}
                onChange={setBudget}
                min={250}
                max={10000}
                step={50}
                label="Budget"
                format={money}
                marks={[
                  { value: 250, label: '€250' },
                  { value: 2500, label: '2.5k' },
                  { value: 5000, label: '5k' },
                  { value: 10000, label: '10k' },
                ]}
              />
              <Slider value={rate} onChange={setRate} min={20} max={160} step={5} minGap={10} label="Hourly rate" format={(v) => `€${v}`} />
              <Slider value={60} onChange={() => undefined} disabled label="Disabled" />
            </div>
          </Demo>
        </div>
      </div>
    </Section>
  )
}

// ─────────────────────────── Stepper ───────────────────────────

const STEPS = [
  { id: 'basics', label: 'Basics', description: 'Title & discipline' },
  { id: 'style', label: 'Style guide', description: 'Palette, fonts, mood' },
  { id: 'assets', label: 'Assets', description: 'Images, video, links' },
  { id: 'deadline', label: 'Deadline', description: 'Due date & priority' },
  { id: 'budget', label: 'Budget', description: 'Fixed or milestones' },
  { id: 'review', label: 'Review', description: 'Send to designer' },
]

export function StepperSection() {
  const [step, setStep] = useState(2)
  const done = step >= STEPS.length
  return (
    <Section
      id="stepper"
      kicker="Stepper"
      title="Wizard progress"
      description="Completed steps are clickable. On phones it collapses to “Step 3 of 6” with capsule segments."
      actions={
        <>
          <Button size="sm" variant="outline" icon={<ArrowLeft className="size-4" />} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button
            size="sm"
            iconRight={<ArrowRight className="size-4" />}
            onClick={() => {
              if (step === STEPS.length - 1) fireConfetti()
              setStep((s) => Math.min(STEPS.length, s + 1))
            }}
            disabled={done}
          >
            {step >= STEPS.length - 1 ? 'Send brief' : 'Next'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Demo label="Horizontal">
          <Stepper steps={STEPS} current={Math.min(step, STEPS.length - 1)} completed={done ? STEPS.map((_, i) => i) : undefined} onStepClick={setStep} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
              className="mt-6 rounded-2xl bg-[var(--surface-2)] p-5 text-[13.5px] text-ink-2"
            >
              {done ? (
                <span className="flex items-center gap-2 font-medium text-ink">
                  <PartyPopper className="size-4" /> Brief sent — the designer has 48h to respond.
                  <button type="button" className="ml-auto text-[12.5px] text-ink-3 underline" onClick={() => setStep(0)}>
                    Restart
                  </button>
                </span>
              ) : (
                <>
                  <strong className="font-medium text-ink">{STEPS[step].label}.</strong> {STEPS[step].description} — content of step {step + 1} goes here.
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </Demo>
        <Demo label="Vertical">
          <Stepper steps={STEPS} current={Math.min(step, STEPS.length - 1)} completed={done ? STEPS.map((_, i) => i) : undefined} onStepClick={setStep} orientation="vertical" />
        </Demo>
      </div>
    </Section>
  )
}

// ─────────────────────────── Lightbox ───────────────────────────

const GALLERY: MediaRef[] = [
  art('lb-poster', 'poster', 'brand'),
  art('lb-ui', 'ui', 'uiux'),
  art('lb-video', 'video', 'video'),
  art('lb-mesh', 'mesh', 'visual'),
  art('lb-3d', 'blob3d', '3d'),
  art('lb-ill', 'illustration', 'illustration'),
  art('lb-type', 'type', 'brand'),
  art('lb-photo', 'photo', 'visual'),
]

interface Pin {
  id: number
  index: number
  x: number
  y: number
}

export function LightboxSection() {
  const [open, setOpen] = useState<number | null>(null)
  const [annotate, setAnnotate] = useState(false)
  const [pins, setPins] = useState<Pin[]>([
    { id: 1, index: 0, x: 32, y: 28 },
    { id: 2, index: 0, x: 70, y: 64 },
  ])
  return (
    <Section
      id="lightbox"
      kicker="Lightbox"
      title="Full-screen review"
      description="Flies out of the thumbnail and back (FLIP), swipe / ← → / thumbnails, click to zoom & drag to pan, slideshow, download (generated art exports as SVG). Annotation mode drops numbered pins."
      actions={
        <Control label="Annotation mode">
          <Toggle checked={annotate} onChange={setAnnotate} size="sm" label="Annotation mode" />
        </Control>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GALLERY.map((m, i) => (
          <motion.button
            key={i}
            type="button"
            data-kit-thumb={i}
            onClick={() => setOpen(i)}
            whileHover={{ y: -4, rotate: i % 2 ? 1 : -1 }}
            whileTap={{ scale: 0.97 }}
            className="relative aspect-[4/3] overflow-hidden rounded-[18px] shadow-[0_10px_30px_-16px_rgba(0,0,0,.5)]"
          >
            <MediaView media={m} />
            {pins.some((p) => p.index === i) && (
              <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10.5px] text-white backdrop-blur">
                {pins.filter((p) => p.index === i).length} notes
              </span>
            )}
          </motion.button>
        ))}
      </div>
      <Lightbox
        items={GALLERY}
        index={open}
        onClose={() => setOpen(null)}
        title={annotate ? 'Click anywhere to drop a note' : 'Kit gallery'}
        originFor={(i) => document.querySelector(`[data-kit-thumb="${i}"]`)}
        captions={GALLERY.map((m) => (m.kind === 'art' ? `${m.variant} · seed “${m.seed}”` : undefined))}
        onMediaClick={
          annotate
            ? (index, x, y) => {
                setPins((p) => [...p, { id: Date.now(), index, x, y }])
                toast({ title: 'Note added', description: `at ${x.toFixed(0)}% / ${y.toFixed(0)}%`, tone: 'success', duration: 1600 })
              }
            : undefined
        }
        renderOverlay={(index) =>
          pins
            .filter((p) => p.index === index)
            .map((p, k) => (
              <motion.button
                key={p.id}
                type="button"
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setPins((all) => all.filter((x) => x.id !== p.id))
                }}
                title="Remove note"
                className="absolute flex size-8 -translate-y-full items-center justify-center rounded-full rounded-bl-none bg-[var(--accent)] font-mono text-[12px] font-semibold text-[var(--accent-ink)] shadow-[0_6px_16px_-4px_rgba(0,0,0,.5)] ring-2 ring-white"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                {k + 1}
              </motion.button>
            ))
        }
      />
    </Section>
  )
}

// ─────────────────────────── Feedback ───────────────────────────

export function FeedbackSection() {
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<'default' | 'danger' | null>(null)
  const [confirm, confirmDialog] = useConfirm()
  const [log, setLog] = useState<string[]>([])
  const allDesigners = useApp((s) => s.designers)
  const designers = useMemo(() => allDesigners.filter((d) => d.id !== ME_DESIGNER_ID), [allDesigners])

  return (
    <Section id="feedback" kicker="Feedback" title="Skeletons, dialogs & celebrations">
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Demo label="Skeleton" hint="toggle loading">
          <div className="mb-4">
            <Toggle checked={loading} onChange={setLoading} size="sm" label="Loading" />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <SkeletonCard className="shadow-none" />
                <SkeletonList rows={3} />
                <div className="flex gap-2">
                  <Skeleton rounded="full" className="h-8 w-20" />
                  <Skeleton rounded="full" className="h-8 w-24" />
                </div>
                <SkeletonText lines={2} />
              </motion.div>
            ) : (
              <motion.div key="real" initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} className="space-y-3">
                <div className="aspect-[4/3] overflow-hidden rounded-[22px]">
                  <MediaView media={art('sk-real', 'poster', 'visual')} />
                </div>
                {designers.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex items-center gap-3">
                    <Avatar seed={d.avatarSeed} media={d.avatar} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{d.name}</p>
                      <p className="truncate text-[12px] text-ink-3">{d.headline}</p>
                    </div>
                    <StatusBadge status="in_progress" size="xs" />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Demo>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Demo label="ConfirmDialog" hint="+ useConfirm()">
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => setDialog('default')}>
                  Approve delivery…
                </Button>
                <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDialog('danger')}>
                  Delete project…
                </Button>
                <Button
                  variant="soft"
                  onClick={async () => {
                    const ok = await confirm({ title: 'Archive this conversation?', description: 'You can find it again under “Archived”.', confirmLabel: 'Archive' })
                    setLog((l) => [`useConfirm → ${ok}`, ...l].slice(0, 4))
                  }}
                >
                  await confirm()
                </Button>
              </div>
              <ul className="mt-4 space-y-1 font-mono text-[11.5px] text-ink-3">
                {log.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
              <ConfirmDialog
                open={dialog === 'default'}
                onClose={() => setDialog(null)}
                onConfirm={async () => {
                  await new Promise((r) => setTimeout(r, 700))
                  fireStars()
                  setLog((l) => ['approved v3', ...l].slice(0, 4))
                }}
                title="Approve version 3?"
                description="This releases the escrow milestone (€1,200) to the designer and closes the job."
                confirmLabel="Approve & pay"
              />
              <ConfirmDialog
                open={dialog === 'danger'}
                onClose={() => setDialog(null)}
                onConfirm={() => setLog((l) => ['deleted project', ...l].slice(0, 4))}
                tone="danger"
                title="Delete “Brand refresh”?"
                description="All 14 files, 3 versions and the chat history will be permanently removed."
                confirmLabel="Delete forever"
                requireText="delete"
              />
              {confirmDialog}
            </Demo>
            <Demo label="Confetti" hint="theme-coloured · respects motion setting">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="accent" icon={<PartyPopper className="size-4" />} onClick={(e) => fireConfetti({ from: e.currentTarget })}>
                  Burst
                </Button>
                <Button variant="glass" icon={<Rocket className="size-4" />} onClick={() => fireSideCannons()}>
                  Cannons
                </Button>
                <Button variant="glass" icon={<Heart className="size-4" />} onClick={(e) => fireHearts({ from: e.currentTarget })}>
                  Match
                </Button>
                <Button variant="glass" icon={<Star className="size-4" />} onClick={(e) => fireStars({ from: e.currentTarget })}>
                  Stars
                </Button>
                <Button variant="glass" icon={<Wand2 className="size-4" />} onClick={(e) => fireEmoji('💸', { from: e.currentTarget })}>
                  Paid
                </Button>
                <Button variant="glass" icon={<Sparkles className="size-4" />} onClick={() => fireFireworks()}>
                  Fireworks
                </Button>
              </div>
            </Demo>
          </div>
          <Demo label="Toasts" hint="store/toasts · every tone">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'Saved', description: 'Brief draft stored locally.' })}>
                Default
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'Delivery approved', description: 'Escrow released to Mira.', tone: 'success' })}>
                Success
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'Upload failed', description: 'File is larger than 50 MB.', tone: 'error' })}>
                Error
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'Heads-up', description: 'Deadline moved to Friday.', tone: 'info' })}>
                Info
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  fireHearts({ from: e.currentTarget })
                  toast({ title: "It's a match!", description: designers[1] ? `${designers[1].name} liked you back.` : 'You matched.', tone: 'match', avatarSeed: designers[1]?.avatarSeed })
                }}
              >
                Match
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast({
                    title: designers[0]?.name ?? 'New message',
                    description: 'Sent you v2 of the key visual — have a look!',
                    tone: 'message',
                    avatarSeed: designers[0]?.avatarSeed,
                    action: { label: 'Undo', onClick: () => toast({ title: 'Undone', tone: 'info' }) },
                  })
                }
              >
                Message + action
              </Button>
            </div>
          </Demo>
        </div>
      </div>
    </Section>
  )
}

// ─────────────────────────── Marquee ───────────────────────────

export function MarqueeSection() {
  const allDesigners = useApp((s) => s.designers)
  const designers = useMemo(() => allDesigners.filter((d) => d.id !== ME_DESIGNER_ID), [allDesigners])
  return (
    <Section id="marquee" kicker="Marquee" title="Infinite tickers" description="Seamless loop sized to its content, pauses on hover, edges fade out.">
      <div className="space-y-4">
        <Marquee speed={36} ariaLabel="Designers">
          {designers.slice(0, 12).map((d) => (
            <span key={d.id} className="glass glass-pill flex items-center gap-2.5 py-1.5 pl-1.5 pr-4">
              <Avatar seed={d.avatarSeed} media={d.avatar} size={30} />
              <span className="relative z-[1] text-[13px] font-medium">{d.name}</span>
              <span className="relative z-[1] flex items-center gap-1 text-[12px] text-ink-3">
                <MapPin className="size-3" />
                {d.location}
              </span>
            </span>
          ))}
        </Marquee>
        <Marquee speed={24} direction="right" gap={10} ariaLabel="Disciplines">
          {DISCIPLINE_ONLY.map((d) => (
            <DisciplineBadge key={d.id} id={d.id} />
          ))}
          <Pill tone="night">designTab</Pill>
        </Marquee>
      </div>
    </Section>
  )
}
