/** URL slug: readable name + the station id (ids never contain hyphens), so renames keep old links working. */
export function stationSlug(s: { id: string; name: string }): string {
  const name = s.name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return name ? `${name}-${s.id}` : s.id
}

export function idFromSlug(slug: string): string | null {
  const id = slug.split('-').pop() ?? ''
  return /^[a-z0-9]{20,40}$/i.test(id) ? id : null
}
