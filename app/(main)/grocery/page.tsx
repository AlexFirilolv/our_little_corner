'use client'
import { useCallback, useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { GroceryItem } from '@/lib/types'

export default function GroceryPage() {
  const { currentLocket } = useLocket()
  const [items, setItems] = useState<GroceryItem[]>([])
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/grocery?locketId=${currentLocket.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setItems((await res.json()).items)
  }, [currentLocket])

  useEffect(() => {
    load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentLocket || !name.trim()) return
    const token = await getCurrentUserToken()
    await fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId: currentLocket.id, name: name.trim() }),
    })
    setName('')
    load()
  }

  const toggle = async (id: string, checked: boolean) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/grocery/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId: currentLocket.id, checked }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/grocery/${id}?locketId=${currentLocket.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  const clearChecked = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch('/api/grocery/clear-checked', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId: currentLocket.id }),
    })
    load()
  }

  return (
    <div className="container mx-auto px-4 max-w-xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Grocery</h1>
        <button
          onClick={clearChecked}
          className="text-body-sm text-muted hover:text-primary"
        >
          Clear checked
        </button>
      </div>
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add item…"
          className="flex-1 bg-elevated border border-border rounded-lg p-3 text-body"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-4 rounded-lg"
          aria-label="Add"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2 border-b border-border">
            <input
              type="checkbox"
              checked={i.checked}
              onChange={(e) => toggle(i.id, e.target.checked)}
              className="w-5 h-5"
              aria-label={`Check ${i.name}`}
            />
            <span
              className={`flex-1 ${i.checked ? 'line-through text-faint' : 'text-foreground'}`}
            >
              {i.name}
              {i.qty ? ` (${i.qty})` : ''}
            </span>
            <button
              onClick={() => remove(i.id)}
              className="text-faint hover:text-primary p-1"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-muted text-center py-12">List is empty.</li>
        )}
      </ul>
    </div>
  )
}
