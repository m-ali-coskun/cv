import { useUI } from '@/store/ui'

/** Re-opens the welcome tour (used by Settings and the command palette). */
export function openWelcomeTour() {
  useUI.getState().set({ welcomeOpen: true, paletteOpen: false, notificationsOpen: false, mobileNavOpen: false })
}
