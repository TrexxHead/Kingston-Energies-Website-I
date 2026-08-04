import {
  Wind, Refrigerator, Droplets, Fan, Lightbulb, Tv, Laptop, Smartphone, Waves, Shirt,
  CookingPot, WashingMachine, Snowflake, Wifi, Package, Thermometer, Power, Zap, Plug,
  BatteryCharging, Moon, Sun, Percent, Calendar,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  wind: Wind,
  refrigerator: Refrigerator,
  droplets: Droplets,
  fan: Fan,
  lightbulb: Lightbulb,
  tv: Tv,
  laptop: Laptop,
  smartphone: Smartphone,
  waves: Waves,
  shirt: Shirt,
  'cooking-pot': CookingPot,
  'washing-machine': WashingMachine,
  snowflake: Snowflake,
  wifi: Wifi,
  package: Package,
  thermometer: Thermometer,
  power: Power,
  zap: Zap,
  plug: Plug,
  'battery-charging': BatteryCharging,
  moon: Moon,
  sun: Sun,
  percent: Percent,
  calendar: Calendar,
}

export function iconFor(id: string): LucideIcon {
  return ICONS[id] ?? Package
}
