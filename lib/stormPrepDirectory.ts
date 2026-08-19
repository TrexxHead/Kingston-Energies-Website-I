/**
 * Resource & Help Directory — real Jamaican agencies only. Every entry
 * carries a source and a last-reviewed date so it's clear this is
 * manually curated, static reference data — not a live feed. Phone
 * numbers are only listed where they're already independently verified
 * elsewhere in this codebase (Police/Fire — see the Family Plan page);
 * everything else links to the agency's own site rather than inventing a
 * number this build hasn't confirmed.
 */

export interface DirectoryEntry {
  name: string
  description: string
  phone?: string
  url: string
  source: string
  lastReviewed: string
}

export const DIRECTORY: DirectoryEntry[] = [
  {
    name: 'Police (emergency)',
    description: 'Report a crime in progress or an emergency requiring police response.',
    phone: '119',
    url: 'https://jcf.gov.jm/',
    source: 'Jamaica Constabulary Force',
    lastReviewed: '2026-08-19',
  },
  {
    name: 'Fire & Ambulance (emergency)',
    description: 'Fire, medical emergencies, and ambulance dispatch.',
    phone: '110',
    url: 'https://www.jamaicafirebrigade.gov.jm/',
    source: 'Jamaica Fire Brigade',
    lastReviewed: '2026-08-19',
  },
  {
    name: 'ODPEM',
    description: 'Office of Disaster Preparedness and Emergency Management — official storm watches, warnings, and shelter information for Jamaica.',
    url: 'https://www.odpem.org.jm/',
    source: 'ODPEM',
    lastReviewed: '2026-08-19',
  },
  {
    name: 'Jamaica Public Service (JPS)',
    description: 'Report a power outage, check restoration status, or view your account. Kingston Energies is not affiliated with JPS.',
    url: 'https://www.jpsco.com/',
    source: 'JPS',
    lastReviewed: '2026-08-19',
  },
  {
    name: 'National Water Commission (NWC)',
    description: 'Report a water outage or check for scheduled water disruptions in your area.',
    url: 'https://www.nwcjamaica.com/',
    source: 'NWC',
    lastReviewed: '2026-08-19',
  },
  {
    name: 'Meteorological Service of Jamaica',
    description: 'Official weather forecasts, tropical storm and hurricane advisories.',
    url: 'https://www.metservice.gov.jm/',
    source: 'Met Service Jamaica',
    lastReviewed: '2026-08-19',
  },
]
