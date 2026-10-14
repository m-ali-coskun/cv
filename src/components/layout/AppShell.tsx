import { Suspense, useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { pageTransition } from '@/lib/motion'
import { useApp } from '@/store'
import { useUI } from '@/store/ui'
import { Background } from './Background'
import { Sidebar } from './Sidebar'
import { MobileTitle, Topbar } from './Topbar'
import { DisciplineTabs } from './DisciplineTabs'
import { MobileNavDrawer, MobileTabBar } from './MobileNav'
import { Toaster } from './Toaster'
import { CommandPalette } from './CommandPalette'
import { NotificationsPanel } from './NotificationsPanel'
import { WelcomeModal } from '../onboarding/WelcomeModal'
import { MatchCelebration } from '@/features/discover/MatchCelebration'
import { PageSkeleton } from './PageSkeleton'

/** Routes where the discipline tabs make no sense. */
const NO_TABS = ['/settings', '/join', '/brief']

function routeKey(pathname: string) {
  const [, a = '', b] = pathname.split('/')
  // chat & network detail switch in-place; everything else animates per page
  if (a === 'messages') return 'messages'
  return b ? `${a}/${b}` : a
}

export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const collapsed = useApp((s) => s.settings.sidebarCollapsed)
  const onboardingDone = useApp((s) => s.settings.onboardingDone)
  const setUI = useUI((s) => s.set)
  const showTabs = !NO_TABS.some((p) => location.pathname.startsWith(p))

  // First visit → explain the product
  useEffect(() => {
    if (!onboardingDone) setUI({ welcomeOpen: true })
  }, [onboardingDone, setUI])

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setUI({ paletteOpen: !useUI.getState().paletteOpen })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setUI])

  // scroll to top on page change
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, location.hash])

  return (
    <>
      <Background />
      <div className="mx-auto flex min-h-dvh max-w-[1680px] gap-3 p-2.5 sm:p-3 lg:gap-4 lg:p-4">
        <div className="sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 lg:block">
          <Sidebar collapsed={collapsed} />
        </div>
        <main className={cn('flex min-w-0 flex-1 flex-col gap-4 pb-28 lg:pb-6')}>
          <Topbar />
          <MobileTitle />
          {showTabs && <DisciplineTabs className="self-start" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={routeKey(location.pathname)} variants={pageTransition} initial="initial" animate="animate" exit="exit" className="min-w-0 flex-1">
              <Suspense fallback={<PageSkeleton />}>{outlet}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileTabBar />
      <MobileNavDrawer />
      <NotificationsPanel />
      <CommandPalette />
      <WelcomeModal />
      <MatchCelebration />
      <Toaster />
    </>
  )
}
