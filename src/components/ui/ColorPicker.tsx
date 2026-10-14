import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Pipette, Plus, Shuffle, Wand2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang } from '@/i18n'
import { toast } from '@/store/toasts'
import type { Lang } from '@/store/types'

const STR: Record<Lang, Record<string, string>> = {
  en: {
    copied: 'Copied',
    copy: 'Click to copy',
    remove: 'Remove colour',
    edit: 'Edit colour',
    add: 'Add colour',
    addHex: 'Add',
    invalid: 'Use a hex code like #FF6B3D',
    duplicate: 'Already in the palette',
    full: 'Palette is full',
    presets: 'Presets',
    harmony: 'Generate from first colour',
    analogous: 'Analogous',
    complementary: 'Complementary',
    triadic: 'Triadic',
    mono: 'Monochrome',
    random: 'Surprise me',
    empty: 'No colours yet — add one or pick a preset.',
    drag: 'Drag to reorder',
  },
  de: {
    copied: 'Kopiert',
    copy: 'Zum Kopieren klicken',
    remove: 'Farbe entfernen',
    edit: 'Farbe bearbeiten',
    add: 'Farbe hinzufügen',
    addHex: 'Hinzufügen',
    invalid: 'Hex-Code wie #FF6B3D verwenden',
    duplicate: 'Schon in der Palette',
    full: 'Palette ist voll',
    presets: 'Vorlagen',
    harmony: 'Aus erster Farbe erzeugen',
    analogous: 'Analog',
    complementary: 'Komplementär',
    triadic: 'Triadisch',
    mono: 'Monochrom',
    random: 'Überrasch mich',
    empty: 'Noch keine Farben — füge eine hinzu oder wähle eine Vorlage.',
    drag: 'Zum Sortieren ziehen',
  },
  tr: {
    copied: 'Kopyalandı',
    copy: 'Kopyalamak için tıkla',
    remove: 'Rengi kaldır',
    edit: 'Rengi düzenle',
    add: 'Renk ekle',
    addHex: 'Ekle',
    invalid: '#FF6B3D gibi bir hex kodu girin',
    duplicate: 'Zaten paletde var',
    full: 'Palet dolu',
    presets: 'Hazır paletler',
    harmony: 'İlk renkten üret',
    analogous: 'Analog',
    complementary: 'Tamamlayıcı',
    triadic: 'Üçlü',
    mono: 'Monokrom',
    random: 'Sürpriz yap',
    empty: 'Henüz renk yok — bir renk ekle ya da hazır palet seç.',
    drag: 'Sıralamak için sürükle',
  },
}

export interface PalettePreset {
  name: string
  colors: string[]
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { name: 'Lime studio', colors: ['#C9F158', '#0B0B0C', '#F3F3F5', '#8B8B93', '#A7F3D0'] },
  { name: 'Ocean', colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'] },
  { name: 'Sunset', colors: ['#FF6B3D', '#FFD23F', '#F72585', '#7209B7', '#1A1A2E'] },
  { name: 'Earth', colors: ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'] },
  { name: 'Candy', colors: ['#FFCDB2', '#FFB4A2', '#E5989B', '#B5838D', '#6D6875'] },
  { name: 'Mono', colors: ['#0B0B0C', '#3A3A40', '#8B8B93', '#D9D9DE', '#FFFFFF'] },
]

// ─────────────── colour math ───────────────

export function normalizeHex(input: string): string | null {
  let h = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  return `#${h.toUpperCase()}`
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

/** Relative luminance (WCAG). */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Black or white — whichever reads better on `hex`. */
export const readableOn = (hex: string) => (luminance(hex) > 0.45 ? '#0B0B0C' : '#FFFFFF')

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

type Harmony = 'analogous' | 'complementary' | 'triadic' | 'mono' | 'random'

export function harmonize(base: string, mode: Harmony, count = 5): string[] {
  const [h, s, l] = hexToHsl(base)
  let out: string[]
  switch (mode) {
    case 'analogous':
      out = [-40, -20, 0, 20, 40].map((d) => hslToHex(h + d, s, l))
      break
    case 'complementary':
      out = [hslToHex(h, s, l), hslToHex(h, s, Math.min(92, l + 28)), hslToHex(h + 180, s, l), hslToHex(h + 180, s * 0.7, Math.max(12, l - 26)), hslToHex(h, s * 0.2, 10)]
      break
    case 'triadic':
      out = [hslToHex(h, s, l), hslToHex(h + 120, s, l), hslToHex(h + 240, s, l), hslToHex(h, s * 0.3, 94), hslToHex(h, s * 0.4, 12)]
      break
    case 'mono':
      out = [14, 30, 48, 68, 88].map((L) => hslToHex(h, s, L))
      break
    default: {
      const hh = Math.random() * 360
      out = [0, 30, 160, 200, 340].map((d, i) => hslToHex(hh + d, 55 + Math.random() * 35, [55, 70, 40, 85, 18][i]))
    }
  }
  return Array.from(new Set(out)).slice(0, count)
}

// ─────────────── component ───────────────

export interface ColorPickerProps {
  value: string[]
  onChange: (next: string[]) => void
  /** Maximum number of colours (default 8). */
  max?: number
  presets?: PalettePreset[] | false
  /** Show the harmony generator. Default true. */
  generator?: boolean
  className?: string
}

/**
 * Palette editor for briefs/style guides.
 *  – click a swatch to copy its hex (toast), pencil to edit, × to remove
 *  – drag (mouse, touch long-press or keyboard) to reorder
 *  – add with the native colour picker or by typing a hex code
 *  – preset palettes and a harmony generator seeded from the first colour
 */
export function ColorPicker({ value, onChange, max = 8, presets = PALETTE_PRESETS, generator = true, className }: ColorPickerProps) {
  const lang = useLang()
  const s = STR[lang]
  const [hex, setHex] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState<string | null>(null)
  const addInput = useRef<HTMLInputElement>(null)
  const full = value.length >= max

  const items = useMemo(() => {
    const seen = new Map<string, number>()
    return value.map((c) => {
      const n = normalizeHex(c) ?? c
      const k = seen.get(n) ?? 0
      seen.set(n, k + 1)
      return { id: k ? `${n}~${k}` : n, color: n }
    })
  }, [value])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const add = (raw: string) => {
    const n = normalizeHex(raw)
    if (!n) {
      setError(s.invalid)
      return false
    }
    if (full) {
      setError(s.full)
      return false
    }
    if (value.some((c) => normalizeHex(c) === n)) {
      setShake(n)
      setTimeout(() => setShake(null), 500)
      setError(s.duplicate)
      return false
    }
    setError(null)
    onChange([...value, n])
    return true
  }

  // native <input type=color> fires `change` once the picker closes
  useEffect(() => {
    const el = addInput.current
    if (!el) return
    const h = () => add(el.value)
    el.addEventListener('change', h)
    return () => el.removeEventListener('change', h)
  })

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    onChange(arrayMove(value, from, to))
  }

  const copy = async (c: string) => {
    try {
      await navigator.clipboard?.writeText(c)
    } catch {
      /* clipboard may be blocked — still confirm visually */
    }
    toast({ title: s.copied, description: c, tone: 'success', duration: 1800 })
  }

  const onHexKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (add(hex)) setHex('')
    }
  }
  const hexPreview = normalizeHex(hex)

  return (
    <div className={cn('w-full', className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-2.5">
            <AnimatePresence initial={false}>
              {items.map((it, i) => (
                <Swatch
                  key={it.id}
                  id={it.id}
                  color={it.color}
                  shake={shake === it.color}
                  s={s}
                  onCopy={() => copy(it.color)}
                  onRemove={() => onChange(value.filter((_, j) => j !== i))}
                  onEdit={(c) => {
                    const n = normalizeHex(c)
                    if (n) onChange(value.map((v, j) => (j === i ? n : v)))
                  }}
                />
              ))}
            </AnimatePresence>
            {!full && (
              <motion.label
                layout
                whileHover={{ scale: 1.05, rotate: 3 }}
                whileTap={{ scale: 0.92 }}
                className="relative flex size-14 cursor-pointer items-center justify-center rounded-[18px] border-2 border-dashed border-line-2 text-ink-3 transition-colors hover:border-[var(--accent)] hover:text-ink"
                title={s.add}
              >
                <Plus className="size-5" />
                <input ref={addInput} type="color" aria-label={s.add} className="absolute inset-0 cursor-pointer opacity-0" defaultValue="#7c5cff" />
              </motion.label>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {items.length === 0 && <p className="mt-2 text-[12.5px] text-ink-3">{s.empty}</p>}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <div className="relative min-w-0 flex-1 basis-[180px]">
          <span
            className="pointer-events-none absolute left-2 top-1/2 size-6 -translate-y-1/2 rounded-lg border border-line transition-colors"
            style={{ background: hexPreview ?? 'repeating-conic-gradient(var(--surface-3) 0 25%, var(--surface) 0 50%) 0 0 / 8px 8px' }}
          />
          <input
            value={hex}
            onChange={(e) => {
              setHex(e.target.value)
              setError(null)
            }}
            onKeyDown={onHexKey}
            disabled={full}
            placeholder="#FF6B3D"
            aria-label={s.add}
            aria-invalid={!!error}
            maxLength={7}
            className={cn(
              'h-10 w-full rounded-2xl border bg-[var(--surface)]/70 pl-10 pr-3 font-mono text-[13px] uppercase text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-4 focus:shadow-[0_0_0_4px_var(--accent-softer)] disabled:opacity-50',
              error ? 'border-danger' : 'border-line focus:border-[var(--accent-line)]',
            )}
          />
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          disabled={full || !hex}
          onClick={() => add(hex) && setHex('')}
          className="h-10 shrink-0 rounded-full bg-ink px-4 text-[13px] font-medium text-[var(--surface)] disabled:opacity-40 dark:bg-accent dark:text-accent-ink"
        >
          {s.addHex}
        </motion.button>
        <span className="flex h-10 items-center font-mono text-[11.5px] text-ink-3">
          {value.length}/{max}
        </span>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 text-[12px] text-danger">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {generator && value.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            <Wand2 className="size-3.5" /> {s.harmony}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(['analogous', 'complementary', 'triadic', 'mono', 'random'] as Harmony[]).map((m) => (
              <motion.button
                key={m}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onChange(harmonize(normalizeHex(value[0]) ?? '#C9F158', m, Math.min(5, max)))}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-[var(--surface-3)] hover:text-ink"
              >
                {m === 'random' && <Shuffle className="size-3.5" />}
                {s[m]}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {presets && presets.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-medium text-ink-3">{s.presets}</p>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {presets.map((p) => {
              const active = p.colors.length === value.length && p.colors.every((c, i) => normalizeHex(c) === normalizeHex(value[i] ?? ''))
              return (
                <motion.button
                  key={p.name}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onChange(p.colors.slice(0, max))}
                  className={cn(
                    'group flex shrink-0 items-center gap-2 rounded-2xl border p-1.5 pr-3 text-[12.5px] font-medium transition-colors',
                    active ? 'border-[var(--ink)] bg-[var(--surface)]' : 'border-line hover:border-line-2',
                  )}
                >
                  <span className="flex overflow-hidden rounded-[10px]">
                    {p.colors.map((c) => (
                      <span key={c} className="h-6 w-3.5 transition-[width] duration-300 group-hover:w-5" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="text-ink-2">{p.name}</span>
                  {active && <Check className="size-3.5 text-ink" />}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Swatch({
  id,
  color,
  shake,
  s,
  onCopy,
  onRemove,
  onEdit,
}: {
  id: string
  color: string
  shake: boolean
  s: Record<string, string>
  onCopy: () => void
  onRemove: () => void
  onEdit: (c: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [copied, setCopied] = useState(false)
  const ink = readableOn(color)
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className="relative"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
        animate={{ opacity: 1, scale: isDragging ? 1.12 : 1, rotate: 0, x: shake ? [0, -6, 6, -4, 4, 0] : 0 }}
        exit={{ opacity: 0, scale: 0.4, rotate: 10, transition: { duration: 0.18 } }}
        transition={{ type: 'spring', stiffness: 460, damping: 22 }}
        className="group/sw flex flex-col items-center gap-1"
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={() => {
            onCopy()
            setCopied(true)
            setTimeout(() => setCopied(false), 1100)
          }}
          aria-label={`${color} — ${s.copy}. ${s.drag}`}
          title={`${s.copy} · ${s.drag}`}
          className={cn(
            'relative flex size-14 touch-manipulation items-center justify-center overflow-hidden rounded-[18px] transition-shadow duration-200',
            isDragging ? 'cursor-grabbing shadow-[0_18px_30px_-10px_rgba(0,0,0,.45)]' : 'cursor-pointer shadow-[0_6px_14px_-8px_rgba(0,0,0,.4)]',
          )}
          style={{ background: color }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(160deg,rgba(255,255,255,.35),transparent_45%)] shadow-[inset_0_1px_0_rgba(255,255,255,.45),inset_0_0_0_1px_rgba(0,0,0,.07)]" />
          <AnimatePresence>
            {copied && (
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                style={{ color: ink }}
              >
                <Check className="size-5" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <span className="font-mono text-[10.5px] text-ink-3">{color}</span>
        {/* remove */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={s.remove}
          title={s.remove}
          className="absolute -right-1.5 -top-1.5 flex size-5.5 scale-75 items-center justify-center rounded-full bg-ink text-[var(--surface)] opacity-0 shadow-md transition-[opacity,transform] duration-150 hover:scale-110 focus-visible:scale-100 focus-visible:opacity-100 group-hover/sw:scale-100 group-hover/sw:opacity-100 [@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100"
        >
          <X className="size-3" strokeWidth={3} />
        </button>
        {/* edit */}
        <label
          title={s.edit}
          className="absolute -right-1.5 top-[38px] flex size-5.5 scale-75 cursor-pointer items-center justify-center rounded-full bg-[var(--surface)] text-ink opacity-0 shadow-md ring-1 ring-[var(--line-2)] transition-[opacity,transform] duration-150 focus-within:scale-100 focus-within:opacity-100 group-hover/sw:scale-100 group-hover/sw:opacity-100"
        >
          <Pipette className="size-3" />
          <input type="color" aria-label={s.edit} value={color.toLowerCase()} onChange={(e) => onEdit(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </motion.div>
    </div>
  )
}
