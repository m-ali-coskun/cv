import { useApp } from '@/store'
import { DesignerProfile } from './designer/DesignerProfile'
import { ClientProfile } from './client/ClientProfile'

/**
 * /profile — the signed-in user's own profile editor.
 *  - designer studio → Ali's designer profile (ME_DESIGNER_ID)
 *  - client workspace → the company profile (ME_CLIENT_ID)
 * `?add=1` opens the "Add work" modal (designer), `?view=preview` shows the public view.
 */
export default function ProfilePage() {
  const role = useApp((s) => s.settings.role)
  return role === 'designer' ? <DesignerProfile key="designer" /> : <ClientProfile key="client" />
}
