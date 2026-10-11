import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Standard shadcn/ui helper: merges conditional class lists and resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
