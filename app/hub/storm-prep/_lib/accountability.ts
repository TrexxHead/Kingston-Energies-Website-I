/**
 * Accountability Engine — turns the readiness signals the dashboard
 * already computes into a short, prioritized "do this next" list. Every
 * action here maps to a signal this build actually tracks; it never
 * invents a check for something (e.g. "check your smoke detector
 * batteries") that isn't backed by real state.
 */

export interface AccountabilitySignals {
  checkupDone: boolean
  hasBackupDevice: boolean
  checklistPct: number
  familyPlanSaved: boolean
  resourcesTracked: boolean
}

export interface NextAction {
  id: string
  text: string
  href: string
  priority: number
}

export function buildNextActions(signals: AccountabilitySignals): NextAction[] {
  const actions: NextAction[] = []

  if (!signals.checkupDone) {
    actions.push({
      id: 'checkup',
      text: 'Run your Energy Checkup — it feeds the load, backup, and budget estimates everywhere else on this page.',
      href: '/hub/energy-checkup',
      priority: 1,
    })
  }
  if (!signals.hasBackupDevice) {
    actions.push({
      id: 'backup',
      text: 'Register a power bank or station under My devices so your reserve can actually be counted.',
      href: '/hub/devices',
      priority: 2,
    })
  }
  if (signals.checklistPct < 100) {
    actions.push({
      id: 'checklist',
      text: 'Finish your storm prep checklist.',
      href: '/hub/storm-prep/checklist',
      priority: 3,
    })
  }
  if (!signals.familyPlanSaved) {
    actions.push({
      id: 'family',
      text: 'Fill in your family communication plan — meeting point and out-of-area contact.',
      href: '/hub/storm-prep/family-plan',
      priority: 4,
    })
  }
  if (!signals.resourcesTracked) {
    actions.push({
      id: 'resources',
      text: 'Log what food, water, fuel, and medication you actually have on hand.',
      href: '/hub/storm-prep/my-resources',
      priority: 5,
    })
  }

  return actions.sort((a, b) => a.priority - b.priority)
}
