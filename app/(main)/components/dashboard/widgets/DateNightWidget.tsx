'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, RotateCw } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import { dateIdeas } from '@/lib/data/date-night-ideas'
import type { DateNightPick } from '@/lib/types'

export function DateNightWidget({ locketId }: { locketId: string }) {
  const [savedPick, setSavedPick] = useState<DateNightPick | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/date-nights/picks?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const { picks } = await res.json()
      setSavedPick(picks.find((p: DateNightPick) => p.status === 'saved') ?? null)
    }
  }
  useEffect(() => { load() }, [locketId])

  const spin = async () => {
    setLoading(true)
    const idea = dateIdeas[Math.floor(Math.random() * dateIdeas.length)]
    const token = await getCurrentUserToken()
    await fetch('/api/date-nights/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId, idea_id: idea.id }),
    })
    await load()
    setLoading(false)
  }

  const idea = savedPick ? dateIdeas.find((i) => i.id === savedPick.idea_id) : null

  return (
    <div className="card-base p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Date night
        </div>
        <Link href="/date-nights" className="text-caption text-muted hover:text-foreground">All →</Link>
      </div>
      {idea ? (
        <div>
          <p className="font-display text-subheading text-foreground mb-2">{idea.title}</p>
          <p className="text-caption text-muted">{idea.vibe} · {idea.setting} · {idea.budget} · ~{idea.est_minutes} min</p>
          <button onClick={spin} disabled={loading} className="mt-4 inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline">
            <RotateCw className="w-3.5 h-3.5" /> Spin again
          </button>
        </div>
      ) : (
        <button onClick={spin} disabled={loading} className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium hover:brightness-110 disabled:opacity-50 transition">
          {loading ? 'Spinning…' : 'Spin a date night'}
        </button>
      )}
    </div>
  )
}
