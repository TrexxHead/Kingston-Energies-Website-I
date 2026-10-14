/**
 * Kingston Energies shared calculation engine (backlog F04).
 *
 * Every tool — Energy Checkup, Backup Runtime Builder, Bill Explainer,
 * Storm Centre, adviser — calls these functions rather than carrying its
 * own maths. Browser-safe; run.ts (hashing) is server-only and imported
 * directly where needed.
 */
export * from './version'
export * from './basis'
export * from './result'
export * from './units'
export * from './loads'
export * from './battery'
export * from './bills'
export * from './tariff'
export * from './scenario'
export * from './solar'
