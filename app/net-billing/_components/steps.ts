/**
 * The general path to a grid-connected solar system with net billing in
 * Jamaica. Deliberately general: JPS publishes the current application
 * forms, fees, size limits and credit terms, and the OUR regulates them —
 * the page links to both instead of restating figures that change.
 * OWNER REVIEW: confirm this wording against JPS's current process.
 */
export interface NetBillingStep {
  id: string
  title: string
  body: string
  /** What the customer should have in hand at the end of the step. */
  outcome: string
}

export const NET_BILLING_STEPS: NetBillingStep[] = [
  {
    id: 'size',
    title: 'Size the system and get quotes',
    body: 'Start from your JPS bills (a year if you can) and your roof. Ask installers to size the system to your own use — net billing credits exported power, but the terms decide what that credit is worth.',
    outcome: 'Written quotes that state panel and inverter models, system size (kW) and price.',
  },
  {
    id: 'installer',
    title: 'Choose a licensed installer and a grid-tie inverter',
    body: 'The wiring must be done by a licensed electrician, and the inverter must be a grid-interactive model JPS accepts. Ask the installer to confirm both in writing.',
    outcome: 'A signed contract naming the licensed electrician and the inverter model.',
  },
  {
    id: 'apply',
    title: 'Apply to JPS before connecting',
    body: 'Submit JPS’s application for connecting a customer-owned generator / net billing, with the system details from your installer. Don’t connect to the grid before JPS approves it.',
    outcome: 'Your application reference and the date you submitted it.',
  },
  {
    id: 'install',
    title: 'Install',
    body: 'The installer fits the panels, inverter and safety disconnects. Keep the datasheets and the installer’s test results.',
    outcome: 'Installation finished; datasheets and test sheet saved.',
  },
  {
    id: 'inspect',
    title: 'Government Electrical Inspectorate inspection',
    body: 'The electrical work is inspected and certified before JPS will connect it. Your electrician normally arranges this.',
    outcome: 'The inspection certificate.',
  },
  {
    id: 'meter',
    title: 'JPS review, agreement and meter change',
    body: 'JPS reviews the application and certificate, you sign the agreement, and JPS changes your meter to one that measures power both ways.',
    outcome: 'A signed agreement and the date the new meter went in.',
  },
  {
    id: 'bill',
    title: 'Check your first bills',
    body: 'Your bill should now show energy imported and exported. Compare the first few against your agreement — the Bill Explainer helps with the imported side.',
    outcome: 'First net-billing bill checked.',
  },
]

export const OFFICIAL_LINKS = [
  { href: 'https://www.jpsco.com/', label: 'JPS — current application forms, requirements and fees' },
  { href: 'https://our.org.jm/', label: 'Office of Utilities Regulation (OUR) — rules for net billing and customer rights' },
]
