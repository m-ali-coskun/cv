import { JoinWizard } from './join/JoinWizard'

/**
 * /join — designer sign-up. Simulates a new person registering: basics,
 * craft, story, past work, preview → registerDesigner() → visible to clients
 * in Discover › New designers, where they can be liked and matched.
 */
export default function JoinPage() {
  return <JoinWizard />
}
