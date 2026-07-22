'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import { JORDYN_GREETING } from '@/lib/camille'
import CamilleAvatar from '@/components/camille/CamilleAvatar'
import NpsSurvey from '@/components/nps/NpsSurvey'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const PATH_RE = /(\/(?:shop|product|cart|checkout|track|services|about|contact|login|signup|hub)(?:\/[\w-]+)*(?:\?[\w=&%-]+)?)/g

function renderWithLinks(text: string): ReactNode[] {
  return text.split(PATH_RE).map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} href={part} style={{ color: 'var(--ke-green-400)', textDecoration: 'underline', fontWeight: 600 }}>
        {part}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export default function SupportChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Offer the NPS survey once Jordyn has actually replied to the customer.
  const assisted = messages.some((m) => m.role === 'assistant' && m.content.trim().length > 0)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return

    const history: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) }),
      })

      if (res.status === 429) {
        const msg = await res.text()
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: msg }
          return next
        })
        return
      }

      if (!res.ok || !res.body) throw new Error('bad response')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: acc }
          return next
        })
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I had trouble responding. You can reach the team at /contact or on 876-338-9958.',
        }
        return next
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 460,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--ke-dark-hairline)',
        background: 'var(--ke-dark-card)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--gradient-deep)' }}>
        <CamilleAvatar size={38} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: '#fff' }}>Chat with Jordyn</div>
          <div style={{ fontSize: 11.5, color: 'rgba(234,242,236,.7)' }}>Kingston Energies assistant</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Bubble role="assistant">{renderWithLinks(JORDYN_GREETING)}</Bubble>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.role === 'assistant' ? (m.content ? renderWithLinks(m.content) : <TypingDots />) : m.content}
          </Bubble>
        ))}
        {assisted && !busy && (
          <NpsSurvey source="SUPPORT" question="How helpful was Jordyn just now?" />
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--ke-dark-hairline)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Jordyn…"
          maxLength={1500}
          style={{
            flex: 1,
            height: 42,
            padding: '0 14px',
            borderRadius: 999,
            border: '1px solid var(--ke-dark-hairline)',
            background: 'rgba(255,255,255,.05)',
            color: 'var(--ke-dark-text)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={busy || !input.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: 'none',
            cursor: busy || !input.trim() ? 'default' : 'pointer',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy || !input.trim() ? 0.5 : 1,
          }}
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: ReactNode }) {
  const isUser = role === 'user'
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: 14,
        fontSize: 14,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        background: isUser ? 'var(--color-primary)' : 'rgba(255,255,255,.06)',
        color: isUser ? '#fff' : 'var(--ke-dark-text)',
        borderBottomRightRadius: isUser ? 4 : 14,
        borderBottomLeftRadius: isUser ? 14 : 4,
      }}
    >
      {children}
    </div>
  )
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', height: 14 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--ke-dark-text-muted)',
            animation: `kePulse 1s ${i * 0.15}s var(--ease-standard) infinite`,
          }}
        />
      ))}
    </span>
  )
}
