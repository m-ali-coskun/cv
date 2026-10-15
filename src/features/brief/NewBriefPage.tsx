import { useRole } from '@/store/selectors'
import { Wizard } from './Wizard'
import { DesignerPanel } from './DesignerPanel'

/**
 * /brief/new — clients write a brief in a multi-step wizard (templates →
 * designer → project → deliverables → design language → assets → review),
 * with a live preview, autosave and a full-screen "sent" moment.
 * In the designer studio the page explains where briefs come from.
 */
export default function NewBriefPage() {
  const role = useRole()
  return role === 'client' ? <Wizard /> : <DesignerPanel />
}
