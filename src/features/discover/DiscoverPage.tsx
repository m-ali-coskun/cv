import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import { useDiscoverUI, type DiscoverMode } from './discoverStore'
import { usePool } from './hooks'
import { Toolbar } from './Toolbar'
import { SwipeMode } from './SwipeMode'
import { GridMode } from './GridMode'
import { NewMode } from './NewMode'
import { ProfileDrawer } from './ProfileDrawer'

/**
 * /discover — role-aware matching.
 * Client-Ali discovers designers, designer-Ali discovers clients; the active
 * discipline tab narrows the pool. Modes: swipe deck · grid · "just joined".
 * URL: ?tab=grid|new (default swipe), ?profile=<id> opens the preview drawer.
 */
export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab')
  const mode: DiscoverMode = tab === 'grid' || tab === 'new' ? tab : 'swipe'
  const pool = usePool()

  const onMode = (m: DiscoverMode) => {
    const next = new URLSearchParams(params)
    if (m === 'swipe') next.delete('tab')
    else next.set('tab', m)
    setParams(next, { replace: true })
  }

  // deep link: /discover?profile=d-hana
  useEffect(() => {
    const pid = params.get('profile')
    if (pid) useDiscoverUI.getState().setPreview(pid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // leaving the page: close the drawer and forget the pinned card
  useEffect(
    () => () => {
      const ui = useDiscoverUI.getState()
      ui.setPreview(null)
      ui.setReturning(null)
    },
    [],
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Toolbar pool={pool} mode={mode} onMode={onMode} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${mode}-${pool.role}`}
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.15 } }}
          className="min-w-0"
        >
          {mode === 'swipe' ? <SwipeMode pool={pool} /> : mode === 'grid' ? <GridMode pool={pool} /> : <NewMode pool={pool} />}
        </motion.div>
      </AnimatePresence>
      <ProfileDrawer />
    </div>
  )
}
