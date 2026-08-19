/**
 * The four operating phases a storm-prep tool moves through: PREPARE
 * (normal times, working the checklist), MONITOR (a system is being
 * watched — follow official sources), SURVIVE (power is actually out),
 * RECOVER (power's back, cleaning up). This build has no live weather
 * feed, so the phase is never auto-detected from a forecast — it's
 * derived only from real state this app already tracks (an active
 * outage, checklist completion) and can always be overridden by hand.
 */

export type StormPhase = 'prepare' | 'monitor' | 'survive' | 'recover'

export interface PhaseMeta {
  label: string
  short: string
  description: string
}

export const PHASE_META: Record<StormPhase, PhaseMeta> = {
  prepare: {
    label: 'Prepare',
    short: 'PREPARE',
    description: 'Normal times — build your kit, work the checklist, know your numbers.',
  },
  monitor: {
    label: 'Monitor',
    short: 'MONITOR',
    description: 'A system is being watched — charge everything, follow official sources, finish the checklist.',
  },
  survive: {
    label: 'Survive',
    short: 'SURVIVE',
    description: 'Power is out — conserve your reserve, track the outage, use the Command Centre.',
  },
  recover: {
    label: 'Recover',
    short: 'RECOVER',
    description: 'Power is back — check for damage safely, restock what you used.',
  },
}

export const PHASE_ORDER: StormPhase[] = ['prepare', 'monitor', 'survive', 'recover']

export interface PhaseSignals {
  outageActive: boolean
  checklistPct: number
}

/**
 * A real-signal default, not a guess: an active outage always means
 * SURVIVE; otherwise a mostly-complete checklist reads as MONITOR (ready,
 * paying attention) and anything less reads as PREPARE. RECOVER is never
 * inferred automatically — there's no signal in this build for "the
 * outage just ended" versus "never started," so it's manual-only.
 */
export function inferPhase(signals: PhaseSignals): StormPhase {
  if (signals.outageActive) return 'survive'
  if (signals.checklistPct >= 80) return 'monitor'
  return 'prepare'
}
