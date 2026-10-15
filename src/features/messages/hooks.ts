import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { usePendingDeletes } from './store'

/** Reactive `matchMedia`. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Height that fills the viewport from the element's top down to `reserve`
 * pixels above the bottom (the chat never scrolls the page; panes scroll).
 */
export function useFillHeight(reserve: number, min = 320) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const vh = window.visualViewport?.height ?? window.innerHeight
      setHeight(Math.max(min, Math.round(vh - top - reserve)))
    }
    measure()
    const timers = [80, 300, 700, 1200].map((ms) => window.setTimeout(measure, ms))
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [reserve, min])
  return [ref, height] as const
}

/** Re-renders every `ms` (live clocks / relative times). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

export function useCopy() {
  const t = useT()
  return useCallback(
    async (text: string) => {
      await copyText(text)
      toast({ title: t('messages.toast.copied'), tone: 'success', duration: 1800 })
    },
    [t],
  )
}

const deleteTimers = new Map<string, number>()

/**
 * Delete with undo: the message disappears immediately, the store delete
 * happens when the toast expires (unless "Undo" is pressed).
 */
export function useDeleteWithUndo() {
  const t = useT()
  return useCallback(
    (messageId: string) => {
      const { hide, restore } = usePendingDeletes.getState()
      hide(messageId)
      const timer = window.setTimeout(() => {
        deleteTimers.delete(messageId)
        useApp.getState().deleteMessage(messageId)
        restore(messageId)
      }, 5200)
      deleteTimers.set(messageId, timer)
      toast({
        title: t('messages.toast.deleted'),
        tone: 'default',
        duration: 5000,
        action: {
          label: t('messages.action.undo'),
          onClick: () => {
            const tm = deleteTimers.get(messageId)
            if (tm) window.clearTimeout(tm)
            deleteTimers.delete(messageId)
            restore(messageId)
          },
        },
      })
    },
    [t],
  )
}

let audioCtx: AudioContext | null = null

/** Tiny UI blips (only when Settings → Sound is on). */
export function blip(kind: 'send' | 'receive' | 'pop') {
  if (!useApp.getState().settings.sound) return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    audioCtx ??= new Ctor()
    const ctx = audioCtx
    const now = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    const [a, b] = kind === 'send' ? [620, 980] : kind === 'receive' ? [940, 620] : [520, 760]
    o.frequency.setValueAtTime(a, now)
    o.frequency.exponentialRampToValueAtTime(b, now + 0.11)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.07, now + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    o.connect(g).connect(ctx.destination)
    o.start(now)
    o.stop(now + 0.22)
  } catch {
    /* audio unavailable */
  }
}

/** Long-press (touch) helper: returns pointer handlers. */
export function useLongPress(onLong: () => void, ms = 420) {
  const timer = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }
  return {
    fired,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') return
        fired.current = false
        start.current = { x: e.clientX, y: e.clientY }
        timer.current = window.setTimeout(() => {
          fired.current = true
          if (navigator.vibrate) navigator.vibrate(12)
          onLong()
        }, ms)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!start.current) return
        if (Math.abs(e.clientX - start.current.x) > 8 || Math.abs(e.clientY - start.current.y) > 8) clear()
      },
      onPointerUp: clear,
      onPointerCancel: clear,
    },
  }
}
