import { memo, useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import * as notionists from '@dicebear/notionists'
import * as shapes from '@dicebear/shapes'
import { cn } from '@/lib/cn'
import { hashString } from '@/lib/random'
import { useMediaUrl } from '@/lib/useMediaUrl'
import type { MediaRef } from '@/store/types'

const BG = ['ffd6a5', 'caffbf', '9bf6ff', 'bdb2ff', 'ffc6ff', 'fdffb6', 'a0c4ff', 'ffadad', 'd0f4de', 'e4c1f9']

const cache = new Map<string, string>()
function avatarUri(seed: string, style: 'person' | 'brand') {
  const key = `${style}:${seed}`
  const hit = cache.get(key)
  if (hit) return hit
  const bg = BG[hashString(seed) % BG.length]
  const uri =
    style === 'person'
      ? createAvatar(notionists, { seed, backgroundColor: [bg], scale: 110 }).toDataUri()
      : createAvatar(shapes, { seed, backgroundColor: [bg] }).toDataUri()
  cache.set(key, uri)
  return uri
}

export interface AvatarProps {
  seed: string
  /** Uploaded photo takes precedence over the generated illustration. */
  media?: MediaRef
  size?: number
  kind?: 'person' | 'brand'
  /** Brand avatars show a coloured monogram tile. */
  name?: string
  color?: string
  ring?: boolean
  status?: 'online' | 'away' | 'offline'
  className?: string
}

export const Avatar = memo(function Avatar({ seed, media, size = 36, kind = 'person', name, color, ring, status, className }: AvatarProps) {
  const uploaded = useMediaUrl(media?.kind === 'art' ? undefined : media)
  const src = useMemo(() => (kind === 'person' ? avatarUri(seed, 'person') : avatarUri(seed, 'brand')), [seed, kind])
  const radius = kind === 'brand' ? size * 0.3 : size
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {kind === 'brand' && name && !uploaded ? (
        <span
          className="flex size-full items-center justify-center font-semibold text-white"
          style={{
            borderRadius: radius,
            background: `linear-gradient(135deg, ${color ?? '#333'}, color-mix(in oklab, ${color ?? '#333'} 60%, #000))`,
            fontSize: size * 0.4,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
          }}
          aria-label={name}
        >
          {name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </span>
      ) : (
        <img
          src={uploaded ?? src}
          alt=""
          draggable={false}
          className={cn('size-full object-cover', ring && 'ring-2 ring-[var(--surface)]')}
          style={{ borderRadius: radius }}
        />
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-[var(--surface)]',
            status === 'online' ? 'bg-success' : status === 'away' ? 'bg-warning' : 'bg-ink-4',
          )}
          style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }}
        />
      )}
    </span>
  )
})

export function AvatarStack({ seeds, size = 28, max = 4 }: { seeds: string[]; size?: number; max?: number }) {
  const shown = seeds.slice(0, max)
  const extra = seeds.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((s, i) => (
        <span key={s + i} className="rounded-full ring-2 ring-[var(--surface)]" style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: shown.length - i }}>
          <Avatar seed={s} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="flex items-center justify-center rounded-full bg-[var(--surface-3)] text-[11px] font-medium text-ink-2 ring-2 ring-[var(--surface)]"
          style={{ width: size, height: size, marginLeft: -size * 0.32 }}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
