import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const base =
  'w-full rounded-2xl border border-line bg-[var(--surface)]/70 px-4 text-[14px] text-ink placeholder:text-ink-3 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--accent-line)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_4px_var(--accent-softer)] disabled:opacity-60'

export function Label({ children, hint, htmlFor, className }: { children: ReactNode; hint?: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink-2', className)}>
      <span>{children}</span>
      {hint && <span className="text-[12px] font-normal text-ink-3">{hint}</span>}
    </label>
  )
}

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <Label hint={hint}>{label}</Label>}
      {children}
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; right?: ReactNode }>(
  function Input({ className, icon, right, ...rest }, ref) {
    return (
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 [&_svg]:size-4">{icon}</span>}
        <input ref={ref} className={cn(base, 'h-11', icon && 'pl-10', right && 'pr-12', className)} {...rest} />
        {right && <span className="absolute right-2 top-1/2 -translate-y-1/2">{right}</span>}
      </div>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(base, 'min-h-[110px] resize-y py-3 leading-relaxed', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(base, 'h-11 cursor-pointer appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
    </div>
  )
})

/** Toggleable chip used for tags / multi-select. */
export function Chip({ active, onClick, children, className, color }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-all duration-200 active:scale-95',
        active ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-line-2 text-ink-2 hover:border-[var(--ink-4)] hover:text-ink',
        className,
      )}
      style={active && color ? { background: color, color: '#0b0b0c' } : undefined}
    >
      {children}
    </button>
  )
}
