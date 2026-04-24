'use client'
import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Check, Flame } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Chore } from '@/lib/types'

export default function ChoresPage() {
  const { currentLocket } = useLocket()
  const [chores, setChores] = useState<Chore[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', cadence_days: '7' })

  const load = useCallback(async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/chores?locketId=${currentLocket.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setChores((await res.json()).chores)
  }, [currentLocket])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (!currentLocket || !draft.name.trim()) return
    const cadence = parseInt(draft.cadence_days, 10)
    if (!Number.isFinite(cadence) || cadence <= 0) return
    const token = await getCurrentUserToken()
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        locketId: currentLocket.id,
        name: draft.name.trim(),
        cadence_days: cadence,
      }),
    })
    setDraft({ name: '', cadence_days: '7' })
    setAdding(false)
    load()
  }

  const complete = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/chores/${id}/complete?locketId=${currentLocket.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/chores/${id}?locketId=${currentLocket.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Chores</h1>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-body-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {adding && (
        <div className="card-base p-4 mb-4 space-y-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Chore name"
            className="w-full bg-elevated border border-border rounded p-2 text-body-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-muted">Every</span>
            <input
              value={draft.cadence_days}
              onChange={(e) => setDraft({ ...draft, cadence_days: e.target.value })}
              type="number"
              min={1}
              className="w-20 bg-elevated border border-border rounded p-2 text-body-sm"
            />
            <span className="text-body-sm text-muted">days</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded text-body-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 border border-border px-3 py-2 rounded text-body-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {chores.map((c) => (
          <li key={c.id} className="card-base p-4 flex items-center gap-3">
            <button
              onClick={() => complete(c.id)}
              className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition"
              aria-label="Mark done"
            >
              <Check className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{c.name}</p>
              <p className="text-caption text-muted">
                Due {new Date(c.next_due_at).toLocaleDateString()} · every {c.cadence_days}d
              </p>
            </div>
            {c.streak > 0 && (
              <span className="inline-flex items-center gap-1 text-caption text-accent">
                <Flame className="w-3 h-3" />
                {c.streak}
              </span>
            )}
            <button
              onClick={() => remove(c.id)}
              className="text-faint hover:text-primary p-2"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {chores.length === 0 && (
          <li className="text-muted text-center py-12">Add your first chore.</li>
        )}
      </ul>
    </div>
  )
}
