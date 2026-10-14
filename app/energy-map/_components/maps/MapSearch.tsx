'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X, MapPin, Zap, Mountain, Waves, Building2, Route } from 'lucide-react'
import { PARISHES } from '@/lib/map/parishes'
import { MAP_DATA } from '@/lib/map/mapData'
import { POI_COLOR, POI_LABEL, type PoiKind } from '@/lib/map/openStyle'
import { prepare, search, type PreparedRow, type SearchHit, type SearchIndex } from '@/lib/map/search'

const PARISH_NAME = Object.fromEntries(PARISHES.map((p) => [p.id, p.name])) as Record<string, string>

const KIND_TEXT: Record<string, string> = {
  charger: 'EV charger',
  city: 'City',
  town: 'Town',
  village: 'Village',
  hamlet: 'District',
  neighbourhood: 'Neighbourhood',
  street: 'Street',
  peak: 'Peak',
  bay: 'Bay',
  waterfall: 'Waterfall',
}

export function hitLabel(hit: SearchHit): string {
  const k = hit.kind.startsWith('poi:') ? (hit.category ? hit.category.replace(/\b\w/g, (m) => m.toUpperCase()) : POI_LABEL[hit.kind.slice(4) as PoiKind] ?? 'Place') : KIND_TEXT[hit.kind] ?? 'Place'
  return [k, hit.parish ? PARISH_NAME[hit.parish] : null].filter(Boolean).join(' · ')
}

function HitIcon({ kind }: { kind: string }) {
  const box = (bg: string, child: React.ReactNode) => (
    <span aria-hidden style={{ width: 30, height: 30, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}>
      {child}
    </span>
  )
  if (kind === 'charger') return box('#5fae2e', <Zap size={15} />)
  if (kind.startsWith('poi:')) return box(POI_COLOR[kind.slice(4) as PoiKind] ?? POI_COLOR.place, <MapPin size={15} />)
  if (kind === 'street') return box('#8b8d98', <Route size={15} />)
  if (kind === 'peak') return box('#8a7155', <Mountain size={15} />)
  if (kind === 'bay' || kind === 'waterfall') return box('#3f7fab', <Waves size={15} />)
  return box('#5c6b63', <Building2 size={15} />)
}

interface Props {
  /** Registry chargers, searchable alongside places. */
  chargers: SearchHit[]
  onPick: (hit: SearchHit) => void
}

export default function MapSearch({ chargers, onPick }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [index, setIndex] = useState<{ raw: SearchIndex; prepared: PreparedRow[] } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const loading = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()

  function ensureIndex() {
    if (index || loading.current) return
    loading.current = true
    fetch(MAP_DATA.search)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((raw: SearchIndex) => setIndex({ raw, prepared: prepare(raw) }))
      .catch(() => setLoadFailed(true))
      .finally(() => (loading.current = false))
  }

  const hits = useMemo(() => {
    if (!q.trim()) return []
    return index ? search(index.prepared, index.raw, q, chargers) : search([], { v: 1, parishes: [], rows: [] }, q, chargers)
  }, [q, index, chargers])

  useEffect(() => setActive(0), [q])

  function pick(hit: SearchHit) {
    setQ(hit.name)
    setOpen(false)
    input.current?.blur()
    onPick(hit)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault()
      pick(hits[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && q.trim().length > 0

  return (
    <div className="ke-search" onKeyDown={(e) => e.stopPropagation()}>
      <div className="ke-search__box ke-glass">
        <Search size={17} aria-hidden className="ke-search__icon" />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
          aria-label="Search Jamaica: places, streets, businesses"
          placeholder="Search places, streets, businesses"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            ensureIndex()
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          autoComplete="off"
          spellCheck={false}
        />
        {q && (
          <button type="button" className="ke-search__clear" aria-label="Clear search" onClick={() => (setQ(''), input.current?.focus())}>
            <X size={15} aria-hidden />
          </button>
        )}
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="ke-search__list ke-glass">
          {hits.map((h, i) => (
            <li
              key={h.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="ke-search__item"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(h)}
            >
              <HitIcon kind={h.kind} />
              <span className="ke-search__text">
                <strong>{h.name}</strong>
                <small>{hitLabel(h)}</small>
              </span>
            </li>
          ))}
          {hits.length === 0 && <li className="ke-search__empty">{!index && !loadFailed ? 'Loading Jamaica…' : loadFailed ? 'Search is unavailable right now.' : 'No matches in Jamaica.'}</li>}
        </ul>
      )}
    </div>
  )
}
