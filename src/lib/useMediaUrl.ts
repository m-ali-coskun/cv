import { useEffect, useState } from 'react'
import { loadFileUrl } from './files'
import type { MediaRef } from '@/store/types'

/** Resolves a MediaRef to a URL usable in <img>/<video>. Art refs return undefined (render <GenerativeArt/>). */
export function useMediaUrl(media: MediaRef | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(media?.kind === 'url' ? media.url : undefined)
  useEffect(() => {
    let alive = true
    if (!media || media.kind === 'art') setUrl(undefined)
    else if (media.kind === 'url') setUrl(media.url)
    else loadFileUrl(media.fileId).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [media])
  return url
}
