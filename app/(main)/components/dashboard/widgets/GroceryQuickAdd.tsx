'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Plus } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { GroceryItem } from '@/lib/types'

export function GroceryQuickAdd({ locketId }: { locketId: string }) {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/grocery?locketId=${locketId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setItems((await res.json()).items)
  }, [locketId])

  useEffect(() => {
    load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const token = await getCurrentUserToken()
    await fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId, name: name.trim() }),
    })
    setName('')
    load()
  }

  const unchecked = items.filter((i) => !i.checked)

  return (
    <div className="card-base p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <ShoppingCart className="w-3.5 h-3.5" /> Grocery
        </div>
        <Link href="/grocery" className="text-caption text-muted hover:text-foreground">
          {unchecked.length} open →
        </Link>
      </div>
      <ul className="space-y-1 mb-3">
        {unchecked.slice(0, 3).map((i) => (
          <li key={i.id} className="text-body-sm text-foreground truncate">
            • {i.name}
            {i.qty ? ` (${i.qty})` : ''}
          </li>
        ))}
        {unchecked.length === 0 && <li className="text-caption text-muted">List is empty.</li>}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add item…"
          className="flex-1 bg-elevated border border-border rounded p-2 text-body-sm"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-3 rounded text-body-sm"
          aria-label="Add"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
