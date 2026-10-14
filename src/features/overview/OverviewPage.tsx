import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { stagger } from '@/lib/motion'
import { useRole } from '@/store/selectors'
import { useHashScroll } from './hooks'
import { ClientDashboard, DesignerDashboard } from './Dashboards'

/**
 * /overview — the dashboard. Clients get the studio view (featured job,
 * pulse, risks, spend…), designers their focus view (timer, requests,
 * earnings…). Cards enter with a staggered focus-pull and the whole grid
 * re-choreographs when the role switches.
 */
export default function OverviewPage() {
  const role = useRole()
  const { hash, key } = useLocation()
  useHashScroll(hash, key)

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={role}
        variants={stagger(0.065, 0.05)}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, y: 10, filter: 'blur(8px)', transition: { duration: 0.2 } }}
        className="grid grid-cols-1 gap-3 md:grid-flow-dense md:grid-cols-2 lg:gap-4 xl:grid-cols-12"
      >
        {role === 'client' ? <ClientDashboard /> : <DesignerDashboard />}
      </motion.div>
    </AnimatePresence>
  )
}
