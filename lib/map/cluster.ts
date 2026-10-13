/**
 * Greedy screen-space grouping for map pins: stations whose pins would sit
 * within `radius` pixels of each other become one count bubble. Small and
 * dependency-free — fine for hundreds of stations.
 */
export function clusterStations<T extends { id: string }>(items: T[], project: (item: T) => { x: number; y: number }, keepSingle: string | null = null, radius = 46): T[][] {
  const pts = items.map((item) => ({ item, p: project(item) }))
  const used = new Set<number>()
  const groups: T[][] = []
  pts.forEach((a, i) => {
    if (used.has(i)) return
    used.add(i)
    if (a.item.id === keepSingle) {
      groups.push([a.item])
      return
    }
    const group = [a.item]
    pts.forEach((b, j) => {
      if (used.has(j) || b.item.id === keepSingle) return
      if (Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) <= radius) {
        used.add(j)
        group.push(b.item)
      }
    })
    groups.push(group)
  })
  return groups
}
