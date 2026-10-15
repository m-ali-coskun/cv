import { motion } from 'motion/react'
import { ArrowDownUp, ArrowUpRight, Check, Copy, Download, Maximize2, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatDistanceToNowStrict } from 'date-fns'
import { DATE_LOCALES, shortDate, timeAgo } from '@/lib/dates'
import type { Lang } from '@/store/types'
import { formatBytes } from '@/lib/format'
import { spring } from '@/lib/motion'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { PersonAvatar } from '@/features/calendar/ui'
import type { FileItem, SortKey } from './model'
import { FileThumb, KindTag, SourceTag, useFilesCtx } from './ui'

/** "5 hours" / "5 Stunden" / "5 saat" — relative age without the suffix (fits tiny cards). */
const shortAgo = (iso: string, lang: Lang) => formatDistanceToNowStrict(new Date(iso), { locale: DATE_LOCALES[lang] })

export function useFileMenu(f: FileItem): MenuItem[] {
  const t = useT()
  const { actions } = useFilesCtx()
  const items: MenuItem[] = [
    { label: t('files.action.preview'), icon: <Maximize2 />, onClick: () => actions.preview(f) },
    { label: f.media.kind === 'url' ? t('files.action.openLink') : t('files.action.download'), icon: <Download />, onClick: () => actions.download([f]) },
  ]
  if (f.media.kind === 'url') items.push({ label: t('files.action.copyLink'), icon: <Copy />, onClick: () => actions.copyLink(f) })
  items.push({
    label: f.source === 'chat' ? t('files.action.openChat') : f.source === 'portfolio' ? t('files.action.openPortfolio') : t('files.action.openJob'),
    icon: <ArrowUpRight />,
    onClick: () => actions.openSource(f),
  })
  if (f.jobId) items.push({ label: t('files.action.share'), icon: <Send />, onClick: () => actions.share(f) })
  if (f.removable) {
    items.push({ divider: true, label: '' })
    items.push({ label: t('files.action.rename'), icon: <Pencil />, onClick: () => actions.rename(f) })
    items.push({ label: t('files.action.remove'), icon: <Trash2 />, danger: true, onClick: () => actions.remove([f]) })
  }
  return items
}

function Check3({ checked, onToggle, className, label }: { checked: boolean; onToggle: (shift: boolean) => void; className?: string; label: string }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(e.shiftKey)
      }}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-[8px] border-[1.5px] backdrop-blur-md transition-colors',
        checked ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-white/80 bg-black/15 text-transparent hover:bg-black/25',
        className,
      )}
    >
      <motion.span initial={false} animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }} transition={spring.bouncy}>
        <Check className="size-3.5" strokeWidth={3} />
      </motion.span>
    </motion.button>
  )
}

export function FileCard({ file, index }: { file: FileItem; index: number }) {
  const t = useT()
  const lang = useLang()
  const { actions, selected, toggle, selecting, personOf, meId } = useFilesCtx()
  const menu = useFileMenu(file)
  const isSel = selected.has(file.id)
  const by = personOf(file.addedBy)
  return (
    <motion.div
      layout
      data-file-id={file.id}
      initial={{ opacity: 0, y: 18, scale: 0.94, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)', transition: { duration: 0.18 } }}
      transition={{ ...spring.smooth, delay: Math.min(index, 14) * 0.025 }}
      className="group relative hover:z-20 focus-within:z-20"
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={spring.snappy}
        className={cn(
          'relative rounded-[22px] bg-[var(--surface-2)] p-1.5 transition-shadow duration-300 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,.35)]',
          isSel && 'bg-accent-soft shadow-[0_0_0_2px_var(--accent)]',
        )}
      >
        <div className="relative">
          <button
            type="button"
            onClick={(e) => (selecting ? toggle(file.id, e.shiftKey) : actions.preview(file))}
            className="relative block w-full overflow-hidden rounded-[17px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
            aria-label={t('files.action.previewName', { name: file.name })}
          >
            <FileThumb file={file} className="aspect-[4/3] w-full" hoverZoom />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="pointer-events-none absolute bottom-2.5 left-2.5 font-mono text-[10.5px] font-medium text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
              {formatBytes(file.size)}
            </span>
          </button>
          <KindTag file={file} className="pointer-events-none absolute right-1.5 top-1.5" />
          <Check3
            checked={isSel}
            onToggle={(shift) => toggle(file.id, shift)}
            label={t('files.select')}
            className={cn('absolute left-1.5 top-1.5 transition-opacity', isSel || selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 max-md:opacity-100')}
          />
          <button
            type="button"
            aria-label={file.media.kind === 'url' ? t('files.action.openLink') : t('files.action.download')}
            title={file.media.kind === 'url' ? t('files.action.openLink') : t('files.action.download')}
            onClick={() => actions.download([file])}
            className="absolute bottom-1.5 right-1.5 flex size-8 translate-y-2 items-center justify-center rounded-full bg-white/85 text-[#0b0b0c] opacity-0 shadow-lg backdrop-blur transition-all duration-300 hover:scale-110 active:scale-90 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden"
          >
            {file.media.kind === 'url' ? <ArrowUpRight className="size-3.5" /> : <Download className="size-3.5" />}
          </button>
        </div>

        <div className="flex items-start gap-2 px-1.5 pb-1 pt-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium tracking-[-0.01em]" title={file.name}>
              {file.name}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              {by && <PersonAvatar person={by} size={16} />}
              <SourceTag file={file} counterpart={file.source === 'chat' ? (file.addedBy === meId ? t('files.you') : by?.name) : undefined} />
              <span className="ml-auto shrink-0 font-mono text-[10.5px] text-ink-3 max-sm:hidden">{shortAgo(file.addedAt, lang)}</span>
            </div>
          </div>
          <Menu
            items={menu}
            width={220}
            trigger={({ onClick, open }) => (
              <button
                type="button"
                aria-label={t('files.more')}
                onClick={onClick}
                className={cn('-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface-3)] hover:text-ink', open && 'bg-[var(--surface-3)] text-ink')}
              >
                <MoreHorizontal className="size-4" />
              </button>
            )}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ListHeader({ sort, dir, onSort, allChecked, someChecked, onToggleAll }: { sort: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void; allChecked: boolean; someChecked: boolean; onToggleAll: () => void }) {
  const t = useT()
  const H = ({ k, children, className }: { k?: SortKey; children: React.ReactNode; className?: string }) =>
    k ? (
      <button type="button" onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 text-left uppercase tracking-[0.08em] transition-colors hover:text-ink', sort === k && 'text-ink', className)}>
        {children}
        {sort === k && <ArrowDownUp className={cn('size-3 transition-transform', dir === 'asc' && 'rotate-180')} />}
      </button>
    ) : (
      <span className={className}>{children}</span>
    )
  return (
    <div className="hidden items-center gap-3 border-b border-line px-3 pb-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 md:grid md:grid-cols-[24px_44px_minmax(0,1fr)_96px_130px_150px_88px_72px_32px]">
      <button
        type="button"
        role="checkbox"
        aria-checked={allChecked ? 'true' : someChecked ? 'mixed' : 'false'}
        aria-label={t('files.selectAll')}
        onClick={onToggleAll}
        className={cn(
          'flex size-5 items-center justify-center rounded-[6px] border-[1.5px] transition-colors',
          allChecked || someChecked ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-line-2',
        )}
      >
        {allChecked ? <Check className="size-3" strokeWidth={3} /> : someChecked ? <span className="h-0.5 w-2 rounded bg-current" /> : null}
      </button>
      <span />
      <H k="name">{t('files.col.name')}</H>
      <H>{t('files.col.kind')}</H>
      <H>{t('files.col.source')}</H>
      <H>{t('files.col.by')}</H>
      <H k="recent">{t('files.col.date')}</H>
      <H k="size" className="justify-self-end">
        {t('files.col.size')}
      </H>
      <span />
    </div>
  )
}

export function FileRow({ file, index }: { file: FileItem; index: number }) {
  const t = useT()
  const lang = useLang()
  const { actions, selected, toggle, selecting, personOf, meId } = useFilesCtx()
  const menu = useFileMenu(file)
  const isSel = selected.has(file.id)
  const by = personOf(file.addedBy)
  const byName = file.addedBy === meId ? t('files.you') : (by?.name ?? '—')
  return (
    <motion.div
      layout="position"
      data-file-id={file.id}
      initial={{ opacity: 0, x: -12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
      transition={{ ...spring.smooth, delay: Math.min(index, 18) * 0.018 }}
      className={cn(
        'group relative grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_32px] items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:z-20 hover:bg-[var(--surface-2)] focus-within:z-20 md:grid-cols-[24px_44px_minmax(0,1fr)_96px_130px_150px_88px_72px_32px] md:px-3',
        isSel && 'bg-accent-soft hover:bg-accent-soft',
      )}
      onClick={(e) => (selecting ? toggle(file.id, e.shiftKey) : actions.preview(file))}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isSel}
        aria-label={t('files.select')}
        onClick={(e) => {
          e.stopPropagation()
          toggle(file.id, e.shiftKey)
        }}
        className={cn(
          'hidden size-5 items-center justify-center rounded-[6px] border-[1.5px] transition-colors md:flex',
          isSel ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-line-2 group-hover:border-[var(--ink-4)]',
        )}
      >
        {isSel && <Check className="size-3" strokeWidth={3} />}
      </button>
      <div className="relative">
        <FileThumb file={file} iconSize="sm" className="size-11 rounded-[12px]" />
        {isSel && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-ink text-[var(--surface)] md:hidden dark:bg-accent dark:text-accent-ink">
            <Check className="size-2.5" strokeWidth={3} />
          </motion.span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium tracking-[-0.01em]">{file.name}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-3 md:hidden">
          <span className="font-mono">{formatBytes(file.size)}</span>·
          <SourceTag file={file} counterpart={file.source === 'chat' ? byName : undefined} />·
          <span className="shrink-0">{shortAgo(file.addedAt, lang)}</span>
        </p>
        {file.note && <p className="mt-0.5 hidden truncate text-[11.5px] text-ink-3 md:block">{file.note}</p>}
      </div>
      <div className="hidden md:block">
        <KindTag file={file} />
      </div>
      <SourceTag file={file} counterpart={file.source === 'chat' ? byName : undefined} className="hidden md:inline-flex" />
      <span className="hidden min-w-0 items-center gap-2 md:flex">
        {by && <PersonAvatar person={by} size={22} />}
        <span className="truncate text-[12.5px] text-ink-2">{byName}</span>
      </span>
      <span className="hidden font-mono text-[11.5px] text-ink-3 md:block" title={timeAgo(file.addedAt, lang)}>
        {shortDate(file.addedAt, lang)}
      </span>
      <span className="hidden text-right font-mono text-[12px] text-ink-2 md:block">{formatBytes(file.size)}</span>
      <div onClick={(e) => e.stopPropagation()}>
        <Menu
          items={menu}
          width={220}
          trigger={({ onClick, open }) => (
            <button
              type="button"
              aria-label={t('files.more')}
              onClick={onClick}
              className={cn('flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface-3)] hover:text-ink', open && 'bg-[var(--surface-3)] text-ink')}
            >
              <MoreHorizontal className="size-4" />
            </button>
          )}
        />
      </div>
    </motion.div>
  )
}
