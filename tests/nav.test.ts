import { describe, it, expect } from 'vitest'
import { NAV, allPages, resolve, titleFor } from '../app/admin/dashboard/_components/nav'

describe('nav tree', () => {
  it('gives every entry a unique URL', () => {
    const hrefs = allPages().map((p) => p.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('nests every child under its own group path', () => {
    for (const g of NAV) {
      for (const c of g.children ?? []) {
        expect(c.href === g.href || c.href.startsWith(`${g.href}/`)).toBe(true)
      }
    }
  })

  it('describes every page, so no screen arrives unexplained', () => {
    for (const p of allPages()) expect(p.description.length).toBeGreaterThan(0)
  })
})

describe('resolve', () => {
  it('finds the group for a top-level page', () => {
    expect(resolve('/admin/dashboard/orders').group?.id).toBe('orders')
  })

  it('resolves the root to Executive', () => {
    expect(resolve('/admin/dashboard').group?.id).toBe('exec')
  })

  it('prefers the deepest matching group, not the first prefix', () => {
    // /admin/dashboard is a prefix of everything; Finance must still win here.
    expect(resolve('/admin/dashboard/finance/payroll').group?.id).toBe('finance')
  })

  it('picks the exact child, not the group landing page', () => {
    const { leaf } = resolve('/admin/dashboard/finance/banking')
    expect(leaf?.label).toBe('Banking')
  })

  it('treats the group path itself as its Overview child', () => {
    const { leaf } = resolve('/admin/dashboard/finance')
    expect(leaf?.label).toBe('Overview')
  })

  it('tolerates a trailing slash', () => {
    expect(resolve('/admin/dashboard/finance/taxes/').leaf?.label).toBe('Taxes')
  })

  it('returns nothing for a path outside the console', () => {
    expect(resolve('/shop').group).toBeNull()
  })
})

describe('titleFor', () => {
  it('shows the subsection name with its section as a breadcrumb', () => {
    const t = titleFor('/admin/dashboard/finance/payroll')
    expect(t.title).toBe('Payroll')
    expect(t.breadcrumb).toBe('Finance')
  })

  it('has no breadcrumb on a section landing page', () => {
    const t = titleFor('/admin/dashboard/finance')
    expect(t.title).toBe('Finance')
    expect(t.breadcrumb).toBeNull()
  })

  it('titles a top-level section by its own name', () => {
    expect(titleFor('/admin/dashboard/inventory').title).toBe('Inventory')
  })
})
