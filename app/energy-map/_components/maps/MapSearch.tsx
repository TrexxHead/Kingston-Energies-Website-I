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
      <style>{SEARCH_CSS}</style>
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

/* Self-contained so any page can use the search box; theme follows a parent [data-theme]. */
const SEARCH_CSS = `
.ke-search{--g-bg:rgba(255,255,255,.86);--g-fg:#1f1f23;--g-muted:#5f5f66;--g-line:rgba(0,0,0,.08);--g-hover:rgba(0,0,0,.05);--g-shadow:0 8px 28px rgba(0,0,0,.16),0 1px 3px rgba(0,0,0,.08);color:var(--g-fg);font-family:var(--font-body),system-ui,sans-serif}
[data-theme=dark] .ke-search{--g-bg:rgba(24,30,27,.8);--g-fg:#eef3f0;--g-muted:#a3aea8;--g-line:rgba(255,255,255,.09);--g-hover:rgba(255,255,255,.07);--g-shadow:0 8px 28px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.3)}
.ke-search .ke-glass{background:var(--g-bg);color:var(--g-fg);border:1px solid var(--g-line);box-shadow:var(--g-shadow);-webkit-backdrop-filter:blur(16px) saturate(1.7);backdrop-filter:blur(16px) saturate(1.7)}
.ke-search{position:absolute;left:14px;top:14px;z-index:4;width:min(380px,calc(100% - 84px))}
.ke-search__box{display:flex;align-items:center;gap:8px;height:48px;padding:0 8px 0 14px;border-radius:16px}
.ke-search__icon{flex:none;opacity:.6}
.ke-search__box input{flex:1;min-width:0;height:100%;border:0;background:transparent;color:inherit;font:inherit;font-size:15px;outline:none}
.ke-search__box input::placeholder{color:var(--g-muted)}
.ke-search__box input::-webkit-search-cancel-button{display:none}
.ke-search__box:focus-within{box-shadow:var(--g-shadow),0 0 0 2px #29abe2}
.ke-search__clear{width:30px;height:30px;border-radius:50%;border:0;background:var(--g-hover);color:inherit;display:grid;place-items:center;cursor:pointer}
.ke-search__list{list-style:none;margin:8px 0 0;padding:6px;border-radius:16px;max-height:min(420px,55vh);overflow:auto}
.ke-search__item{display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:12px;cursor:pointer}
.ke-search__item[aria-selected=true]{background:var(--g-hover)}
.ke-search__text{display:grid;min-width:0}
.ke-search__text strong{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-search__text small{font-size:12px;color:var(--g-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-search__empty{padding:10px 12px;font-size:13px;color:var(--g-muted)}
@media (max-width:600px){.ke-search{width:calc(100% - 84px)}}
`
