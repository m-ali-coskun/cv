import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Check,
  ExternalLink,
  ImageUp,
  Link2,
  Loader2,
  NotebookPen,
  Palette,
  Pipette,
  Plus,
  Replace,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Type,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { loadFileUrl } from '@/lib/files'
import { uid } from '@/lib/ids'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import type { Asset } from '@/store/types'
import { ColorPicker, normalizeHex, PALETTE_PRESETS, readableOn } from '@/components/ui/ColorPicker'
import { TagInput } from '@/components/ui/TagInput'
import { Input, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Dropzone } from '@/components/ui/Dropzone'
import { MediaView } from '@/components/art/MediaView'
import { useWizard } from '../draftStore'
import { DO_SUGGESTIONS, DONT_SUGGESTIONS, EXTRA_PALETTES, FONT_SUGGESTIONS, isUrl, MOOD_EMOJI, MOODS, normalizeUrl, STEP } from '../model'
import { extractPalette, type ExtractedColor } from '../extractPalette'
import { CharCount, FieldError, FieldLabel, Section, StepHeader, stepStagger, SuggestChip } from '../ui'

const MAX_COLORS = 8
const MAX_MOODS = 5

export function StyleStep() {
  const t = useT()
  const style = useWizard((s) => s.draft.style)
  const setStyle = useWizard((s) => s.setStyle)
  const presets = useMemo(() => [...PALETTE_PRESETS, ...EXTRA_PALETTES], [])

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
        <StepHeader index={STEP.style} icon={<Palette />} title={t('brief.style.title')} subtitle={t('brief.style.subtitle')} />
      </motion.div>

      <Section title={t('brief.style.palette')} hint={t('brief.style.paletteHint')} icon={<Palette />}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div data-no-enter className="min-w-0">
            <ColorPicker value={style.palette} onChange={(palette) => setStyle({ palette })} max={MAX_COLORS} presets={presets} />
          </div>
          <PaletteExtractor />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t('brief.style.type')} hint={t('brief.style.typeHint')} icon={<Type />}>
          <FontsEditor />
        </Section>
        <div className="flex flex-col gap-4">
          <Section title={t('brief.style.mood')} hint={t('brief.style.moodHint', { max: MAX_MOODS })} icon={<Smile />}>
            <MoodPicker />
          </Section>
          <StyleTile />
        </div>
      </div>

      <Section title={t('brief.style.references')} hint={t('brief.style.referencesHint')} icon={<Link2 />}>
        <ReferencesEditor />
      </Section>

      <Section title={t('brief.style.rules')} hint={t('brief.style.rulesHint')} icon={<ThumbsUp />}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ListEditor tone="do" items={style.dos} onChange={(dos) => setStyle({ dos })} suggestions={DO_SUGGESTIONS} />
          <ListEditor tone="dont" items={style.donts} onChange={(donts) => setStyle({ donts })} suggestions={DONT_SUGGESTIONS} />
        </div>
      </Section>

      <Section title={t('brief.style.notes')} hint={t('brief.style.notesHint')} icon={<NotebookPen />}>
        <Textarea value={style.notes} maxLength={1500} onChange={(e) => setStyle({ notes: e.target.value })} placeholder={t('brief.style.notesPh')} className="min-h-[120px]" aria-label={t('brief.style.notes')} />
        <div className="mt-1 flex justify-end">
          <CharCount value={style.notes} max={1500} />
        </div>
      </Section>
    </motion.div>
  )
}

// ─────────────────────────── palette extractor ───────────────────────────

function PaletteExtractor() {
  const t = useT()
  const palette = useWizard((s) => s.draft.style.palette)
  const assets = useWizard((s) => s.draft.assets)
  const setStyle = useWizard((s) => s.setStyle)
  const [src, setSrc] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [colors, setColors] = useState<ExtractedColor[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ownUrl = useRef<string | null>(null)
  const images = assets.filter((a) => a.kind === 'image' && a.media.kind === 'file')

  useEffect(() => () => void (ownUrl.current && URL.revokeObjectURL(ownUrl.current)), [])

  const run = async (url: string, label: string) => {
    setSrc(url)
    setName(label)
    setBusy(true)
    setError(null)
    setColors([])
    try {
      // let the scan animation breathe for a moment
      const [res] = await Promise.all([extractPalette(url, 5), new Promise((r) => window.setTimeout(r, 650))])
      setColors(res)
      if (!res.length) setError(t('brief.style.extractEmpty'))
    } catch {
      setError(t('brief.style.extractError'))
    } finally {
      setBusy(false)
    }
  }

  const fromFile = (files: File[]) => {
    const f = files.find((x) => x.type.startsWith('image/'))
    if (!f) {
      setError(t('brief.style.extractType'))
      return
    }
    if (ownUrl.current) URL.revokeObjectURL(ownUrl.current)
    const url = URL.createObjectURL(f)
    ownUrl.current = url
    run(url, f.name)
  }

  const fromAsset = async (a: Asset) => {
    if (a.media.kind !== 'file') return
    const url = await loadFileUrl(a.media.fileId)
    if (url) run(url, a.name)
  }

  const merge = (hexes: string[], replace = false) => {
    const base = replace ? [] : palette
    const out = [...base]
    for (const h of hexes) {
      const n = normalizeHex(h)
      if (n && !out.some((c) => normalizeHex(c) === n) && out.length < MAX_COLORS) out.push(n)
    }
    const added = out.length - (replace ? 0 : base.length)
    setStyle({ palette: out })
    toast({ title: replace ? t('brief.style.replaced') : t('brief.style.addedColors', { count: added }), tone: 'success', duration: 1800 })
  }

  return (
    <div className="min-w-0 rounded-[22px] bg-[var(--surface-2)] p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-[13.5px] font-medium">
        <span className="flex size-7 items-center justify-center rounded-[10px] bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink">
          <Pipette className="size-3.5" />
        </span>
        {t('brief.style.extract')}
      </div>

      {!src ? (
        <Dropzone onFiles={fromFile} accept="image/*" multiple={false} compact className="bg-[var(--surface)]/60">
          <motion.span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-ink" whileHover={{ rotate: -8, scale: 1.05 }}>
            <ImageUp className="size-5" />
          </motion.span>
          <p className="text-[13.5px] font-medium">{t('brief.style.extractDrop')}</p>
          <p className="text-[12px] text-ink-3">{t('brief.style.extractHint')}</p>
        </Dropzone>
      ) : (
        <div className="flex gap-3">
          <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-3)] sm:size-32">
            <img src={src} alt={name} className="size-full object-cover" />
            <AnimatePresence>
              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20">
                  <motion.span
                    className="absolute inset-x-0 h-8 bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--accent)_70%,transparent),transparent)]"
                    animate={{ y: ['-30%', '420%'] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => {
                setSrc(null)
                setColors([])
              }}
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
              aria-label={t('brief.common.remove')}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-ink-3">{name}</p>
            {busy ? (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">
                <Loader2 className="size-4 animate-spin" /> {t('brief.style.extracting')}
              </p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {colors.map((c, i) => {
                    const inPalette = palette.some((p) => normalizeHex(p) === c.hex)
                    return (
                      <motion.button
                        key={c.hex}
                        type="button"
                        initial={{ opacity: 0, scale: 0.4, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ ...spring.bouncy, delay: i * 0.07 }}
                        whileHover={{ y: -3, scale: 1.06 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => !inPalette && merge([c.hex])}
                        title={`${c.hex} · ${Math.round(c.share * 100)}%`}
                        className="relative flex size-10 items-center justify-center rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]"
                        style={{ background: c.hex, color: readableOn(c.hex) }}
                      >
                        {inPalette ? <Check className="size-4" /> : <Plus className="size-4 opacity-0 transition-opacity hover:opacity-100" />}
                      </motion.button>
                    )
                  })}
                </div>
                {colors.length > 0 && (
                  <>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                      {colors.map((c, i) => (
                        <motion.span key={c.hex} initial={{ width: 0 }} animate={{ width: `${c.share * 100}%` }} transition={{ duration: 0.7, delay: 0.2 + i * 0.05 }} style={{ background: c.hex }} />
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-2 font-mono text-[10.5px] text-ink-3">
                      {colors.map((c) => (
                        <span key={c.hex}>
                          {c.hex} {Math.round(c.share * 100)}%
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button size="xs" icon={<Plus className="size-3.5" />} onClick={() => merge(colors.map((c) => c.hex))}>
                        {t('brief.style.addAll')}
                      </Button>
                      <Button size="xs" variant="soft" icon={<Replace className="size-3.5" />} onClick={() => merge(colors.map((c) => c.hex), true)}>
                        {t('brief.style.replace')}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <FieldError show={!!error} tone="warning">
        {error}
      </FieldError>

      {images.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-medium text-ink-3">{t('brief.style.fromAssets')}</p>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {images.slice(0, 8).map((a) => (
              <motion.button
                key={a.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => fromAsset(a)}
                className="size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-line"
                title={a.name}
              >
                <MediaView media={a.media} />
              </motion.button>
            ))}
          </div>
        </div>
      )}
      {src && !busy && (
        <div className="mt-3">
          <Dropzone onFiles={fromFile} accept="image/*" multiple={false} compact className="py-2.5">
            <span className="text-[12.5px] font-medium text-ink-2">{t('brief.style.tryAnother')}</span>
          </Dropzone>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────── fonts ───────────────────────────

function FontsEditor() {
  const t = useT()
  const fonts = useWizard((s) => s.draft.style.fonts)
  const assets = useWizard((s) => s.draft.assets)
  const setStyle = useWizard((s) => s.setStyle)
  const [sample, setSample] = useState('')
  const [weight, setWeight] = useState<400 | 600>(400)
  const uploaded = useUploadedFonts(assets)

  return (
    <div>
      <div data-no-enter>
        <TagInput
          value={fonts}
          onChange={(f) => setStyle({ fonts: f })}
          suggestions={[...uploaded, ...FONT_SUGGESTIONS]}
          quickPicks={6}
          max={4}
          transform="none"
          placeholder={t('brief.style.fontsPh')}
          icon={<Type className="size-4" />}
        />
      </div>
      {uploaded.length > 0 && <p className="mt-2 text-[12px] text-[var(--accent-text)]">{t('brief.style.uploadedFonts', { names: uploaded.join(', ') })}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input value={sample} onChange={(e) => setSample(e.target.value)} placeholder={t('brief.style.samplePh')} aria-label={t('brief.style.samplePh')} className="h-9 text-[13px]" />
        <div className="inline-flex rounded-full bg-[var(--surface-2)] p-0.5">
          {([400, 600] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeight(w)}
              className={cn('h-8 rounded-full px-3 text-[12px] font-medium transition-colors', weight === w ? 'bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]' : 'text-ink-3')}
            >
              {w === 400 ? t('brief.style.regular') : t('brief.style.bold')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {fonts.map((f, i) => (
            <motion.div
              key={f}
              layout
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
              transition={spring.smooth}
              className="tile relative overflow-hidden px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  {i === 0 ? t('brief.style.primary') : t('brief.style.secondary')} · {f}
                </span>
                <button type="button" onClick={() => setStyle({ fonts: fonts.filter((x) => x !== f) })} className="flex size-6 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-3)] hover:text-ink" aria-label={t('brief.common.remove')}>
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="mt-1 flex items-baseline gap-3" style={{ fontFamily: `"${f}", ui-sans-serif, system-ui`, fontWeight: weight }}>
                <span className="text-[40px] leading-none tracking-[-0.03em]">Aa</span>
                <span className="min-w-0 flex-1 truncate text-[18px] tracking-[-0.01em]">{sample || t('brief.style.sample')}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {fonts.length === 0 && <p className="rounded-2xl border border-dashed border-line-2 px-4 py-5 text-center text-[12.5px] text-ink-3">{t('brief.style.noFonts')}</p>}
        {fonts.length > 0 && <p className="text-[11.5px] text-ink-4">{t('brief.style.fontNote')}</p>}
      </div>
    </div>
  )
}

/** Registers uploaded font files with the FontFace API so they preview for real. */
function useUploadedFonts(assets: Asset[]) {
  const [names, setNames] = useState<string[]>([])
  const key = assets
    .filter((a) => a.kind === 'font')
    .map((a) => a.id)
    .join('|')
  useEffect(() => {
    let alive = true
    const fontAssets = assets.filter((a) => a.kind === 'font' && a.media.kind === 'file')
    Promise.all(
      fontAssets.map(async (a) => {
        if (a.media.kind !== 'file') return null
        const family = a.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[-_]+/g, ' ').trim()
        try {
          const url = await loadFileUrl(a.media.fileId)
          if (!url || typeof FontFace === 'undefined') return null
          const face = new FontFace(family, `url(${url})`)
          await face.load()
          document.fonts.add(face)
          return family
        } catch {
          return null
        }
      }),
    ).then((res) => alive && setNames(res.filter((x): x is string => !!x)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return names
}

// ─────────────────────────── mood ───────────────────────────

function MoodPicker() {
  const t = useT()
  const mood = useWizard((s) => s.draft.style.mood)
  const setStyle = useWizard((s) => s.setStyle)
  const [shake, setShake] = useState<string | null>(null)
  const toggle = (m: string) => {
    if (mood.includes(m)) setStyle({ mood: mood.filter((x) => x !== m) })
    else if (mood.length >= MAX_MOODS) {
      setShake(m)
      window.setTimeout(() => setShake(null), 450)
      toast({ title: t('brief.style.moodMax', { max: MAX_MOODS }), tone: 'info', duration: 1800 })
    } else setStyle({ mood: [...mood, m] })
  }
  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((m) => {
        const on = mood.includes(m)
        return (
          <motion.button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(m)}
            animate={shake === m ? { x: [0, -6, 6, -4, 4, 0] } : on ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.35 }}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200',
              on ? 'bg-ink text-[var(--surface)] shadow-[0_8px_20px_-10px_rgba(0,0,0,.5)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink',
            )}
          >
            <span aria-hidden>{MOOD_EMOJI[m]}</span>
            {m}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Live "style tile" composed from the palette, first font and mood. */
function StyleTile() {
  const t = useT()
  const style = useWizard((s) => s.draft.style)
  const title = useWizard((s) => s.draft.title)
  const p = style.palette.map((c) => normalizeHex(c) ?? c)
  const bg = p[0] ?? 'var(--surface-2)'
  const fg = p[0] ? readableOn(p[0]) : 'var(--ink)'
  const accent = p.find((c, i) => i > 0 && c !== p[0]) ?? 'var(--accent)'
  const font = style.fonts[0]
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card relative overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-medium tracking-[-0.01em]">{t('brief.style.tile')}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">{t('brief.style.live')}</span>
      </div>
      <motion.div layout className="relative overflow-hidden rounded-[20px] p-5 transition-colors duration-500" style={{ background: bg, color: fg }}>
        <motion.div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full opacity-80 blur-2xl" animate={{ background: accent }} transition={{ duration: 0.6 }} />
        <div className="relative">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-70">{style.mood.slice(0, 3).join(' · ') || t('brief.style.tileMood')}</div>
          <div className="mt-2 line-clamp-2 text-[26px] font-semibold leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: font ? `"${font}", ui-sans-serif` : undefined }}>
            {title || t('brief.style.tileTitle')}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold" style={{ background: accent, color: typeof accent === 'string' && accent.startsWith('#') ? readableOn(accent) : 'var(--accent-ink)' }}>
              {t('brief.style.tileCta')}
            </span>
            <span className="text-[12px] opacity-70">{font ?? 'Geist'}</span>
          </div>
          <div className="mt-4 flex gap-1">
            {(p.length ? p : ['#e5e5e8', '#cfcfd4', '#a5a5ad', '#6c6c75', '#2a2a2f']).map((c, i) => (
              <motion.span key={`${c}-${i}`} layout className="h-7 flex-1 rounded-lg ring-1 ring-black/10" style={{ background: c }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring.bouncy, delay: i * 0.04 }} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────── references ───────────────────────────

function ReferencesEditor() {
  const t = useT()
  const refs = useWizard((s) => s.draft.style.references)
  const setStyle = useWizard((s) => s.setStyle)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const add = () => {
    const u = normalizeUrl(url)
    if (!isUrl(u)) {
      setErr(t('brief.err.url'))
      return
    }
    if (refs.some((r) => r.url === u)) {
      setErr(t('brief.style.refDup'))
      return
    }
    let host = u
    try {
      host = new URL(u).hostname.replace(/^www\./, '')
    } catch {
      /* validated above */
    }
    setStyle({ references: [...refs, { id: uid('rf_'), label: label.trim() || host, url: u }] })
    setLabel('')
    setUrl('')
    setErr(null)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }
  const valid = url.trim() ? isUrl(normalizeUrl(url)) : null

  return (
    <div>
      <div data-no-enter className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={onKey} placeholder={t('brief.style.refLabelPh')} aria-label={t('brief.style.refLabelPh')} />
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setErr(null)
          }}
          onKeyDown={onKey}
          placeholder="https://dribbble.com/shots/…"
          aria-label={t('brief.style.refUrlPh')}
          aria-invalid={!!err}
          icon={<Link2 />}
          right={
            valid !== null && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn('mr-1 flex size-6 items-center justify-center rounded-full', valid ? 'bg-success-soft text-[var(--success)]' : 'bg-danger-soft text-danger')}>
                {valid ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </motion.span>
            )
          }
          className={cn(err && 'border-danger')}
        />
        <Button icon={<Plus className="size-4" />} onClick={add} disabled={!url.trim()}>
          {t('brief.common.add')}
        </Button>
      </div>
      <FieldError show={!!err}>{err}</FieldError>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {refs.map((r) => {
            let host = r.url
            try {
              host = new URL(r.url).hostname.replace(/^www\./, '')
            } catch {
              /* keep raw */
            }
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring.smooth}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-[var(--surface)] p-2.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent font-mono text-[14px] font-semibold uppercase text-accent-ink">{host.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{r.label}</div>
                  <div className="truncate font-mono text-[11.5px] text-ink-3">{host}</div>
                </div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink" aria-label={t('brief.style.open')}>
                  <ExternalLink className="size-4" />
                </a>
                <button type="button" onClick={() => setStyle({ references: refs.filter((x) => x.id !== r.id) })} className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label={t('brief.common.remove')}>
                  <X className="size-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      {refs.length === 0 && <p className="mt-3 text-[12.5px] text-ink-3">{t('brief.style.noRefs')}</p>}
    </div>
  )
}

// ─────────────────────────── do / don't ───────────────────────────

function ListEditor({ tone, items, onChange, suggestions }: { tone: 'do' | 'dont'; items: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const t = useT()
  const [text, setText] = useState('')
  const isDo = tone === 'do'
  const add = (v: string) => {
    const s = v.trim()
    if (!s || items.some((x) => x.toLowerCase() === s.toLowerCase()) || items.length >= 8) return
    onChange([...items, s])
  }
  const icon: ReactNode = isDo ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />
  return (
    <div className={cn('rounded-[22px] p-3 sm:p-4', isDo ? 'bg-success-soft' : 'bg-danger-soft')}>
      <FieldLabel>
        <span className={cn('inline-flex items-center gap-1.5', isDo ? 'text-[color-mix(in_oklab,var(--success)_70%,var(--ink))]' : 'text-danger')}>
          {icon}
          {isDo ? t('brief.style.do') : t('brief.style.dont')}
        </span>
      </FieldLabel>
      <div data-no-enter className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(text)
              setText('')
            }
          }}
          placeholder={isDo ? t('brief.style.doPh') : t('brief.style.dontPh')}
          aria-label={isDo ? t('brief.style.do') : t('brief.style.dont')}
          className="h-10 bg-[var(--surface)]"
        />
        <Button
          size="sm"
          className="h-10"
          disabled={!text.trim()}
          onClick={() => {
            add(text)
            setText('')
          }}
          aria-label={t('brief.common.add')}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li
              key={it}
              layout
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14, height: 0 }}
              transition={spring.smooth}
              className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-[13px]"
            >
              <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', isDo ? 'bg-[var(--success)] text-white' : 'bg-danger text-white')}>
                {isDo ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">{it}</span>
              <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} className="flex size-6 items-center justify-center rounded-full text-ink-3 hover:text-ink" aria-label={t('brief.common.remove')}>
                <X className="size-3.5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {suggestions
          .filter((s) => !items.includes(s))
          .slice(0, 4)
          .map((s) => (
            <SuggestChip key={s} onClick={() => add(s)}>
              {s}
            </SuggestChip>
          ))}
      </div>
    </div>
  )
}
