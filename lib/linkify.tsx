import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s]+)/g

/** Turn any http(s) URLs inside a plain string into clickable links, leaving the rest as text. */
export function linkifyText(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    part.startsWith('http://') || part.startsWith('https://') ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
