import { MessageCircle } from 'lucide-react'
import { whatsappChatUrl } from '@/lib/whatsapp'

/** "Chat on WhatsApp" — renders nothing until the business number is configured. */
export default function WhatsAppButton({ text, label = 'Chat on WhatsApp', style }: { text?: string; label?: string; style?: React.CSSProperties }) {
  const href = whatsappChatUrl(text)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 999, background: '#25d366', color: '#0b2b17', fontWeight: 700, fontSize: 14, textDecoration: 'none', ...style }}
    >
      <MessageCircle size={16} aria-hidden /> {label}
    </a>
  )
}
