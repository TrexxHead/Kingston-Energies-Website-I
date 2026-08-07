'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { keFontVariables } from './fonts'
import './tokens.css'

interface AuthShellProps {
  eyebrow?: string
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      className={`${keFontVariables} ke-root`}
      style={{
        fontFamily: 'var(--font-body)',
        minHeight: '100vh',
        background: 'var(--ke-dark-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow — same brand-green/blue radial used behind the homepage
          hero, so the auth pages read as the same site rather than a
          generic dark-mode template. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 640,
          height: 640,
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(147,201,63,.16) 0%, rgba(41,171,226,.07) 40%, transparent 68%)',
          filter: 'blur(46px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(155deg, rgba(255,255,255,.06), var(--ke-dark-card))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--ke-dark-hairline)',
          borderRadius: 24,
          boxShadow: 'var(--shadow-xl)',
          padding: 40,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <Shield size={24} color="#fff" />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '.22em',
            color: 'var(--ke-dark-text-muted)',
            marginTop: 18,
          }}
        >
          KINGSTON&nbsp;ENERGIES
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: '-.02em',
            color: 'var(--ke-dark-text)',
            margin: '8px 0 0',
          }}
        >
          {title}
        </h1>

        <p style={{ fontSize: 13.5, color: 'var(--ke-dark-text-muted)', marginTop: 8 }}>{subtitle}</p>

        <div style={{ marginTop: 24, textAlign: 'left' }}>{children}</div>

        <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ke-dark-text-muted)' }}>{footer}</div>

        <Link
          href="/"
          style={{
            display: 'block',
            marginTop: 16,
            fontSize: 12.5,
            color: 'var(--ke-dark-text-muted)',
          }}
        >
          ← Back to kingstonenergies.com
        </Link>
      </div>
    </div>
  )
}
