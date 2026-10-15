import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Check, CheckCheck, Code2, Copy, Link2, NotebookPen, Palette, Pencil, Plus, Smile, ThumbsDown, ThumbsUp, Trash2, Type, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { uid } from '@/lib/ids'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { StyleGuide } from '@/store/types'
import { Button } from '@/components/ui/Button'
import { ColorPicker, readableOn } from '@/components/ui/ColorPicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Textarea } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import { useJobCtx } from '../context'
import { useCopy } from '../hooks'
import { FONT_SUGGESTIONS, MOOD_SUGGESTIONS, fontStack, hostOf, hueColor } from '../model'
import { SectionTitle, listItem } from '../ui'

export function DesignTab() {
  const t = useT()
  const copy = useCopy()
  const { job, side, canAct, styleEdit, setStyleEdit, client } = useJobCtx()
  const update = useApp((s) => s.updateStyleGuide)
  const sg = job.styleGuide
  const editable = canAct && side === 'client'
  const edit = editable && styleEdit
  const patch = (p: Partial<StyleGuide>) => update(job.id, p)
  const empty = !sg.palette.length && !sg.fonts.length && !sg.mood.length && !sg.references.length && !sg.dos.length && !sg.donts.length && !sg.notes

  const copyCss = () => {
    const css = [':root {', ...sg.palette.map((c, i) => `  --brand-${i + 1}: ${c};`), ...sg.fonts.map((f, i) => `  --font-${i === 0 ? 'display' : i === 1 ? 'body' : i + 1}: ${fontStack(f)};`), '}'].join('\n')
    copy(css, t('job.design.cssCopied'))
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13.5px] text-ink-3">
          {t(edit ? 'job.design.editing' : 'job.design.intro', { name: client?.name ?? '' })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {sg.palette.length > 0 && (
            <Button size="sm" variant="ghost" icon={<Code2 className="size-3.5" />} onClick={copyCss}>
              {t('job.design.copyCss')}
            </Button>
          )}
          {editable && (
            <Button
              size="sm"
              variant={edit ? 'primary' : 'glass'}
              icon={edit ? <CheckCheck className="size-3.5" /> : <Pencil className="size-3.5" />}
              onClick={() => {
                if (edit) toast({ title: t('job.design.saved'), description: job.title, tone: 'success', duration: 2200 })
                setStyleEdit(!edit)
              }}
            >
              {edit ? t('job.design.done') : t('job.design.edit')}
            </Button>
          )}
        </div>
      </div>

      {empty && !edit ? (
        <EmptyState
          icon={<Palette />}
          title={t('job.design.emptyTitle')}
          description={t(editable ? 'job.design.emptyClient' : 'job.design.emptyDesigner')}
          action={
            editable && (
              <Button icon={<Pencil className="size-4" />} onClick={() => setStyleEdit(true)}>
                {t('job.design.edit')}
              </Button>
            )
          }
        />
      ) : (
        <>
          <PaletteSection palette={sg.palette} edit={edit} onChange={(palette) => patch({ palette })} />
          <div className="grid gap-7 @min-[760px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <FontsSection fonts={sg.fonts} edit={edit} onChange={(fonts) => patch({ fonts })} />
            <MoodSection mood={sg.mood} palette={sg.palette} edit={edit} onChange={(mood) => patch({ mood })} />
          </div>
          <ReferencesSection refs={sg.references} edit={edit} onChange={(references) => patch({ references })} />
          <div className="grid gap-4 @min-[600px]:grid-cols-2">
            <RuleList kind="do" items={sg.dos} edit={edit} onChange={(dos) => patch({ dos })} />
            <RuleList kind="dont" items={sg.donts} edit={edit} onChange={(donts) => patch({ donts })} />
          </div>
          <NotesSection notes={sg.notes} edit={edit} onChange={(notes) => patch({ notes })} />
        </>
      )}
    </div>
  )
}

// ─────────────── palette ───────────────

function PaletteSection({ palette, edit, onChange }: { palette: string[]; edit: boolean; onChange: (p: string[]) => void }) {
  const t = useT()
  const copy = useCopy()
  const [copied, setCopied] = useState<number | null>(null)
  useEffect(() => {
    if (copied === null) return
    const id = window.setTimeout(() => setCopied(null), 1400)
    return () => window.clearTimeout(id)
  }, [copied])

  return (
    <section>
      <SectionTitle icon={<Palette />} title={t('job.design.palette')} sub={t('job.design.paletteSub', { count: palette.length })} />
      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          {edit ? (
            <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
              <ColorPicker value={palette} onChange={onChange} max={8} />
            </motion.div>
          ) : palette.length ? (
            <motion.div
              key="view"
              className="grid grid-cols-3 gap-2 @min-[520px]:flex @min-[520px]:h-48 @min-[520px]:gap-2.5"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {palette.map((hex, i) => {
                const ink = readableOn(hex)
                return (
                  <motion.button
                    key={`${hex}-${i}`}
                    type="button"
                    onClick={() => {
                      copy(hex.toUpperCase(), t('job.design.hexCopied', { hex: hex.toUpperCase() }))
                      setCopied(i)
                    }}
                    variants={{ hidden: { opacity: 0, y: 30, scaleY: 0.6 }, show: { opacity: 1, y: 0, scaleY: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } } }}
                    whileHover={{ y: -8, transition: spring.snappy }}
                    whileTap={{ scale: 0.96 }}
                    className="group/sw relative flex h-28 min-w-0 origin-bottom flex-col justify-between overflow-hidden rounded-[20px] p-3 text-left ring-1 ring-inset ring-black/5 @min-[520px]:h-full @min-[520px]:flex-1"
                    style={{ background: hex, color: ink }}
                    aria-label={t('job.design.copyHex', { hex })}
                  >
                    <span className="font-mono text-[10.5px] opacity-60">0{i + 1}</span>
                    <span className="flex items-end justify-between gap-1">
                      <span className="min-w-0">
                        <span className="block text-[22px] font-semibold leading-none tracking-[-0.03em] sm:text-[26px]">Aa</span>
                        <span className="mt-1 block truncate font-mono text-[11.5px] font-medium uppercase">{hex}</span>
                      </span>
                      <span className="relative size-4 shrink-0">
                        <AnimatePresence initial={false}>
                          {copied === i ? (
                            <motion.span key="ok" className="absolute inset-0" initial={{ scale: 0.3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.3, opacity: 0 }} transition={spring.bouncy}>
                              <Check className="size-4" />
                            </motion.span>
                          ) : (
                            <motion.span key="cp" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <Copy className="size-4 opacity-0 transition-opacity group-hover/sw:opacity-70" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>
          ) : (
            <Muted key="none">{t('job.design.none')}</Muted>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

// ─────────────── fonts ───────────────

function FontsSection({ fonts, edit, onChange }: { fonts: string[]; edit: boolean; onChange: (f: string[]) => void }) {
  const t = useT()
  return (
    <section className="min-w-0">
      <SectionTitle icon={<Type />} title={t('job.design.fonts')} sub={t('job.design.fontsSub')} />
      <div className="mt-4">
        {edit ? (
          <TagInput value={fonts} onChange={onChange} suggestions={FONT_SUGGESTIONS} max={4} quickPicks={6} placeholder={t('job.design.fontPh')} icon={<Type className="size-4" />} />
        ) : fonts.length ? (
          <div className="grid gap-2.5 @min-[480px]:grid-cols-2">
            {fonts.map((f, i) => (
              <motion.div
                key={f}
                className="group/font relative min-w-0 overflow-hidden rounded-[20px] bg-[var(--surface-2)] p-4"
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: EASE_OUT }}
                whileHover={{ y: -3 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <motion.span
                    className="block text-[54px] leading-[0.9] tracking-[-0.04em] text-ink"
                    style={{ fontFamily: fontStack(f) }}
                    whileHover={{ scale: 1.08, rotate: -2 }}
                    transition={spring.bouncy}
                  >
                    Aa
                  </motion.span>
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 font-mono text-[10.5px] text-ink-3">
                    {i === 0 ? t('job.design.display') : i === 1 ? t('job.design.body') : t('job.design.accent')}
                  </span>
                </div>
                <div className="mt-3 truncate text-[20px] text-ink" style={{ fontFamily: fontStack(f) }}>
                  Aa Bb 123
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-2" style={{ fontFamily: fontStack(f) }}>
                  The quick brown fox jumps over the lazy dog.
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                  <span className="truncate text-[13px] font-medium text-ink">{f}</span>
                  <a
                    href={`https://fonts.google.com/?query=${encodeURIComponent(f)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-ink-3 transition-colors hover:text-ink"
                  >
                    {t('job.design.findFont')}
                    <ArrowUpRight className="size-3" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <Muted>{t('job.design.none')}</Muted>
        )}
      </div>
    </section>
  )
}

// ─────────────── mood ───────────────

function MoodSection({ mood, palette, edit, onChange }: { mood: string[]; palette: string[]; edit: boolean; onChange: (m: string[]) => void }) {
  const t = useT()
  return (
    <section className="min-w-0">
      <SectionTitle icon={<Smile />} title={t('job.design.mood')} sub={t('job.design.moodSub')} />
      <div className="mt-4">
        {edit ? (
          <TagInput value={mood} onChange={onChange} suggestions={MOOD_SUGGESTIONS} max={8} quickPicks={6} transform="capitalize" />
        ) : mood.length ? (
          <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
            {mood.map((m, i) => {
              const c = palette.length ? palette[i % palette.length] : 'var(--accent)'
              return (
                <motion.span
                  key={m}
                  variants={{ hidden: { opacity: 0, scale: 0.5, rotate: -8 }, show: { opacity: 1, scale: 1, rotate: 0, transition: spring.bouncy } }}
                  whileHover={{ scale: 1.08, rotate: i % 2 ? 3 : -3 }}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-medium text-ink"
                  style={{ background: `color-mix(in oklab, ${c} 16%, var(--surface))` }}
                >
                  <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                  {m}
                </motion.span>
              )
            })}
          </motion.div>
        ) : (
          <Muted>{t('job.design.none')}</Muted>
        )}
      </div>
    </section>
  )
}

// ─────────────── references ───────────────

function ReferencesSection({ refs, edit, onChange }: { refs: StyleGuide['references']; edit: boolean; onChange: (r: StyleGuide['references']) => void }) {
  const t = useT()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const valid = /^https?:\/\/\S+\.\S+/.test(url.trim())
  return (
    <section>
      <SectionTitle icon={<Link2 />} title={t('job.design.references')} sub={t('job.design.refsSub', { count: refs.length })} />
      {refs.length > 0 ? (
        <ul className="mt-4 grid gap-2 @min-[480px]:grid-cols-2 @min-[860px]:grid-cols-3">
          <AnimatePresence initial={false}>
            {refs.map((r) => {
              const host = hostOf(r.url)
              return (
                <motion.li key={r.id} layout {...listItem} className="relative min-w-0">
                  <motion.a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    transition={spring.snappy}
                    className="group/ref flex min-w-0 items-center gap-3 rounded-[18px] border border-line bg-[var(--surface)]/70 p-3 pr-10 transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,.35)]"
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[16px] font-semibold uppercase text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]"
                      style={{ background: hueColor(host) }}
                    >
                      {host.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{r.label}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-3">{host}</span>
                    </span>
                    {!edit && <ArrowUpRight className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3 transition-transform group-hover/ref:-translate-y-[60%] group-hover/ref:translate-x-0.5" />}
                  </motion.a>
                  {edit && (
                    <button
                      type="button"
                      aria-label={t('core.action.remove')}
                      onClick={() => onChange(refs.filter((x) => x.id !== r.id))}
                      className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      ) : (
        !edit && <Muted className="mt-4">{t('job.design.none')}</Muted>
      )}
      {edit && (
        <form
          className="mt-3 grid gap-2 @min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onChange([...refs, { id: uid('rf_'), label: label.trim() || hostOf(url.trim()), url: url.trim() }])
            setLabel('')
            setUrl('')
          }}
        >
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('job.design.refLabel')} />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" icon={<Link2 />} />
          <Button type="submit" disabled={!valid} icon={<Plus className="size-4" />}>
            {t('core.action.add')}
          </Button>
        </form>
      )}
    </section>
  )
}

// ─────────────── do / don't ───────────────

function RuleList({ kind, items, edit, onChange }: { kind: 'do' | 'dont'; items: string[]; edit: boolean; onChange: (i: string[]) => void }) {
  const t = useT()
  const [draft, setDraft] = useState('')
  const isDo = kind === 'do'
  return (
    <motion.section
      className={cn(
        'relative min-w-0 overflow-hidden rounded-[22px] border p-4',
        isDo ? 'border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-success-soft' : 'border-[color-mix(in_oklab,var(--danger)_25%,transparent)] bg-danger-soft',
      )}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: isDo ? 0 : 0.08 }}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('flex size-8 items-center justify-center rounded-xl text-white', isDo ? 'bg-success' : 'bg-danger')}>
          {isDo ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
        </span>
        <h4 className="text-[15px] font-medium tracking-[-0.01em] text-ink">{isDo ? t('job.design.dos') : t('job.design.donts')}</h4>
        <span className="ml-auto font-mono text-[11.5px] text-ink-3">{items.length}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((it, i) => (
            <motion.li key={`${it}-${i}`} layout {...listItem} className="group/rule flex items-start gap-2.5 rounded-xl bg-[var(--surface)]/60 px-3 py-2">
              <span className={cn('mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full', isDo ? 'text-success' : 'text-danger')}>
                {isDo ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">{it}</span>
              {edit && (
                <button type="button" aria-label={t('core.action.remove')} onClick={() => onChange(items.filter((_, j) => j !== i))} className="flex size-6 shrink-0 items-center justify-center rounded-full text-ink-3 hover:text-danger">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        {!items.length && !edit && <li className="px-1 text-[13px] text-ink-3">{t('job.design.none')}</li>}
      </ul>
      {edit && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            onChange([...items, draft.trim()])
            setDraft('')
          }}
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={isDo ? t('job.design.doPh') : t('job.design.dontPh')} className="h-9" />
          <Button size="sm" type="submit" disabled={!draft.trim()} icon={<Plus className="size-3.5" />} aria-label={t('core.action.add')} />
        </form>
      )}
    </motion.section>
  )
}

// ─────────────── notes ───────────────

function NotesSection({ notes, edit, onChange }: { notes: string; edit: boolean; onChange: (n: string) => void }) {
  const t = useT()
  const [draft, setDraft] = useState(notes)
  useEffect(() => setDraft(notes), [notes])
  // autosave shortly after typing stops
  useEffect(() => {
    if (!edit || draft === notes) return
    const id = window.setTimeout(() => onChange(draft), 700)
    return () => window.clearTimeout(id)
  }, [draft, notes, edit, onChange])
  return (
    <section>
      <SectionTitle icon={<NotebookPen />} title={t('job.design.notes')} />
      <div className="mt-3">
        {edit ? (
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== notes && onChange(draft)} placeholder={t('job.design.notesPh')} className="min-h-[110px]" />
        ) : notes ? (
          <div className="relative rounded-[20px] bg-[var(--surface-2)] p-4 pl-5 text-[14px] leading-relaxed text-ink-2">
            <span aria-hidden className="absolute -top-1 left-3 font-serif text-[44px] leading-none text-[var(--accent-text)] opacity-60">
              “
            </span>
            <p className="relative whitespace-pre-line pt-2">{notes}</p>
          </div>
        ) : (
          <Muted>{t('job.design.none')}</Muted>
        )}
      </div>
    </section>
  )
}

function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('rounded-[16px] border border-dashed border-line-2 px-4 py-3 text-[13px] text-ink-3', className)}>{children}</p>
}
