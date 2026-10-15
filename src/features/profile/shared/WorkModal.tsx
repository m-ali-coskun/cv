import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Dices, ImagePlus, Loader2, Palette, Plus, Sparkles, Star, Upload, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { saveFile, mediaIsVideo } from '@/lib/files'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import type { ArtVariant, DisciplineId, MediaRef, PortfolioItem } from '@/store/types'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Dropzone } from '@/components/ui/Dropzone'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { TagInput } from '@/components/ui/TagInput'
import { FolderCard } from '@/components/ui/FolderCard'
import { DisciplineIcon } from '@/components/ui/Badge'
import { MediaView } from '@/components/art/MediaView'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { disciplineColor, disciplineTheme } from '@/theme/disciplines'
import { DISCIPLINE_IDS } from '@/store/types'
import { ART_VARIANTS, SKILLS, VARIANTS_FOR, artSet, mediaKey, randomSeed, sameMedia, sampleProject, yearOptions } from './data'
import { CharCount } from './ui'

export const MAX_MEDIA = 12
const MAX_FILE_MB = 80
const TITLE_MAX = 70
const DESC_MAX = 280

export interface WorkDraft {
  title: string
  description: string
  discipline: DisciplineId
  year: number
  client: string
  tags: string[]
  media: MediaRef[]
  cover: number
}

export type WorkInput = Omit<PortfolioItem, 'id' | 'likes' | 'views'>

export function emptyWork(discipline: DisciplineId): WorkDraft {
  return { title: '', description: '', discipline, year: new Date().getFullYear(), client: '', tags: [], media: [], cover: 0 }
}

export function workFromItem(p: WorkInput): WorkDraft {
  const media = p.media.length ? p.media : [p.cover]
  const cover = Math.max(0, media.findIndex((m) => sameMedia(m, p.cover)))
  return { title: p.title, description: p.description, discipline: p.discipline, year: p.year, client: p.client ?? '', tags: p.tags, media, cover }
}

/** Finished item; empty media gets generated placeholder art. */
export function workToItem(d: WorkDraft): WorkInput {
  const media = d.media.length ? d.media : artSet(randomSeed('pf'), d.discipline, 'mix', 3)
  const cover = media[Math.min(d.cover, media.length - 1)] ?? media[0]
  return {
    title: d.title.trim(),
    description: d.description.trim(),
    discipline: d.discipline,
    year: d.year,
    tags: d.tags,
    client: d.client.trim() || undefined,
    cover,
    media,
  }
}

const GENERIC_TAGS = ['Campaign', 'Identity', 'Social', 'Print', 'Web', 'Launch', 'Editorial', 'Packaging', 'Personal project', 'Award winner']

/**
 * Add / edit a portfolio item: details on the left, media (uploads or
 * generated art, pick a cover) and a live folder preview on the right.
 */
export function WorkModal({
  open,
  onClose,
  initial,
  defaultDiscipline,
  onSave,
  mode = 'add',
}: {
  open: boolean
  onClose: () => void
  initial?: WorkInput
  defaultDiscipline: DisciplineId
  onSave: (item: WorkInput) => void
  mode?: 'add' | 'edit'
}) {
  const t = useT()
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={mode === 'edit' ? t('profile.work.editTitle') : t('profile.work.addTitle')}
      description={t('profile.work.modalHint')}
    >
      <WorkForm initial={initial} defaultDiscipline={defaultDiscipline} mode={mode} onCancel={onClose} onSave={(item) => onSave(item)} />
    </Modal>
  )
}

function WorkForm({
  initial,
  defaultDiscipline,
  mode,
  onCancel,
  onSave,
}: {
  initial?: WorkInput
  defaultDiscipline: DisciplineId
  mode: 'add' | 'edit'
  onCancel: () => void
  onSave: (item: WorkInput) => void
}) {
  const t = useT()
  const ids = { title: useId(), desc: useId(), client: useId(), year: useId() }
  const [d, setD] = useState<WorkDraft>(() => (initial ? workFromItem(initial) : emptyWork(defaultDiscipline)))
  const [src, setSrc] = useState<'upload' | 'art'>('upload')
  const [variant, setVariant] = useState<ArtVariant>(VARIANTS_FOR[d.discipline][0])
  const [count, setCount] = useState(3)
  const [genSeed, setGenSeed] = useState(() => randomSeed('gen'))
  const [uploading, setUploading] = useState(0)
  const [tried, setTried] = useState(false)
  const [sampleN, setSampleN] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const set = (patch: Partial<WorkDraft>) => setD((p) => ({ ...p, ...patch }))

  // keep the art variant sensible when the discipline changes
  useEffect(() => {
    setVariant((v) => (VARIANTS_FOR[d.discipline].includes(v) ? v : VARIANTS_FOR[d.discipline][0]))
  }, [d.discipline])

  const titleErr = tried && d.title.trim().length < 2 ? t('profile.work.titleRequired') : null
  const room = MAX_MEDIA - d.media.length
  const tagSuggestions = useMemo(() => [...SKILLS[d.discipline], ...GENERIC_TAGS], [d.discipline])
  const coverFirst = useMemo(() => {
    if (!d.media.length) return []
    const c = d.media[Math.min(d.cover, d.media.length - 1)]
    return [c, ...d.media.filter((_, i) => i !== d.cover)]
  }, [d.media, d.cover])

  const addFiles = async (files: File[]) => {
    const ok = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (ok.length < files.length) toast({ title: t('profile.work.skipped', { count: files.length - ok.length }), tone: 'info' })
    const sized = ok.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (sized.length < ok.length) toast({ title: t('profile.work.tooBig', { mb: MAX_FILE_MB }), tone: 'error' })
    const take = sized.slice(0, Math.max(0, room))
    if (take.length < sized.length) toast({ title: t('profile.work.limit', { max: MAX_MEDIA }), tone: 'info' })
    if (!take.length) return
    setUploading(take.length)
    try {
      const refs: MediaRef[] = []
      for (const f of take) refs.push(await saveFile(f))
      setD((p) => ({ ...p, media: [...p.media, ...refs] }))
      setPreviewOpen(true)
      window.setTimeout(() => setPreviewOpen(false), 1400)
    } finally {
      setUploading(0)
    }
  }

  const addArt = () => {
    const n = Math.min(count, room)
    if (n <= 0) {
      toast({ title: t('profile.work.limit', { max: MAX_MEDIA }), tone: 'info' })
      return
    }
    const refs = artSet(genSeed, d.discipline, variant, n)
    setD((p) => ({ ...p, media: [...p.media, ...refs] }))
    setGenSeed(randomSeed('gen'))
    setPreviewOpen(true)
    window.setTimeout(() => setPreviewOpen(false), 1400)
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= d.media.length) return
    const media = [...d.media]
    ;[media[i], media[j]] = [media[j], media[i]]
    const cover = d.cover === i ? j : d.cover === j ? i : d.cover
    set({ media, cover })
  }
  const remove = (i: number) => {
    const media = d.media.filter((_, k) => k !== i)
    const cover = d.cover === i ? 0 : d.cover > i ? d.cover - 1 : d.cover
    set({ media, cover })
  }

  const fillSample = () => {
    const s = sampleProject(d.discipline, sampleN)
    setSampleN((n) => n + 1)
    setD({ title: s.title, description: s.description, discipline: d.discipline, year: s.year, client: s.client ?? '', tags: s.tags, media: s.media, cover: 0 })
  }

  const submit = () => {
    setTried(true)
    if (d.title.trim().length < 2) {
      document.getElementById(ids.title)?.focus()
      return
    }
    onSave(workToItem(d))
  }

  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const th = disciplineTheme(d.discipline)

  return (
    <div onKeyDown={onKey}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* ─── form ─── */}
        <div className="min-w-0 space-y-5">
          <div>
            <Label htmlFor={ids.title} hint={<CharCount value={d.title.length} max={TITLE_MAX} />}>
              {t('profile.work.title')} <span className="text-danger">*</span>
            </Label>
            <Input
              id={ids.title}
              value={d.title}
              maxLength={TITLE_MAX + 10}
              autoFocus
              placeholder={t('profile.work.titlePh')}
              onChange={(e) => set({ title: e.target.value })}
              aria-invalid={!!titleErr}
              className={cn(titleErr && 'border-danger')}
            />
            <AnimatePresence>
              {titleErr && (
                <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -4, 4, -2, 0] }} exit={{ opacity: 0 }} className="mt-1.5 text-[12px] text-danger">
                  {titleErr}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <Label htmlFor={ids.desc} hint={<CharCount value={d.description.length} max={DESC_MAX} />}>
              {t('profile.work.description')}
            </Label>
            <Textarea id={ids.desc} rows={3} value={d.description} placeholder={t('profile.work.descriptionPh')} onChange={(e) => set({ description: e.target.value })} className="min-h-[88px]" />
          </div>

          <div>
            <Label>{t('profile.work.discipline')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINE_IDS.map((id) => {
                const on = d.discipline === id
                const c = disciplineColor(id)
                return (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() => set({ discipline: id })}
                    whileTap={{ scale: 0.94 }}
                    className={cn('relative inline-flex h-9 items-center gap-1.5 rounded-full border pl-1 pr-3 text-[12.5px] font-medium transition-colors', on ? 'border-transparent text-ink' : 'border-line-2 text-ink-3 hover:text-ink')}
                  >
                    {on && <motion.span layoutId="work-disc" className="absolute inset-0 rounded-full" style={{ background: `color-mix(in oklab, ${c} 24%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${c}` }} transition={spring.pill} />}
                    <span className="relative z-[1]">
                      <DisciplineIcon id={id} size={26} />
                    </span>
                    <span className="relative z-[1]">{t(`core.discipline.${id}`)}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={ids.client} hint={t('profile.work.optional')}>
                {t('profile.work.client')}
              </Label>
              <Input id={ids.client} value={d.client} placeholder={t('profile.work.clientPh')} onChange={(e) => set({ client: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={ids.year}>{t('profile.work.year')}</Label>
              <Select id={ids.year} value={d.year} onChange={(e) => set({ year: Number(e.target.value) })} className="font-mono">
                {yearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label hint={`${d.tags.length}/8`}>{t('profile.work.tags')}</Label>
            <TagInput value={d.tags} onChange={(tags) => set({ tags })} suggestions={tagSuggestions} max={8} quickPicks={5} transform="capitalize" placeholder={t('profile.work.tagsPh')} />
          </div>

          {/* ─── media ─── */}
          <div className="rounded-[22px] border border-line bg-[var(--surface-2)]/50 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[14px] font-medium">{t('profile.work.media')}</div>
                <div className="text-[12px] text-ink-3">{t('profile.work.mediaHint', { n: d.media.length, max: MAX_MEDIA })}</div>
              </div>
              <Segmented<'upload' | 'art'>
                size="sm"
                pill="surface"
                value={src}
                onChange={setSrc}
                options={[
                  { value: 'upload', label: t('profile.work.upload'), icon: <Upload className="size-3.5" /> },
                  { value: 'art', label: t('profile.work.generate'), icon: <Palette className="size-3.5" /> },
                ]}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {src === 'upload' ? (
                <motion.div key="up" initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: 16, filter: 'blur(4px)' }} transition={{ duration: 0.28, ease: EASE_OUT }}>
                  <Dropzone onFiles={addFiles} accept="image/*,video/*" compact className="bg-[var(--surface)]/60">
                    <motion.span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-ink" whileHover={{ rotate: -8, y: -3 }}>
                      {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                    </motion.span>
                    <p className="text-[13.5px] font-medium">{uploading ? t('profile.work.uploading', { count: uploading }) : t('profile.work.dropMedia')}</p>
                    <p className="text-[12px] text-ink-3">{t('profile.work.dropMediaHint', { mb: MAX_FILE_MB })}</p>
                  </Dropzone>
                </motion.div>
              ) : (
                <motion.div key="art" initial={{ opacity: 0, x: 16, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -16, filter: 'blur(4px)' }} transition={{ duration: 0.28, ease: EASE_OUT }}>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {ART_VARIANTS.map((v) => {
                      const on = v === variant
                      const fits = VARIANTS_FOR[d.discipline].includes(v)
                      return (
                        <motion.button
                          key={v}
                          type="button"
                          onClick={() => setVariant(v)}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.94 }}
                          aria-pressed={on}
                          aria-label={t(`profile.art.${v}`)}
                          title={t(`profile.art.${v}`)}
                          className={cn('relative aspect-[4/3] overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-[var(--surface)] transition-shadow', on ? 'ring-[var(--accent)]' : 'ring-transparent')}
                        >
                          <GenerativeArt seed={`${genSeed}-${v}`} variant={v} discipline={d.discipline} playBadge={false} className="size-full" />
                          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-left text-[10px] font-medium text-white">{t(`profile.art.${v}`)}</span>
                          {fits && <span className="absolute right-1 top-1 size-1.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ background: th.accent, color: th.accent }} />}
                        </motion.button>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] text-ink-3">{t('profile.work.pieces')}</span>
                    <Segmented<string>
                      size="sm"
                      pill="night"
                      value={String(count)}
                      onChange={(v) => setCount(Number(v))}
                      options={[1, 2, 3, 4, 6].map((n) => ({ value: String(n), label: String(n) }))}
                    />
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="glass" icon={<Dices className="size-4" />} onClick={() => setGenSeed(randomSeed('gen'))}>
                        {t('profile.work.reroll')}
                      </Button>
                      <Button size="sm" icon={<Plus className="size-4" />} onClick={addArt} disabled={room <= 0}>
                        {t('profile.work.addArt', { count: Math.min(count, Math.max(room, 0)) })}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* chosen media */}
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {d.media.map((m, i) => {
                  const isCover = i === d.cover
                  return (
                    <motion.div
                      key={mediaKey(m)}
                      layout
                      initial={{ opacity: 0, scale: 0.6, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 0.6, filter: 'blur(6px)', transition: { duration: 0.18 } }}
                      transition={spring.bouncy}
                      className={cn('group relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--surface-3)] ring-2', isCover ? 'ring-[var(--accent)]' : 'ring-transparent')}
                    >
                      <MediaView media={m} playBadge={mediaIsVideo(m)} className="size-full" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
                      {isCover && (
                        <motion.span layoutId="cover-badge" transition={spring.pill} className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">
                          <Star className="size-2.5 fill-current" />
                          {t('profile.work.cover')}
                        </motion.span>
                      )}
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <div className="flex gap-1">
                          <TileBtn label={t('profile.work.moveLeft')} onClick={() => move(i, -1)} disabled={i === 0}>
                            <ArrowLeft className="size-3" />
                          </TileBtn>
                          <TileBtn label={t('profile.work.moveRight')} onClick={() => move(i, 1)} disabled={i === d.media.length - 1}>
                            <ArrowRight className="size-3" />
                          </TileBtn>
                        </div>
                        <div className="flex gap-1">
                          {!isCover && (
                            <TileBtn label={t('profile.work.makeCover')} onClick={() => set({ cover: i })}>
                              <Star className="size-3" />
                            </TileBtn>
                          )}
                          <TileBtn label={t('core.action.remove')} onClick={() => remove(i)} danger>
                            <X className="size-3" />
                          </TileBtn>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
                {Array.from({ length: uploading }, (_, i) => (
                  <motion.div key={`up-${i}`} layout initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-3)]">
                    <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.4)_50%,transparent_70%)] bg-[length:200%_100%]" />
                    <Loader2 className="size-4 animate-spin text-ink-3" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {!d.media.length && !uploading && (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                <Sparkles className="size-3.5 text-accent-text" />
                {t('profile.work.autoArt')}
              </p>
            )}
          </div>
        </div>

        {/* ─── live preview ─── */}
        <aside className="hidden lg:block">
          <div className="sticky top-0 space-y-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{t('profile.work.livePreview')}</div>
            <div className="flex justify-center rounded-[24px] bg-[var(--surface-2)]/70 px-5 pb-6 pt-10 dot-grid">
              <FolderCard
                size="md"
                open={previewOpen || undefined}
                items={coverFirst.length ? coverFirst : []}
                title={d.title.trim() || t('profile.work.untitled')}
                subtitle={[d.client.trim(), d.year].filter(Boolean).join(' · ')}
                color={th.accent}
                icon={<DisciplineIcon id={d.discipline} size={22} />}
                badge={d.media.length ? <span className="font-mono text-[11px] text-ink-3">{d.media.length}</span> : undefined}
              />
            </div>
            <div className="space-y-2 text-[12.5px]">
              <p className="line-clamp-4 text-ink-2">{d.description.trim() || <span className="text-ink-3">{t('profile.work.noDescription')}</span>}</p>
              <div className="flex flex-wrap gap-1">
                {d.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11.5px] text-ink-2">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* footer */}
      <div className="sticky -bottom-6 z-[2] -mx-6 -mb-6 mt-6 flex flex-wrap items-center gap-2 border-t border-line bg-[color-mix(in_oklab,var(--surface)_95%,transparent)] px-6 py-4 backdrop-blur-xl safe-bottom">
        <Button variant="ghost" size="sm" icon={<Sparkles className="size-4" />} onClick={fillSample}>
          {t('profile.work.sample')}
        </Button>
        <span className="hidden font-mono text-[11px] text-ink-3 md:inline">{t('profile.work.shortcut')}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="glass" onClick={onCancel}>
            {t('core.action.cancel')}
          </Button>
          <Button onClick={submit} icon={mode === 'edit' ? undefined : <Plus className="size-4" />} disabled={uploading > 0}>
            {mode === 'edit' ? t('profile.work.saveChanges') : t('profile.addWork')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TileBtn({ label, onClick, children, disabled, danger }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; danger?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.88 }}
      className={cn('flex size-6 items-center justify-center rounded-full bg-white/85 text-[#0b0b0c] shadow backdrop-blur disabled:opacity-30', danger && 'hover:bg-danger hover:text-white')}
    >
      {children}
    </motion.button>
  )
}
