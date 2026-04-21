'use client'
import { useEffect, useState } from 'react'
import { HeartHandshake, Send } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Gratitude } from '@/lib/types'

export function GratitudeWidget({ locketId, currentUid }: { locketId: string; currentUid: string }) {
  const [items, setItems] = useState<Gratitude[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/gratitudes?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setItems((await res.json()).gratitudes)
  }
  useEffect(() => { load() }, [locketId])

  const partnerLatest = items.find((g) => g.to_uid === currentUid)
  const hasUnseen = partnerLatest && !partnerLatest.seen_at

  useEffect(() => {
    if (!hasUnseen || !partnerLatest) return
    ;(async () => {
      const token = await getCurrentUserToken()
      await fetch(`/api/gratitudes/${partnerLatest.id}/seen`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    })()
  }, [hasUnseen, partnerLatest?.id])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const token = await getCurrentUserToken()
    const res = await fetch('/api/gratitudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId, text: text.trim() }),
    })
    setSending(false)
    if (res.ok) { setText(''); load() }
  }

  return (
    <div className={`card-base p-5 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in ${hasUnseen ? 'ring-2 ring-primary/30' : ''}`}>
      <div>
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider mb-2">
          <HeartHandshake className="w-3.5 h-3.5" /> Gratitude
        </div>
        {partnerLatest ? (
          <p className="text-foreground text-body leading-relaxed">"{partnerLatest.text}"</p>
        ) : (
          <p className="text-muted text-body-sm">Nothing yet — be the first to send one.</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          placeholder="One thing you appreciated today…"
          className="w-full bg-elevated border border-border rounded-lg p-3 text-body-sm text-foreground placeholder:text-faint focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          rows={3}
          aria-label="Write a gratitude"
        />
        <div className="flex justify-between items-center">
          <span className="text-caption text-faint">{text.length}/280</span>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-body-sm font-medium hover:brightness-110 disabled:opacity-50 transition"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
