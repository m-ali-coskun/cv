import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'accent' | 'glass' | 'ghost' | 'outline' | 'danger' | 'soft'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  // black capsule like the reference "New project"
  primary:
    'bg-ink text-[var(--surface)] shadow-[0_1px_0_rgba(255,255,255,.18)_inset,0_10px_24px_-10px_rgba(0,0,0,.55)] hover:bg-[color-mix(in_oklab,var(--ink)_88%,var(--accent))] dark:bg-[var(--accent)] dark:text-[var(--accent-ink)]',
  accent: 'glass-accent hover:brightness-[1.04]',
  glass: 'glass text-ink hover:bg-[color-mix(in_oklab,var(--glass-bg)_70%,var(--surface))]',
  ghost: 'text-ink-2 hover:text-ink hover:bg-[var(--surface-2)]',
  outline: 'border border-line-2 text-ink hover:bg-[var(--surface-2)]',
  danger: 'bg-danger text-white hover:brightness-110 shadow-[0_10px_24px_-12px_var(--danger)]',
  soft: 'bg-accent-soft text-accent-text hover:bg-[color-mix(in_oklab,var(--accent)_26%,transparent)]',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1 rounded-full',
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-full',
  md: 'h-11 px-5 text-[14px] gap-2 rounded-full',
  lg: 'h-13 px-6 text-[15px] gap-2.5 rounded-full',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  block?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium tracking-[-0.01em] transition-[background-color,color,filter,box-shadow] duration-200 disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </motion.button>
  )
})

type IconButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  label: string
  children: ReactNode
  variant?: 'glass' | 'ghost' | 'soft' | 'primary' | 'night'
  size?: 'sm' | 'md' | 'lg'
  badge?: number | boolean
}

/** Round icon button (bell, filters, more…). `label` is required for a11y. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, variant = 'glass', size = 'md', badge, className, type = 'button', ...rest },
  ref,
) {
  const sz = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10'
  const v = {
    glass: 'glass text-ink',
    ghost: 'text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink',
    soft: 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
    primary: 'bg-ink text-[var(--surface)]',
    night: 'bg-white/10 text-white hover:bg-white/20',
  }[variant]
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors', sz, v, className)}
      {...rest}
    >
      {children}
      {badge ? (
        <span className="absolute right-1.5 top-1.5 flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff6b3d] opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full border-2 border-[var(--surface)] bg-[#ff6b3d]" />
        </span>
      ) : null}
    </motion.button>
  )
})
