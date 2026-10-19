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
  return mergeTouching(groups, project, keepSingle, radius)
}

/** Second pass: bubbles whose centres would still overlap are merged, so two "3"s never sit on top of each other. */
function mergeTouching<T extends { id: string }>(groups: T[][], project: (item: T) => { x: number; y: number }, keepSingle: string | null, radius: number): T[][] {
  const centre = (g: T[]) => {
    const ps = g.map(project)
    return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length }
  }
  let merged = true
  while (merged) {
    merged = false
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (groups[i].some((x) => x.id === keepSingle) || groups[j].some((x) => x.id === keepSingle)) continue
        const a = centre(groups[i])
        const b = centre(groups[j])
        if (Math.hypot(a.x - b.x, a.y - b.y) <= radius) {
          groups[i] = [...groups[i], ...groups[j]]
          groups.splice(j, 1)
          merged = true
          break outer
        }
      }
    }
  }
  return groups
}
