import { clear, createStore, del, get, set } from 'idb-keyval'
import { uid } from './ids'
import type { Asset, AssetKind, MediaRef } from '@/store/types'

/**
 * User uploads live in IndexedDB (localStorage is far too small for images
 * and videos). Records in the zustand store only keep a `MediaRef` pointing
 * at the blob id. Object URLs are cached per session.
 */
const store = typeof indexedDB !== 'undefined' ? createStore('designtab-files', 'blobs') : undefined
const urlCache = new Map<string, string>()

export async function saveFile(file: File | Blob, name?: string): Promise<MediaRef> {
  const fileId = uid('f_')
  if (store) await set(fileId, file, store)
  urlCache.set(fileId, URL.createObjectURL(file))
  return {
    kind: 'file',
    fileId,
    mime: file.type || 'application/octet-stream',
    name: name ?? (file instanceof File ? file.name : 'file'),
    size: file.size,
  }
}

export async function loadFileUrl(fileId: string): Promise<string | undefined> {
  const cached = urlCache.get(fileId)
  if (cached) return cached
  if (!store) return undefined
  const blob = await get<Blob>(fileId, store)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  urlCache.set(fileId, url)
  return url
}

export async function deleteFile(fileId: string) {
  const url = urlCache.get(fileId)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(fileId)
  if (store) await del(fileId, store)
}

export async function clearFiles() {
  urlCache.forEach((u) => URL.revokeObjectURL(u))
  urlCache.clear()
  if (store) await clear(store)
}

export function kindFromMime(mime: string, name = ''): AssetKind {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (/font|woff|ttf|otf/.test(mime) || /\.(ttf|otf|woff2?)$/i.test(name)) return 'font'
  if (/zip|rar|7z|tar/.test(mime) || /\.(zip|rar|7z)$/i.test(name)) return 'archive'
  return 'doc'
}

/** Persist a dropped/selected file and wrap it as an Asset. */
export async function fileToAsset(file: File, addedBy: string, note?: string): Promise<Asset> {
  const media = await saveFile(file)
  return {
    id: uid('a_'),
    name: file.name,
    kind: kindFromMime(file.type, file.name),
    size: file.size,
    media,
    addedBy,
    addedAt: new Date().toISOString(),
    note,
  }
}

export function linkAsset(url: string, addedBy: string, label?: string): Asset {
  let name = label
  if (!name) {
    try {
      name = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      name = url
    }
  }
  return {
    id: uid('a_'),
    name,
    kind: 'link',
    size: 0,
    media: { kind: 'url', url, name },
    addedBy,
    addedAt: new Date().toISOString(),
  }
}

export function mediaIsImage(m: MediaRef) {
  if (m.kind === 'art') return true
  if (m.kind === 'file') return m.mime.startsWith('image/')
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(m.url) || m.mime?.startsWith('image/') === true
}

export function mediaIsVideo(m: MediaRef) {
  if (m.kind === 'art') return m.variant === 'video'
  if (m.kind === 'file') return m.mime.startsWith('video/')
  return /\.(mp4|webm|mov)(\?|$)/i.test(m.url) || m.mime?.startsWith('video/') === true
}
