import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Range = [start: number, end: number]
export interface FuzzyResult {
  score: number
  ranges: Range[]
}

/** Lower-case + strip diacritics per UTF-16 unit, keeping indices aligned with the source. */
function fold(s: string) {
  let out = ''
  for (const ch of s.split('')) {
    const n = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    out += n.charAt(0) || ch
  }
  return out.replace(/ı/g, 'i')
}

const isBoundary = (t: string, i: number) => i === 0 || /[\s\-_/·.,:(]/.test(t[i - 1]!)

function merge(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const out: Range[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}

/**
 * Fuzzy-ish matcher used by the command palette and settings search.
 * Priority: whole substring (word starts win) → every word as a substring →
 * in-order subsequence (consecutive runs win). Returns null when nothing fits.
 */
export function fuzzy(query: string, text: string, opts?: { loose?: boolean }): FuzzyResult | null {
  const q = fold(query.trim())
  if (!q) return { score: 0, ranges: [] }
  const t = fold(text)

  const idx = t.indexOf(q)
  if (idx >= 0) {
    const score = 100 + (isBoundary(t, idx) ? 40 : 0) + (idx === 0 ? 20 : 0) - idx * 0.4 - (t.length - q.length) * 0.05
    return { score, ranges: [[idx, idx + q.length]] }
  }

  const words = q.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    const ranges: Range[] = []
    let ok = true
    for (const w of words) {
      const i = t.indexOf(w)
      if (i < 0) {
        ok = false
        break
      }
      ranges.push([i, i + w.length])
    }
    if (ok) return { score: 70 - (t.length - q.length) * 0.05, ranges: merge(ranges) }
  }

  if (opts?.loose === false) return null

  // subsequence
  const chars = q.replace(/\s+/g, '')
  const ranges: Range[] = []
  let pos = 0
  let runs = 0
  let boundaryHits = 0
  for (const c of chars) {
    // prefer the next word boundary that has this char, if it is close
    let found = -1
    for (let i = pos; i < t.length; i++) {
      if (t[i] === c) {
        found = i
        break
      }
    }
    if (found < 0) return null
    if (isBoundary(t, found)) boundaryHits++
    const last = ranges[ranges.length - 1]
    if (last && last[1] === found) last[1] = found + 1
    else {
      ranges.push([found, found + 1])
      runs++
    }
    pos = found + 1
  }
  const span = ranges[ranges.length - 1]![1] - ranges[0]![0]
  if (span > chars.length * 3 + 4) return null
  const score = 40 + boundaryHits * 6 - runs * 4 - span * 0.3
  return { score, ranges }
}

/** Renders `text` with matched ranges emphasised. */
export function Highlight({ text, ranges, className }: { text: string; ranges?: Range[]; className?: string }): ReactNode {
  if (!ranges?.length) return <span className={className}>{text}</span>
  const parts: ReactNode[] = []
  let cur = 0
  ranges.forEach(([a, b], i) => {
    if (a > cur) parts.push(text.slice(cur, a))
    parts.push(
      <mark key={i} className="rounded-[4px] bg-accent-soft px-px text-ink [box-shadow:inset_0_-2px_0_var(--accent)]">
        {text.slice(a, b)}
      </mark>,
    )
    cur = b
  })
  if (cur < text.length) parts.push(text.slice(cur))
  return <span className={cn(className)}>{parts}</span>
}
