import { createContext, useContext } from 'react'
import { Briefcase, Images, MessageCircle } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { MediaView } from '@/components/art/MediaView'
import { KIND_COLOR, KIND_ICON, extOf, isVisual, type FileItem } from './model'

/** Thumbnail: real preview for images/videos, a typed tile for everything else. */
export function FileThumb({ file, className, iconSize = 'md', hoverZoom }: { file: FileItem; className?: string; iconSize?: 'sm' | 'md' | 'lg'; hoverZoom?: boolean }) {
  if (isVisual(file))
    return (
      <div data-thumb className={cn('relative overflow-hidden bg-[var(--surface-3)]', className)}>
        <div className={cn('size-full', hoverZoom && 'transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] group-hover:scale-[1.07]')}>
          <MediaView media={file.media} playBadge={file.kind === 'video'} />
        </div>
      </div>
    )
  const Icon = KIND_ICON[file.kind] ?? KIND_ICON.other
  const color = KIND_COLOR[file.kind]
  const ext = extOf(file.name) || file.kind.toUpperCase()
  const sz = iconSize === 'sm' ? 'size-7 rounded-[9px] [&_svg]:size-3.5' : iconSize === 'lg' ? 'size-16 rounded-[20px] [&_svg]:size-7' : 'size-11 rounded-[14px] [&_svg]:size-5'
  return (
    <div
      data-thumb
      className={cn('relative flex items-center justify-center overflow-hidden', className)}
      style={{ background: `linear-gradient(150deg, color-mix(in oklab, ${color} 26%, var(--surface-2)), color-mix(in oklab, ${color} 8%, var(--surface-2)) 70%)` }}
    >
      {iconSize !== 'sm' && (
        <>
          <div aria-hidden className="absolute inset-0 dot-grid opacity-60" />
          <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl" style={{ background: color, opacity: 0.35 }} />
        </>
      )}
      <div className={cn('relative flex flex-col items-center', iconSize !== 'sm' && 'transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] group-hover:-translate-y-1 group-hover:scale-105')}>
        <span className={cn('flex items-center justify-center text-[#0b0b0c] shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_8px_20px_-8px_rgba(0,0,0,.35)]', sz)} style={{ background: color }}>
          <Icon />
        </span>
        {iconSize !== 'sm' && <span className="mt-2 rounded-full bg-[var(--surface)]/80 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2 backdrop-blur">{ext}</span>}
      </div>
    </div>
  )
}

/** "DT-2841" / "Chat · Maya" / "Portfolio" chip. */
export function SourceTag({ file, counterpart, className }: { file: FileItem; counterpart?: string; className?: string }) {
  const t = useT()
  const Icon = file.source === 'chat' ? MessageCircle : file.source === 'portfolio' ? Images : Briefcase
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3', className)}>
      <Icon className="size-3 shrink-0" />
      {file.source === 'chat' ? (
        <span className="truncate">{counterpart ?? t('files.source.chat')}</span>
      ) : file.source === 'portfolio' ? (
        <span className="truncate">{t('files.source.portfolio')}</span>
      ) : (
        <span className="truncate font-mono">
          {file.jobId}
          {file.source === 'delivery' && file.version ? ` · v${file.version}` : ''}
        </span>
      )}
    </span>
  )
}

export function KindTag({ file, className }: { file: FileItem; className?: string }) {
  const t = useT()
  const color = file.source === 'delivery' ? 'var(--accent)' : KIND_COLOR[file.kind]
  return (
    <span
      className={cn('inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] backdrop-blur-md', className)}
      style={{ background: `color-mix(in oklab, ${color} 85%, transparent)`, color: '#0b0b0c' }}
    >
      {file.source === 'delivery' ? t('files.kind.delivery') : t(`files.tag.${file.kind}`)}
    </span>
  )
}

// ─────────────────────────── context ───────────────────────────

export interface FileActions {
  preview: (f: FileItem) => void
  download: (files: FileItem[]) => void
  remove: (files: FileItem[]) => void
  rename: (f: FileItem) => void
  share: (f: FileItem) => void
  copyLink: (f: FileItem) => void
  openSource: (f: FileItem) => void
}

export interface FilesCtxValue {
  actions: FileActions
  selected: Set<string>
  toggle: (id: string, shift?: boolean) => void
  selecting: boolean
  personName: (id: string) => string
  personOf: (id: string) => import('@/features/calendar/ui').PersonInfo | undefined
  meId: string
}

export const FilesCtx = createContext<FilesCtxValue | null>(null)
export function useFilesCtx() {
  const v = useContext(FilesCtx)
  if (!v) throw new Error('FilesCtx missing')
  return v
}
