import type { Lang } from '@/store/types'

const LOCALE: Record<Lang, string> = { en: 'en-US', de: 'de-DE', tr: 'tr-TR' }

export function localeOf(lang: Lang) {
  return LOCALE[lang]
}

export function formatMoney(amount: number, currency: 'EUR' | 'USD' = 'EUR', lang: Lang = 'en', compact = false) {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'currency',
    currency,
    maximumFractionDigits: compact || amount >= 1000 ? 0 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(amount)
}

export function formatNumber(n: number, lang: Lang = 'en', opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(LOCALE[lang], opts).format(n)
}

export function formatBytes(bytes: number) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
