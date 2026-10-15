import { AnimatePresence, motion } from 'motion/react'
import { stagger } from '@/lib/motion'
import { useRole } from '@/store/selectors'
import { ClientPayments } from './ClientPayments'
import { DesignerEarnings } from './DesignerEarnings'

/**
 * /payments — "Payments" for clients (escrow, invoices, cards, spend) and
 * "Earnings" for designers (balance, payouts, invoicing, goals, tax).
 * Cards enter with a staggered focus-pull; switching role re-choreographs
 * the whole grid.
 */
export default function PaymentsPage() {
  const role = useRole()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={role}
        variants={stagger(0.06, 0.04)}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, y: 10, filter: 'blur(8px)', transition: { duration: 0.2 } }}
        className="grid grid-cols-1 gap-3 md:grid-flow-dense md:grid-cols-2 lg:gap-4 xl:grid-cols-12"
      >
        {role === 'client' ? <ClientPayments /> : <DesignerEarnings />}
      </motion.div>
    </AnimatePresence>
  )
}
