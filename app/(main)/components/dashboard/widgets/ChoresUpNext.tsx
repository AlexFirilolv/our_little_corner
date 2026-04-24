'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, Check } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Chore } from '@/lib/types'

export function ChoresUpNext({ locketId }: { locketId: string }) {
  const [chores, setChores] = useState<Chore[]>([])

  const load = useCallback(async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/chores?locketId=${locketId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setChores((await res.json()).chores)
  }, [locketId])

  useEffect(() => {
    load()
  }, [load])

  const complete = async (id: string) => {
    const token = await getCurrentUserToken()
    await fetch(`/api/chores/${id}/complete?locketId=${locketId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  const top3 = chores.slice(0, 3)
  const tone = (due: string) => {
    const d = new Date(due).getTime() - Date.now()
    if (d < 0) return 'text-primary'
    if (d < 24 * 3600 * 1000) return 'text-accent'
    return 'text-muted'
  }

  return (
    <div className="card-base p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <CheckSquare className="w-3.5 h-3.5" /> Up next
        </div>
        <Link href="/chores" className="text-caption text-muted hover:text-foreground">
          All →
        </Link>
      </div>
      {top3.length === 0 ? (
        <p className="text-muted text-body-sm">
          No chores yet.{' '}
          <Link href="/chores" className="text-primary">
            Add one →
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {top3.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <button
                onClick={() => complete(c.id)}
                className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition"
                aria-label={`Mark ${c.name} done`}
              >
                <Check className="w-3 h-3 opacity-0 hover:opacity-100" />
              </button>
              <span className="flex-1 text-body-sm text-foreground truncate">{c.name}</span>
              <span className={`text-caption ${tone(c.next_due_at)}`}>
                {new Date(c.next_due_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
