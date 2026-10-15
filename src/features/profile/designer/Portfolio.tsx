import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowUpToLine, Copy, Eye, FolderOpen, GripVertical, Heart, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { EASE_OUT, spring, FILTER_TWEEN } from '@/lib/motion'
import { saveFile } from '@/lib/files'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Designer, PortfolioItem } from '@/store/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { FolderCard } from '@/components/ui/FolderCard'
import { DisciplineBadge, DisciplineIcon, Pill } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu } from '@/components/ui/Menu'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { MediaView } from '@/components/art/MediaView'
import { disciplineColor } from '@/theme/disciplines'
import { useMediaViewer } from '@/features/discover/ProfileBits'
import { useIsMobile } from '@/features/discover/hooks'
import { WorkModal, type WorkInput } from '../shared/WorkModal'
import { sampleProject } from '../shared/data'
import { markSaved, markSaving, scrollToSection } from '../shared/saveState'
import { SectionCard } from '../shared/ui'

type ModalState = { mode: 'add' } | { mode: 'edit'; id: string } | null

/**
 * Portfolio manager: folder grid with drag-to-reorder (dnd-kit, rect
 * strategy), a compact list view (motion Reorder), add/edit modal, drop files
 * straight onto a folder, lightbox, delete with undo. `?add=1` opens the modal.
 */
export function PortfolioSection({ d }: { d: Designer }) {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const add = useApp((s) => s.addPortfolioItem)
  const updateItem = useApp((s) => s.updatePortfolioItem)
  const removeItem = useApp((s) => s.removePortfolioItem)
  const reorder = useApp((s) => s.reorderPortfolio)
  const [modal, setModal] = useState<ModalState>(null)
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('designtab-profile-pf-view') as 'grid' | 'list') || 'grid'
    } catch {
      return 'grid'
    }
  })
  const [sampleN, setSampleN] = useState(0)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const viewer = useMediaViewer()
  const [confirm, confirmDialog] = useConfirm()

  // ?add=1 (top bar "Add work") opens the modal, then cleans the URL
  const addParam = params.get('add')
  useEffect(() => {
    if (addParam !== '1') return
    setModal({ mode: 'add' })
    const next = new URLSearchParams(params)
    next.delete('add')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addParam])

  useEffect(() => {
    try {
      localStorage.setItem('designtab-profile-pf-view', view)
    } catch {
      /* ignore */
    }
  }, [view])

  useEffect(() => {
    if (!justAdded) return
    const id = window.setTimeout(() => setJustAdded(null), 2200)
    return () => window.clearTimeout(id)
  }, [justAdded])

  const saved = () => {
    markSaving('portfolio')
    window.setTimeout(() => markSaved('portfolio'), 380)
  }

  const onSave = (input: WorkInput) => {
    if (modal?.mode === 'edit') {
      updateItem(modal.id, input)
      toast({ title: t('profile.work.updated'), description: input.title, tone: 'success' })
    } else {
      const it = add(input)
      setJustAdded(it.id)
      toast({ title: t('profile.work.added'), description: input.title, tone: 'success' })
      window.setTimeout(() => scrollToSection('portfolio', false), 320)
    }
    saved()
    setModal(null)
  }

  const addSample = () => {
    const it = add(sampleProject(d.primary, sampleN))
    setSampleN((n) => n + 1)
    setJustAdded(it.id)
    saved()
    toast({ title: t('profile.work.added'), description: it.title, tone: 'success' })
  }

  const remove = async (it: PortfolioItem) => {
    const ok = await confirm({
      title: t('profile.work.deleteTitle'),
      description: t('profile.work.deleteText', { title: it.title }),
      tone: 'danger',
      confirmLabel: t('core.action.delete'),
    })
    if (!ok) return
    const order = useApp.getState().designers.find((x) => x.id === d.id)?.portfolio.map((p) => p.id) ?? []
    const index = order.indexOf(it.id)
    removeItem(it.id)
    saved()
    toast({
      title: t('profile.work.deleted'),
      description: it.title,
      action: {
        label: t('core.action.undo'),
        onClick: () => {
          const { id: _id, likes, views, ...rest } = it
          void _id
          const back = add(rest)
          useApp.getState().updatePortfolioItem(back.id, { likes, views })
          const ids = order.map((x) => (x === it.id ? back.id : x))
          if (index >= 0) reorder(ids)
          saved()
        },
      },
    })
  }

  const duplicate = (it: PortfolioItem) => {
    const { id: _id, likes: _l, views: _v, ...rest } = it
    void _id
    void _l
    void _v
    const copy = add({ ...rest, title: `${it.title} (${t('profile.work.copy')})` })
    setJustAdded(copy.id)
    saved()
  }

  const moveToTop = (id: string) => {
    reorder([id, ...d.portfolio.map((p) => p.id).filter((x) => x !== id)])
    saved()
    toast({ title: t('profile.work.featuredNow'), tone: 'success' })
  }

  const dropFiles = async (it: PortfolioItem, files: File[]) => {
    const ok = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/')).slice(0, Math.max(0, 12 - it.media.length))
    if (!ok.length) {
      toast({ title: t('profile.work.dropNothing'), tone: 'info' })
      return
    }
    const refs = []
    for (const f of ok) refs.push(await saveFile(f))
    updateItem(it.id, { media: [...it.media, ...refs] })
    saved()
    toast({ title: t('profile.work.filesAdded', { count: refs.length, title: it.title }), tone: 'success' })
  }

  const open = (it: PortfolioItem, el: Element | null) => {
    const media = it.media.length ? it.media : [it.cover]
    viewer.open(media, 0, it.title, el, media.map((_, k) => `${it.title} — ${k + 1}/${media.length}${it.description ? ` · ${it.description}` : ''}`))
  }

  const editing = modal?.mode === 'edit' ? d.portfolio.find((p) => p.id === modal.id) : undefined
  const totalLikes = d.portfolio.reduce((n, p) => n + p.likes, 0)
  const actions = { edit: (id: string) => setModal({ mode: 'edit', id }), remove, duplicate, moveToTop, dropFiles, open }

  return (
    <SectionCard
      id="portfolio"
      icon={<FolderOpen />}
      title={t('profile.portfolio.title')}
      subtitle={t('profile.portfolio.subtitle', { count: d.portfolio.length, likes: totalLikes })}
      action={
        <div className="flex items-center gap-2">
          <Segmented<'grid' | 'list'>
            size="sm"
            value={view}
            onChange={setView}
            className="hidden sm:inline-flex"
            options={[
              { value: 'grid', label: <LayoutGrid className="size-4" aria-label={t('profile.portfolio.grid')} /> },
              { value: 'list', label: <List className="size-4" aria-label={t('profile.portfolio.list')} /> },
            ]}
          />
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModal({ mode: 'add' })}>
            <span className="hidden sm:inline">{t('profile.addWork')}</span>
          </Button>
        </div>
      }
    >
      {d.portfolio.length === 0 ? (
        <EmptyState
          icon={<FolderOpen />}
          title={t('profile.portfolio.emptyTitle')}
          description={t('profile.portfolio.emptyText')}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<Plus className="size-4" />} onClick={() => setModal({ mode: 'add' })}>
                {t('profile.addWork')}
              </Button>
              <Button variant="glass" icon={<Sparkles className="size-4" />} onClick={addSample}>
                {t('profile.portfolio.sample')}
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
            <GripVertical className="size-3.5" />
            <span className="min-w-0 flex-1">{t('profile.portfolio.hint')}</span>
            <Segmented<'grid' | 'list'>
              size="sm"
              value={view}
              onChange={setView}
              className="sm:hidden"
              options={[
                { value: 'grid', label: <LayoutGrid className="size-4" aria-label={t('profile.portfolio.grid')} /> },
                { value: 'list', label: <List className="size-4" aria-label={t('profile.portfolio.list')} /> },
              ]}
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              {view === 'grid' ? (
                <FolderGrid items={d.portfolio} justAdded={justAdded} actions={actions} onAdd={() => setModal({ mode: 'add' })} onReorder={(ids) => (reorder(ids), saved())} />
              ) : (
                <ListView items={d.portfolio} actions={actions} onReorder={(ids) => (reorder(ids), saved())} />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <WorkModal
        open={!!modal}
        mode={modal?.mode === 'edit' ? 'edit' : 'add'}
        initial={editing}
        defaultDiscipline={d.primary}
        onClose={() => setModal(null)}
        onSave={onSave}
      />
      {confirmDialog}
      {viewer.element}
    </SectionCard>
  )
}

interface Actions {
  edit: (id: string) => void
  remove: (it: PortfolioItem) => void
  duplicate: (it: PortfolioItem) => void
  moveToTop: (id: string) => void
  dropFiles: (it: PortfolioItem, files: File[]) => void
  open: (it: PortfolioItem, el: Element | null) => void
}

// ───────────────────────────── grid (dnd-kit) ─────────────────────────────

function FolderGrid({ items, justAdded, actions, onAdd, onReorder }: { items: PortfolioItem[]; justAdded: string | null; actions: Actions; onAdd: () => void; onReorder: (ids: string[]) => void }) {
  const t = useT()
  const mobile = useIsMobile()
  const [ids, setIds] = useState(() => items.map((p) => p.id))
  const [active, setActive] = useState<string | null>(null)
  const byId = useMemo(() => new Map(items.map((p) => [p.id, p])), [items])
  // follow store changes (add / remove / external reorder) when not dragging
  const sig = items.map((p) => p.id).join('|')
  useEffect(() => {
    if (!active) setIds(items.map((p) => p.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onStart = (e: DragStartEvent) => setActive(String(e.active.id))
  const onEnd = (e: DragEndEvent) => {
    setActive(null)
    const { active: a, over } = e
    if (!over || a.id === over.id) return
    const next = arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id)))
    setIds(next)
    onReorder(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 items-start justify-items-center gap-x-3 gap-y-8 pt-7 sm:gap-x-5 @2xl:grid-cols-3">
          {ids.map((id, i) => {
            const it = byId.get(id)
            if (!it) return null
            return <SortableFolder key={id} item={it} index={i} size={mobile ? 'sm' : 'md'} fresh={justAdded === id} actions={actions} dragging={active === id} />
          })}
          <motion.button
            type="button"
            onClick={onAdd}
            layout
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            className="group flex aspect-[5/4.1] w-full max-w-[290px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line-2 text-ink-3 transition-colors hover:border-[var(--accent)] hover:bg-accent-softer hover:text-ink"
          >
            <motion.span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] transition-colors group-hover:bg-accent group-hover:text-accent-ink" whileHover={{ rotate: 90 }} transition={spring.snappy}>
              <Plus className="size-5" />
            </motion.span>
            <span className="text-[13px] font-medium">{t('profile.addWork')}</span>
          </motion.button>
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableFolder({ item: it, index, size, fresh, actions, dragging }: { item: PortfolioItem; index: number; size: 'sm' | 'md'; fresh: boolean; actions: Actions; dragging: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement | null>(null)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: it.id })
  const media = it.media.length ? it.media : [it.cover]
  const ordered = [it.cover, ...media.filter((m) => m !== it.cover)]
  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        ref.current = el
      }}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: dragging ? 30 : undefined }}
      className="relative flex w-full justify-center has-[[role=menu]]:z-40"
    >
      <motion.div
        className="relative w-full"
        style={{ maxWidth: size === 'sm' ? 210 : 290 }}
        initial={fresh ? { opacity: 0, scale: 0.6, y: 30, filter: 'blur(10px)' } : { opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: dragging ? 1.06 : 1, rotate: dragging ? -2.5 : 0, y: 0, filter: 'blur(0px)' }}
        transition={fresh ? { ...spring.bouncy, delay: 0.15 } : { type: 'spring', stiffness: 380, damping: 26, filter: FILTER_TWEEN, delay: dragging ? 0 : Math.min(index, 8) * 0.04 }}
      >
        {fresh && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-[30px]"
            style={{ boxShadow: '0 0 0 2px var(--accent), 0 0 50px -4px var(--accent)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, ease: EASE_OUT }}
          />
        )}
        <FolderCard
          size={size}
          items={ordered}
          title={it.title}
          subtitle={[it.client, it.year].filter(Boolean).join(' · ')}
          color={disciplineColor(it.discipline)}
          icon={<DisciplineIcon id={it.discipline} size={size === 'sm' ? 18 : 22} />}
          badge={
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-3">
              <Heart className="size-3" />
              {it.likes}
            </span>
          }
          onClick={() => actions.open(it, ref.current?.querySelector('[aria-expanded]') ?? null)}
          onFilesDrop={(files) => actions.dropFiles(it, files)}
        />
        {index === 0 && (
          <span className="pointer-events-none absolute -top-6 left-1 z-20">
            <Pill tone="night" size="xs" icon={<Sparkles className="size-3" />}>
              {t('profile.portfolio.featured')}
            </Pill>
          </span>
        )}
        {/* toolbar */}
        <div className="absolute -top-3 right-0 z-20 flex items-center gap-1 sm:-right-1">
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t('profile.portfolio.dragHandle', { title: it.title })}
            title={t('profile.portfolio.drag')}
            className="glass flex size-8 cursor-grab touch-none items-center justify-center rounded-full text-ink-2 hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <ItemMenu it={it} actions={actions} />
        </div>
      </motion.div>
    </div>
  )
}

function ItemMenu({ it, actions, variant = 'glass' }: { it: PortfolioItem; actions: Actions; variant?: 'glass' | 'ghost' }) {
  const t = useT()
  return (
    <Menu
      width={210}
      trigger={({ onClick }) => (
        <IconButton label={t('core.action.more')} size="sm" variant={variant} onClick={onClick}>
          <MoreHorizontal className="size-4" />
        </IconButton>
      )}
      items={[
        { label: t('core.action.view'), icon: <Eye className="size-4" />, onClick: () => actions.open(it, null) },
        { label: t('core.action.edit'), icon: <Pencil className="size-4" />, onClick: () => actions.edit(it.id) },
        { label: t('profile.portfolio.feature'), icon: <ArrowUpToLine className="size-4" />, onClick: () => actions.moveToTop(it.id) },
        { label: t('profile.portfolio.duplicate'), icon: <Copy className="size-4" />, onClick: () => actions.duplicate(it) },
        { divider: true, label: '' },
        { label: t('core.action.delete'), icon: <Trash2 className="size-4" />, danger: true, onClick: () => actions.remove(it) },
      ]}
    />
  )
}

// ───────────────────────────── list (motion Reorder) ─────────────────────────────

function ListView({ items, actions, onReorder }: { items: PortfolioItem[]; actions: Actions; onReorder: (ids: string[]) => void }) {
  const [order, setOrder] = useState(items)
  const sig = items.map((p) => `${p.id}:${p.title}:${p.likes}:${p.media.length}`).join('|')
  useEffect(() => setOrder(items), [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    const ids = order.map((p) => p.id)
    if (ids.join('|') !== items.map((p) => p.id).join('|')) onReorder(ids)
  }
  return (
    <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
      {order.map((it, i) => (
        <ListRow key={it.id} it={it} index={i} actions={actions} onDrop={commit} />
      ))}
    </Reorder.Group>
  )
}

function ListRow({ it, index, actions, onDrop }: { it: PortfolioItem; index: number; actions: Actions; onDrop: () => void }) {
  const t = useT()
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={it}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0, transition: { delay: index * 0.035, duration: 0.35, ease: EASE_OUT } }}
      whileDrag={{ scale: 1.02, boxShadow: '0 22px 50px -22px rgba(0,0,0,.5)', zIndex: 5 }}
      className="relative has-[[role=menu]]:z-40"
    >
      <div className="flex items-center gap-2.5 rounded-[20px] bg-[var(--surface-2)]/70 p-2 pr-2.5 sm:gap-3.5">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label={t('profile.portfolio.drag')}
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-ink-3 hover:bg-[var(--surface-3)] active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="hidden w-5 shrink-0 font-mono text-[11px] text-ink-3 sm:block">{String(index + 1).padStart(2, '0')}</span>
        <button type="button" onClick={(e) => actions.open(it, e.currentTarget)} className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl sm:h-14 sm:w-20">
          <MediaView media={it.cover} playBadge={false} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium">{it.title}</span>
            {index === 0 && (
              <Pill tone="night" size="xs" className="hidden @xl:inline-flex">
                {t('profile.portfolio.featured')}
              </Pill>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 truncate text-[12px] text-ink-3">
            <span className="font-mono">{it.year}</span>
            {it.client && <span className="truncate">· {it.client}</span>}
            <span className="hidden font-mono sm:inline">· {it.media.length}×</span>
          </div>
        </div>
        <DisciplineBadge id={it.discipline} className="hidden @2xl:inline-flex" />
        <span className="hidden items-center gap-3 font-mono text-[11.5px] text-ink-3 @lg:flex">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3" />
            {it.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" />
            {it.views}
          </span>
        </span>
        <IconButton label={t('core.action.edit')} size="sm" variant="ghost" onClick={() => actions.edit(it.id)}>
          <Pencil className="size-4" />
        </IconButton>
        <ItemMenu it={it} actions={actions} variant="ghost" />
      </div>
    </Reorder.Item>
  )
}
