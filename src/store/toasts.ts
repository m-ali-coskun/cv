import { create } from 'zustand'
import { uid } from '@/lib/ids'

export type ToastTone = 'default' | 'success' | 'error' | 'info' | 'match' | 'message'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: ToastTone
  /** Avatar seed to show instead of an icon (message / match toasts). */
  avatarSeed?: string
  action?: { label: string; onClick: () => void }
  /** In-app route opened when the toast body is clicked. */
  link?: string
  duration: number
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id' | 'tone' | 'duration'> & Partial<Pick<Toast, 'tone' | 'duration'>>) => string
  dismiss: (id: string) => void
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = uid('t_')
    const toast: Toast = { tone: 'default', duration: 4200, ...t, id }
    set({ toasts: [...get().toasts.slice(-3), toast] })
    if (toast.duration > 0) setTimeout(() => get().dismiss(id), toast.duration)
    return id
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}))

/** Imperative helper usable outside React: toast({ title: 'Saved' }) */
export const toast = (t: Parameters<ToastState['push']>[0]) => useToasts.getState().push(t)
