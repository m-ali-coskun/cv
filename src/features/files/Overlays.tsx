import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Download, Pencil, Send, Trash2, X } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { fmt, timeAgo } from '@/lib/dates'
import { formatBytes } from '@/lib/format'
import { spring } from '@/lib/motion'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Badge'
import { PersonAvatar } from '@/features/calendar/ui'
import type { FileItem } from './model'
import { FileThumb, KindTag, SourceTag, useFilesCtx } from './ui'

/** Floating liquid-glass bar for bulk actions on the selection. */
export function BulkBar({ files, onClear }: { files: FileItem[]; onClear: () => void }) {
  const t = useT()
  const { actions } = useFilesCtx()
  const removable = files.filter((f) => f.removable)
  const size = files.reduce((n, f) => n + f.size, 0)
  return createPortal(
    <AnimatePresence>
      {files.length > 0 && (
        <motion.div
          key="bulk"
          role="toolbar"
          aria-label={t('files.bulk.label')}
          className="glass-night fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-[640px] items-center gap-2 rounded-full p-1.5 pl-2 sm:bottom-6 sm:inset-x-6"
          initial={{ y: 90, opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ y: 70, opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          transition={spring.bouncy}
        >
          <button type="button" aria-label={t('files.bulk.clear')} onClick={onClear} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="size-4" />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <p className="flex items-baseline gap-1.5 text-[14px] font-medium text-white">
              <motion.span key={files.length} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring.bouncy} className="font-mono tabular-nums">
                {files.length}
              </motion.span>
              <span className="truncate">{t('files.bulk.selected')}</span>
            </p>
            <p className="font-mono text-[11px] text-white/50">{formatBytes(size)}</p>
          </div>
          <Button size="sm" variant="accent" icon={<Download className="size-4" />} onClick={() => actions.download(files)}>
            <span className="max-sm:hidden">{t('files.action.download')}</span>
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="size-4" />}
            disabled={!removable.length}
            title={removable.length ? undefined : t('files.bulk.noneRemovable')}
            onClick={() => actions.remove(removable)}
          >
            <span className="max-sm:hidden">{t('files.bulk.remove', { count: removable.length })}</span>
            <span className="font-mono sm:hidden">{removable.length}</span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function RenameModal({ file, onClose, onSave }: { file: FileItem | null; onClose: () => void; onSave: (f: FileItem, name: string) => void }) {
  const t = useT()
  return (
    <Modal open={!!file} onClose={onClose} title={t('files.rename.title')} size="sm">
      {file && <RenameForm key={file.id} file={file} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function RenameForm({ file, onClose, onSave }: { file: FileItem; onClose: () => void; onSave: (f: FileItem, name: string) => void }) {
  const t = useT()
  const [name, setName] = useState(file.name)
  const dot = file.name.lastIndexOf('.')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSave(file, name.trim())
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <FileThumb file={file} iconSize="sm" className="size-12 shrink-0 rounded-[14px]" />
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => dot > 0 && e.currentTarget.setSelectionRange(0, dot)}
          maxLength={120}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="glass" size="sm" onClick={onClose}>
          {t('files.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim() || name.trim() === file.name}>
          {t('files.rename.save')}
        </Button>
      </div>
    </form>
  )
}

/** Preview + metadata sheet for files without a visual preview (docs, fonts, archives, links). */
export function DetailsModal({ file, onClose }: { file: FileItem | null; onClose: () => void }) {
  return (
    <Modal open={!!file} onClose={onClose} bare size="md">
      {file && <Details file={file} onClose={onClose} />}
    </Modal>
  )
}

function Details({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const { actions, personOf, meId } = useFilesCtx()
  const by = personOf(file.addedBy)
  const rows: [string, React.ReactNode][] = [
    [t('files.col.kind'), <KindTag key="k" file={file} />],
    [t('files.col.size'), <span key="s" className="font-mono">{file.size ? formatBytes(file.size) : '—'}</span>],
    [t('files.col.source'), <SourceTag key="src" file={file} counterpart={file.source === 'chat' ? by?.name : undefined} className="text-[13px] text-ink" />],
    [
      t('files.col.by'),
      <span key="b" className="inline-flex items-center gap-2">
        {by && <PersonAvatar person={by} size={20} />}
        {file.addedBy === meId ? t('files.you') : (by?.name ?? '—')}
      </span>,
    ],
    [t('files.col.date'), <span key="d" className="font-mono">{`${fmt(file.addedAt, 'd MMM yyyy, HH:mm', lang)} · ${timeAgo(file.addedAt, lang)}`}</span>],
  ]
  if (file.job) rows.push([t('files.col.job'), <span key="j" className="inline-flex min-w-0 items-center gap-2"><span className="truncate">{file.job.title}</span><StatusBadge status={file.job.status} size="xs" /></span>])
  if (file.media.kind === 'url') rows.push([t('files.col.url'), <a key="u" href={file.media.url} target="_blank" rel="noreferrer" className="truncate text-accent-text underline-offset-2 hover:underline">{file.media.url}</a>])

  return (
    <div className="flex max-h-[92dvh] flex-col">
      <div className="relative">
        <FileThumb file={file} iconSize="lg" className="h-48 w-full sm:h-56" />
        <button type="button" aria-label={t('files.close')} onClick={onClose} className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/80 text-[#0b0b0c] shadow backdrop-blur hover:bg-white">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-5">
        <h2 className="break-all text-[20px] font-medium tracking-[-0.02em]">{file.name}</h2>
        {file.note && <p className="mt-1.5 text-[13.5px] text-ink-2">{file.note}</p>}
        <dl className="mt-4 divide-y divide-[var(--line)] rounded-2xl bg-[var(--surface-2)] px-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
              <dt className="shrink-0 text-ink-3">{k}</dt>
              <dd className="flex min-w-0 justify-end text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {file.media.kind === 'art' && <p className="mt-3 text-[12px] text-ink-3">{t('files.demoNote')}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4 safe-bottom">
        {file.removable && (
          <>
            <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => actions.remove([file])}>
              {t('files.action.remove')}
            </Button>
            <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} onClick={() => actions.rename(file)}>
              {t('files.action.rename')}
            </Button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {file.jobId && (
            <Button variant="glass" size="sm" icon={<Send className="size-4" />} onClick={() => actions.share(file)}>
              {t('files.action.share')}
            </Button>
          )}
          <Button variant="glass" size="sm" icon={<ArrowUpRight className="size-4" />} onClick={() => actions.openSource(file)}>
            {file.source === 'chat' ? t('files.action.openChat') : file.source === 'portfolio' ? t('files.action.openPortfolio') : t('files.action.openJob')}
          </Button>
          <Button size="sm" icon={<Download className="size-4" />} onClick={() => actions.download([file])}>
            {file.media.kind === 'url' ? t('files.action.openLink') : t('files.action.download')}
          </Button>
        </div>
      </div>
    </div>
  )
}
