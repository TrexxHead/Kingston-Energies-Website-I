import { Gauge, Sun, Receipt, Landmark, FileCheck2, MapPin, Car, CloudLightning, Tractor, BadgeCheck, CalendarCheck, type LucideIcon } from 'lucide-react'

/** The My Energy tools, grouped — one source for the navbar dropdown, the phone menu and the footer. */
export interface EnergyLink {
  href: string
  label: string
  blurb: string
  Icon: LucideIcon
}

export const ENERGY_GROUPS: { title: string; links: EnergyLink[] }[] = [
  {
    title: 'Plan & save',
    links: [
      { href: '/my-energy', label: 'My Energy', blurb: 'Your devices, backup needs and saved results', Icon: Gauge },
      { href: '/solar', label: 'Rooftop solar estimator', blurb: 'Tap your roof: panels, output, savings', Icon: Sun },
      { href: '/bill-explainer', label: 'Bill Explainer', blurb: 'Why your JPS bill went up', Icon: Receipt },
      { href: '/financing', label: 'Financing calculator', blurb: 'Monthly cost, fees and the true rate', Icon: Landmark },
      { href: '/net-billing', label: 'Net billing guide', blurb: 'Going solar with JPS, step by step', Icon: FileCheck2 },
    ],
  },
  {
    title: 'On the road',
    links: [
      { href: '/energy-map', label: 'Jamaica Energy Map', blurb: 'EV chargers and their status', Icon: MapPin },
      { href: '/ev-costs', label: 'EV vs petrol', blurb: 'What an electric car costs to run', Icon: Car },
    ],
  },
  {
    title: 'Be prepared',
    links: [
      { href: '/storm-ready', label: 'Storm ready', blurb: 'Active storms, shelters, backup runtime', Icon: CloudLightning },
      { href: '/business-tools', label: 'Business & farm tools', blurb: 'Generator costs, solar water pumps', Icon: Tractor },
    ],
  },
  {
    title: 'Get it done',
    links: [
      { href: '/installers', label: 'Licensed installers', blurb: 'Electricians whose licence we checked', Icon: BadgeCheck },
      { href: '/book', label: 'Book a visit', blurb: 'Site surveys and installs', Icon: CalendarCheck },
    ],
  },
]

export const ENERGY_HREFS = ENERGY_GROUPS.flatMap((g) => g.links.map((l) => l.href))
