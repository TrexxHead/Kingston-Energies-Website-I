# Kingston Energies — notes for Claude sessions

- The energy platform build follows the Execution Plan. **Read `docs/platform/IMPLEMENTATION_CHECKLIST.md` first** and update it in the same commit as any platform work (status, decisions, verification).
- Audit: `docs/platform/GAP_ASSESSMENT.md`. External accounts/credentials: `docs/platform/EXTERNAL_SETUP.md`.
- Never ship simulated station status, invented product specs or placeholder calculations as production functionality. Unknown stays unknown.
- Shared maths lives in `lib/energy/engine` (bump `CALC_ENGINE_VERSION` on any formula/policy change). Legacy `lib/energyCheckup` stays until E02 migrates it.
- Browser-test with `next build && next start`; `next dev` can't hydrate under the site CSP.
- Ask before deploying to production or contacting third parties.
