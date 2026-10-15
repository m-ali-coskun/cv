import type { Transition, Variants } from 'motion/react'

/**
 * Motion vocabulary (Apple / Emil Kowalski inspired):
 *  - UI responses are fast and ease-OUT (never ease-in for entrances)
 *  - springs for anything the user drags or toggles
 *  - press feedback = scale .97, not colour flashes
 *  - entrances combine opacity + small translate + blur for a "focus pull"
 */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_IOS = [0.32, 0.72, 0, 1] as const
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

/**
 * Springs overshoot, and an overshooting `filter: blur()` dips below 0px (invalid CSS, logged as a
 * keyframe warning). Every preset therefore eases `filter` with a short tween while transforms keep
 * the spring. `inherit` keeps the parent transition's `delay`, so staggered focus-pulls stay in sync.
 */
export const FILTER_TWEEN = { type: 'tween', duration: 0.32, ease: EASE_OUT, inherit: true } as const

export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.8, filter: FILTER_TWEEN } as Transition,
  smooth: { type: 'spring', stiffness: 260, damping: 30, filter: FILTER_TWEEN } as Transition,
  bouncy: { type: 'spring', stiffness: 420, damping: 18, mass: 0.9, filter: FILTER_TWEEN } as Transition,
  wobbly: { type: 'spring', stiffness: 300, damping: 12, filter: FILTER_TWEEN } as Transition,
  pill: { type: 'spring', stiffness: 480, damping: 38, filter: FILTER_TWEEN } as Transition,
}

export const press = { scale: 0.97 }
export const hoverLift = { y: -3, transition: spring.snappy }

/** Parent with staggered children. Use with `item` below. */
export const stagger = (delay = 0.05, delayChildren = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren } },
})

/** "Focus pull" entrance: fade + rise + de-blur. */
export const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE_OUT },
  },
}

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.85, filter: 'blur(6px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: spring.bouncy },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_IOS } },
}

/** Route transition used by the shell's <AnimatePresence>. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.18, ease: EASE_IN_OUT } },
}
