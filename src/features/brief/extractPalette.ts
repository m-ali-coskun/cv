/**
 * Real colour extraction: the image is drawn to a small canvas, its pixels
 * are clustered with k-means (k-means++ seeding, deterministic) and the
 * cluster centres are returned as hex colours sorted by coverage.
 */
export interface ExtractedColor {
  hex: string
  /** Share of the image (0..1). */
  share: number
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = src
  })
}

/** Samples up to ~12k opaque pixels from the image. */
async function samplePixels(src: string): Promise<number[][]> {
  const img = await loadImage(src)
  const max = 120
  const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  const px: number[][] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    px.push([data[i], data[i + 1], data[i + 2]])
  }
  return px
}

const dist2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

export function kmeans(px: number[][], k: number, iterations = 10): ExtractedColor[] {
  if (!px.length) return []
  k = Math.min(k, px.length)
  // k-means++ seeding with a deterministic pseudo-random sequence
  let seed = 1337
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const centres: number[][] = [px[Math.floor(rand() * px.length)].slice()]
  const d = new Float64Array(px.length)
  while (centres.length < k) {
    let sum = 0
    for (let i = 0; i < px.length; i++) {
      let best = Infinity
      for (const c of centres) best = Math.min(best, dist2(px[i], c))
      d[i] = best
      sum += best
    }
    if (sum === 0) break
    let target = rand() * sum
    let idx = 0
    for (; idx < px.length - 1; idx++) {
      target -= d[idx]
      if (target <= 0) break
    }
    centres.push(px[idx].slice())
  }
  const assign = new Int32Array(px.length)
  for (let it = 0; it < iterations; it++) {
    const sums = centres.map(() => [0, 0, 0, 0])
    for (let i = 0; i < px.length; i++) {
      let best = 0
      let bd = Infinity
      for (let c = 0; c < centres.length; c++) {
        const dd = dist2(px[i], centres[c])
        if (dd < bd) {
          bd = dd
          best = c
        }
      }
      assign[i] = best
      const s = sums[best]
      s[0] += px[i][0]
      s[1] += px[i][1]
      s[2] += px[i][2]
      s[3]++
    }
    let moved = false
    centres.forEach((c, i) => {
      const s = sums[i]
      if (!s[3]) return
      const n = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
      if (dist2(n, c) > 1) moved = true
      centres[i] = n
    })
    if (!moved) break
  }
  const counts = centres.map(() => 0)
  for (let i = 0; i < px.length; i++) counts[assign[i]]++
  const out = centres
    .map((c, i) => ({ hex: toHex(c[0], c[1], c[2]), share: counts[i] / px.length }))
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share)
  // merge near-duplicates (can happen on flat images)
  const merged: ExtractedColor[] = []
  for (const c of out) {
    const rgb = hexToRgb(c.hex)
    const twin = merged.find((m) => dist2(hexToRgb(m.hex), rgb) < 18 * 18)
    if (twin) twin.share += c.share
    else merged.push({ ...c })
  }
  return merged
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Extracts `k` dominant colours from an image URL (object URL / data URL). */
export async function extractPalette(src: string, k = 5): Promise<ExtractedColor[]> {
  const px = await samplePixels(src)
  // subsample very large inputs for speed
  const step = Math.max(1, Math.floor(px.length / 12000))
  const sample = step > 1 ? px.filter((_, i) => i % step === 0) : px
  // ask for a couple of extra clusters, then keep the k most prominent distinct ones
  return kmeans(sample, k + 2).slice(0, k)
}
