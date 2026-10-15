import { useId, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang } from '@/i18n'
import type { Lang } from '@/store/types'
import { FILTER_TWEEN } from '@/lib/motion'

const STR: Record<Lang, Record<string, string>> = {
  en: { placeholder: 'Type and press Enter', remove: 'Remove', create: 'Add “{v}”', full: 'Limit reached', suggestions: 'Suggestions', none: 'No matches' },
  de: { placeholder: 'Tippen und Enter drücken', remove: 'Entfernen', create: '„{v}“ hinzufügen', full: 'Limit erreicht', suggestions: 'Vorschläge', none: 'Keine Treffer' },
  tr: { placeholder: 'Yaz ve Enter’a bas', remove: 'Kaldır', create: '“{v}” ekle', full: 'Sınıra ulaşıldı', suggestions: 'Öneriler', none: 'Eşleşme yok' },
}

export interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  /** Pool shown in the dropdown (filtered as you type, chosen ones hidden). */
  suggestions?: string[]
  max?: number
  placeholder?: string
  /** Allow tags that aren't in `suggestions` (default true). */
  allowCustom?: boolean
  /** Normalise new tags. */
  transform?: 'none' | 'lowercase' | 'capitalize'
  /** Show quick-add chips for the top suggestions under the field. */
  quickPicks?: number
  /** Leading icon inside the field. */
  icon?: ReactNode
  disabled?: boolean
  id?: string
  className?: string
}

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Chips + input. Enter / comma / Tab adds, Backspace on empty selects then
 * removes the last chip, pasting "a, b, c" adds several, duplicates shake.
 * The suggestion list is filtered, highlighted and fully keyboard-navigable.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  max,
  placeholder,
  allowCustom = true,
  transform = 'none',
  quickPicks = 0,
  icon,
  disabled,
  id,
  className,
}: TagInputProps) {
  const lang = useLang()
  const s = STR[lang]
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const [armed, setArmed] = useState(false) // backspace once = select last chip
  const [shake, setShake] = useState<string | null>(null)
  const full = max !== undefined && value.length >= max
  const chosen = useMemo(() => new Set(value.map(norm)), [value])

  const fmt = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, ' ')
    if (transform === 'lowercase') return t.toLowerCase()
    if (transform === 'capitalize') return t.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    return t
  }

  const filtered = useMemo(() => {
    const q = norm(text)
    const pool = suggestions.filter((x) => !chosen.has(norm(x)))
    if (!q) return pool.slice(0, 8)
    const starts = pool.filter((x) => norm(x).startsWith(q))
    const contains = pool.filter((x) => !norm(x).startsWith(q) && norm(x).includes(q))
    return [...starts, ...contains].slice(0, 8)
  }, [text, suggestions, chosen])

  const canCreate = allowCustom && !!text.trim() && !chosen.has(norm(text)) && !filtered.some((f) => norm(f) === norm(text))
  const options = canCreate ? [...filtered, `__create__${text}`] : filtered
  const open = focused && !full && (options.length > 0 || !!text.trim())

  const addMany = (raws: string[]) => {
    let next = [...value]
    for (const r of raws) {
      const t = fmt(r)
      if (!t) continue
      if (max !== undefined && next.length >= max) break
      if (next.some((v) => norm(v) === norm(t))) {
        const existing = next.find((v) => norm(v) === norm(t))!
        setShake(existing)
        setTimeout(() => setShake(null), 450)
        continue
      }
      if (!allowCustom && !suggestions.some((x) => norm(x) === norm(t))) continue
      next = [...next, suggestions.find((x) => norm(x) === norm(t)) ?? t]
    }
    if (next.length !== value.length) onChange(next)
    setText('')
    setActive(0)
    setArmed(false)
  }

  const commit = () => {
    const opt = options[active]
    if (open && opt) addMany([opt.startsWith('__create__') ? opt.slice(10) : opt])
    else if (text.trim()) addMany([text])
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Enter picks the highlighted suggestion (or creates the typed tag)
      if (text.trim() || (open && options[active])) {
        e.preventDefault()
        commit()
      }
    } else if (e.key === ',') {
      e.preventDefault()
      if (text.trim()) addMany([text])
    } else if (e.key === 'Tab' && text.trim()) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !text && value.length) {
      if (armed) {
        onChange(value.slice(0, -1))
        setArmed(false)
      } else setArmed(true)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (options.length ? (a + 1) % options.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (options.length ? (a - 1 + options.length) % options.length : 0))
    } else if (e.key === 'Escape') {
      setFocused(false)
    } else setArmed(false)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const t = e.clipboardData.getData('text')
    if (/[,\n;]/.test(t)) {
      e.preventDefault()
      addMany(t.split(/[,\n;]+/))
    }
  }

  const highlight = (label: string) => {
    const q = text.trim()
    const i = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1
    if (i < 0) return label
    return (
      <>
        {label.slice(0, i)}
        <mark className="rounded-[3px] bg-accent-soft text-ink [box-shadow:0_0_0_1.5px_var(--accent-soft)]">{label.slice(i, i + q.length)}</mark>
        {label.slice(i + q.length)}
      </>
    )
  }

  const quick = quickPicks > 0 ? suggestions.filter((x) => !chosen.has(norm(x))).slice(0, quickPicks) : []

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl border bg-[var(--surface)]/70 px-2 py-1.5 transition-[border-color,box-shadow,background-color] duration-200',
          focused ? 'border-[var(--accent-line)] bg-[var(--surface)] shadow-[0_0_0_4px_var(--accent-softer)]' : 'border-line hover:border-line-2',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {icon && <span className="pl-1.5 text-ink-3 [&_svg]:size-4">{icon}</span>}
        <AnimatePresence initial={false} mode="popLayout">
          {value.map((tag, i) => {
            const selected = armed && i === value.length - 1
            return (
              <motion.span
                layout
                key={tag}
                initial={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', x: shake === tag ? [0, -5, 5, -3, 3, 0] : 0 }}
                exit={{ opacity: 0, scale: 0.6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 28, filter: FILTER_TWEEN }}
                className={cn(
                  'inline-flex h-7.5 items-center gap-1 rounded-full pl-3 pr-1 text-[13px] font-medium transition-colors',
                  selected ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-accent-soft text-ink',
                )}
              >
                {tag}
                <button
                  type="button"
                  aria-label={`${s.remove} ${tag}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(value.filter((v) => v !== tag))
                  }}
                  className="flex size-5.5 items-center justify-center rounded-full text-current opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              </motion.span>
            )
          })}
        </AnimatePresence>
        <input
          ref={inputRef}
          id={id}
          value={text}
          disabled={disabled || full}
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) addMany([v.slice(0, -1)])
            else {
              setText(v)
              setActive(0)
              setArmed(false)
              setFocused(true)
            }
          }}
          onKeyDown={onKey}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={full ? s.full : value.length ? '' : (placeholder ?? s.placeholder)}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          className="h-7.5 min-w-[90px] flex-1 bg-transparent px-1.5 text-[14px] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
        />
        {max !== undefined && (
          <span className={cn('shrink-0 pr-1.5 font-mono text-[11px] tabular-nums', full ? 'text-accent-text' : 'text-ink-4')}>
            {value.length}/{max}
          </span>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34, filter: FILTER_TWEEN }}
            className="glass glass-strong absolute inset-x-0 top-[calc(100%+6px)] z-[60] max-h-64 origin-top overflow-y-auto rounded-[18px] !bg-[color-mix(in_oklab,var(--surface)_90%,transparent)] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,.3)]"
          >
            <li className="relative z-[1] px-2.5 pb-1 pt-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-3">{options.length ? s.suggestions : s.none}</li>
            {options.map((o, i) => {
              const isCreate = o.startsWith('__create__')
              const label = isCreate ? o.slice(10) : o
              return (
                <li
                  key={o}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    addMany([label])
                  }}
                  onPointerEnter={() => setActive(i)}
                  className={cn('relative z-[1] flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-[13.5px] text-ink', i === active && 'text-ink')}
                >
                  {i === active && (
                    <motion.span layoutId={`${listId}-hl`} className="absolute inset-0 -z-[1] rounded-xl bg-[var(--surface-2)]" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />
                  )}
                  {isCreate ? (
                    <>
                      <Plus className="size-3.5 text-ink-3" />
                      <span className="truncate">{s.create.replace('{v}', fmt(label))}</span>
                    </>
                  ) : (
                    <span className="truncate">{highlight(label)}</span>
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
      </div>

      {quick.length > 0 && !full && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <motion.button
              key={q}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => addMany([q])}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-line-2 px-2.5 text-[12px] text-ink-2 transition-colors hover:border-[var(--accent)] hover:bg-accent-softer hover:text-ink"
            >
              <Plus className="size-3" /> {q}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
