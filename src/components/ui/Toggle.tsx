import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

/** iOS-style switch with a squishy knob. */
export function Toggle({
  checked,
  onChange,
  label,
  size = 'md',
  className,
  tone = 'ink',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  size?: 'sm' | 'md'
  className?: string
  tone?: 'ink' | 'accent'
}) {
  const w = size === 'sm' ? 36 : 46
  const h = size === 'sm' ? 22 : 28
  const k = h - 6
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-[3px] transition-colors duration-300',
        checked ? (tone === 'accent' ? 'bg-accent' : 'bg-ink dark:bg-accent') : 'bg-[var(--surface-3)]',
        className,
      )}
      style={{ width: w, height: h }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        whileTap={{ width: k * 1.3 }}
        className="block rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.25)]"
        style={{ height: k, width: k, marginLeft: checked ? 'auto' : 0 }}
      />
    </button>
  )
}
