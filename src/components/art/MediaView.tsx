import { FileText, FileArchive, Link2, Music, Type, Video } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMediaUrl } from '@/lib/useMediaUrl'
import { mediaIsImage, mediaIsVideo } from '@/lib/files'
import type { MediaRef } from '@/store/types'
import { GenerativeArt } from './GenerativeArt'

/**
 * Renders any MediaRef: generated art, uploaded image/video (IndexedDB) or
 * external URL. Non-visual files fall back to a typed file tile.
 */
export function MediaView({
  media,
  className,
  controls = false,
  autoPlay = false,
  fit = 'cover',
  playBadge,
}: {
  media: MediaRef
  className?: string
  controls?: boolean
  autoPlay?: boolean
  fit?: 'cover' | 'contain'
  playBadge?: boolean
}) {
  const url = useMediaUrl(media)
  const objectFit = fit === 'cover' ? 'object-cover' : 'object-contain'

  if (media.kind === 'art') {
    return <GenerativeArt seed={media.seed} variant={media.variant} discipline={media.discipline} className={cn('block size-full', className)} playBadge={playBadge} />
  }
  if (mediaIsImage(media) && url) {
    return <img src={url} alt={media.kind === 'file' ? media.name : (media.name ?? '')} className={cn('block size-full', objectFit, className)} draggable={false} />
  }
  if (mediaIsVideo(media) && url) {
    return (
      <video
        src={url}
        className={cn('block size-full bg-black', objectFit, className)}
        controls={controls}
        autoPlay={autoPlay}
        muted={autoPlay}
        loop={autoPlay}
        playsInline
      />
    )
  }
  const name = media.kind === 'file' ? media.name : media.kind === 'url' ? (media.name ?? media.url) : ''
  const mime = media.kind === 'file' ? media.mime : (media.kind === 'url' && media.mime) || ''
  const Icon =
    media.kind === 'url' && !mime
      ? Link2
      : mime.startsWith('audio/')
        ? Music
        : mime.startsWith('video/')
          ? Video
          : /font/.test(mime) || /\.(ttf|otf|woff2?)$/i.test(name)
            ? Type
            : /zip|rar|7z/.test(mime) || /\.(zip|rar|7z)$/i.test(name)
              ? FileArchive
              : FileText
  return (
    <div className={cn('flex size-full flex-col items-center justify-center gap-2 bg-[var(--surface-2)] p-3 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <Icon className="size-5" />
      </span>
      <span className="line-clamp-2 max-w-full break-all text-[12px] font-medium text-ink-2">{name}</span>
    </div>
  )
}
