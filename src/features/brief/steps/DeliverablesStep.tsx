import { useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { ArrowDown, ArrowUp, Check, GripVertical, ListChecks, ListPlus, Package, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import { disciplineTheme } from '@/theme/disciplines'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Field'
import { useWizard } from '../draftStore'
import { DELIVERABLE_SUGGESTIONS, deliverable, LIMITS, STEP, type DraftDeliverable } from '../model'
import { FieldError, Section, StepHeader, stepStagger, SuggestChip } from '../ui'

export function DeliverablesStep({ showErrors }: { showErrors: boolean }) {
  const t = useT()
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const [text, setText] = useState('')
  const [dup, setDup] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const items = draft.deliverables
  const disc = draft.discipline ?? 'visual'
  const suggestions = DELIVERABLE_SUGGESTIONS[disc]
  const has = (label: string) => items.some((x) => x.label.trim().toLowerCase() === label.trim().toLowerCase())
  const full = items.length >= LIMITS.deliverables

  const setItems = (next: DraftDeliverable[]) => set({ deliverables: next })
  const add = (label: string) => {
    const v = label.trim()
    if (!v || full) return false
    if (has(v)) {
      setDup(true)
      window.setTimeout(() => setDup(false), 600)
      return false
    }
    setItems([...items, deliverable(v)])
    return true
  }
  const toggleSuggestion = (label: string) => {
    if (has(label)) setItems(items.filter((x) => x.label.toLowerCase() !== label.toLowerCase()))
    else add(label)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (add(text)) setText('')
    }
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }
  const addAll = () => {
    const missing = suggestions.filter((s) => !has(s)).slice(0, LIMITS.deliverables - items.length)
    if (!missing.length) return
    setItems([...items, ...missing.map(deliverable)])
    toast({ title: t('brief.deliv.addedAll', { count: missing.length }), tone: 'success', duration: 1800 })
  }
  const removed = useRef<{ item: DraftDeliverable; index: number } | null>(null)
  const remove = (i: number) => {
    removed.current = { item: items[i], index: i }
    setItems(items.filter((_, j) => j !== i))
    toast({
      title: t('brief.deliv.removed'),
      description: items[i].label,
      duration: 3800,
      action: {
        label: t('brief.common.undo'),
        onClick: () => {
          const r = removed.current
          if (!r) return
          const cur = useWizard.getState().draft.deliverables
          const next = [...cur]
          next.splice(Math.min(r.index, next.length), 0, r.item)
          useWizard.getState().set({ deliverables: next })
          removed.current = null
        },
      },
    })
  }

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
        <StepHeader index={STEP.deliverables} icon={<ListChecks />} title={t('brief.deliv.title')} subtitle={t('brief.deliv.subtitle')} />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title={t('brief.deliv.list')}
          hint={t('brief.deliv.listHint')}
          icon={<Package />}
          action={
            items.length > 0 && (
              <Button size="xs" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setItems([])}>
                {t('brief.deliv.clear')}
              </Button>
            )
          }
        >
          <div data-no-enter className="flex gap-2">
            <motion.div className="min-w-0 flex-1" animate={dup ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
                disabled={full}
                placeholder={full ? t('brief.deliv.full') : t('brief.deliv.addPh')}
                aria-label={t('brief.deliv.addPh')}
                icon={<ListPlus />}
              />
            </motion.div>
            <Button
              icon={<Plus className="size-4" />}
              disabled={!text.trim() || full}
              onClick={() => {
                if (add(text)) setText('')
                inputRef.current?.focus()
              }}
            >
              <span className="hidden sm:inline">{t('brief.common.add')}</span>
            </Button>
          </div>
          <FieldError show={dup} tone="warning">
            {t('brief.deliv.duplicate')}
          </FieldError>

          <div className="mt-4">
            {items.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-[20px] border-2 border-dashed border-line-2 px-6 py-10 text-center">
                <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
                  <Package className="size-6" />
                </motion.span>
                <p className="text-[14.5px] font-medium">{t('brief.deliv.emptyTitle')}</p>
                <p className="mt-1 max-w-xs text-[12.5px] text-ink-3">{t('brief.deliv.emptyBody')}</p>
                <Button size="sm" className="mt-4" icon={<Sparkles className="size-4" />} onClick={addAll}>
                  {t('brief.deliv.addSuggested')}
                </Button>
              </motion.div>
            ) : (
              <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {items.map((it, i) => (
                    <DeliverableRow
                      key={it.id}
                      item={it}
                      index={i}
                      count={items.length}
                      onChange={(label) => setItems(items.map((x) => (x.id === it.id ? { ...x, label } : x)))}
                      onRemove={() => remove(i)}
                      onMove={(d) => move(i, d)}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-ink-3">
            <span>{t('brief.deliv.dragHint')}</span>
            <span className="font-mono tabular-nums">
              {items.length}/{LIMITS.deliverables}
            </span>
          </div>
          <FieldError show={showErrors && items.length === 0}>{t('brief.err.deliverables')}</FieldError>
        </Section>

        <Section
          title={t('brief.deliv.suggestions')}
          hint={<DisciplineBadge id={disc} />}
          icon={<Sparkles />}
          className="self-start 2xl:sticky 2xl:top-4"
          action={
            <Button size="xs" variant="soft" onClick={addAll} disabled={suggestions.every(has) || full}>
              {t('brief.deliv.addAll')}
            </Button>
          }
        >
          <motion.div layout className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <SuggestChip key={s} added={has(s)} onClick={() => toggleSuggestion(s)} color={disciplineTheme(disc).accent}>
                {s}
              </SuggestChip>
            ))}
          </motion.div>
          <p className="mt-4 rounded-2xl bg-[var(--surface-2)] p-3 text-[12.5px] leading-relaxed text-ink-2">{t('brief.deliv.tip')}</p>
        </Section>
      </div>
    </motion.div>
  )
}

function DeliverableRow({
  item,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  item: DraftDeliverable
  index: number
  count: number
  onChange: (label: string) => void
  onRemove: () => void
  onMove: (d: number) => void
}) {
  const t = useT()
  const controls = useDragControls()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.label)
  const commit = () => {
    const v = value.trim()
    if (v && v !== item.label) onChange(v)
    else setValue(item.label)
    setEditing(false)
  }
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, x: -24, scale: 0.96, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 40, scale: 0.94, filter: 'blur(6px)', transition: { duration: 0.2 } }}
      transition={spring.smooth}
      whileDrag={{ scale: 1.03, boxShadow: '0 24px 50px -20px rgba(0,0,0,.45)', zIndex: 5 }}
      className="group relative flex items-center gap-2 rounded-2xl border border-line bg-[var(--surface)] py-2 pl-1.5 pr-2 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          controls.start(e)
        }}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-ink-4 transition-colors hover:bg-[var(--surface-2)] hover:text-ink active:cursor-grabbing"
        aria-label={t('brief.deliv.drag')}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-semibold text-accent-ink">{index + 1}</span>
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setValue(item.label)
              setEditing(false)
            }
          }}
          className="h-8 min-w-0 flex-1 rounded-xl border border-[var(--accent-line)] bg-[var(--surface)] px-2.5 text-[14px] outline-none shadow-[0_0_0_4px_var(--accent-softer)]"
          aria-label={t('brief.deliv.edit')}
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="min-w-0 flex-1 truncate rounded-lg px-1 py-1 text-left text-[14px] hover:bg-[var(--surface-2)]" title={t('brief.deliv.edit')}>
          {item.label}
        </button>
      )}
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {editing ? (
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commit} className="flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--surface-2)]" aria-label={t('brief.common.save')}>
            <Check className="size-4" />
          </button>
        ) : (
          <>
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="hidden size-8 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink disabled:opacity-30 sm:flex" aria-label={t('brief.deliv.up')}>
              <ArrowUp className="size-3.5" />
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="hidden size-8 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink disabled:opacity-30 sm:flex" aria-label={t('brief.deliv.down')}>
              <ArrowDown className="size-3.5" />
            </button>
          </>
        )}
        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={onRemove} className={cn('flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger')} aria-label={t('brief.common.remove')}>
          <X className="size-4" />
        </motion.button>
      </div>
    </Reorder.Item>
  )
}
