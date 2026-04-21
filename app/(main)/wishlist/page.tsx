'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { WishlistItem } from '@/lib/types'

type Tab = 'me' | 'partner' | 'shared'
type ForChoice = 'shared' | 'me' | 'partner'

export default function WishlistPage() {
  const { currentLocket } = useLocket()
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [tab, setTab] = useState<Tab>('shared')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    url: '',
    price: '',
    notes: '',
    for: 'shared' as ForChoice,
  })

  const load = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/wishlist?locketId=${currentLocket.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setItems(data.items ?? [])
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocket?.id])

  const filtered = items.filter((i) => {
    if (tab === 'me') return i.for_uid === user?.uid
    if (tab === 'partner') return i.for_uid !== null && i.for_uid !== user?.uid
    return i.for_uid === null
  })

  // Infer partner uid from existing items (only needed for surprise gifts)
  const inferPartnerUid = (): string | null => {
    if (!user) return null
    const fromAddedBy = items.find((i) => i.added_by !== user.uid)?.added_by
    if (fromAddedBy) return fromAddedBy
    const fromForUid = items.find((i) => i.for_uid && i.for_uid !== user.uid)?.for_uid
    return fromForUid ?? null
  }

  const save = async () => {
    if (!currentLocket || !draft.title.trim()) return
    const token = await getCurrentUserToken()
    let for_uid: string | null = null
    if (draft.for === 'me') for_uid = user?.uid ?? null
    else if (draft.for === 'partner') for_uid = inferPartnerUid()
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        locketId: currentLocket.id,
        title: draft.title.trim(),
        url: draft.url || undefined,
        price_cents: draft.price ? Math.round(parseFloat(draft.price) * 100) : undefined,
        notes: draft.notes || undefined,
        for_uid,
      }),
    })
    setDraft({ title: '', url: '', price: '', notes: '', for: 'shared' })
    setAdding(false)
    load()
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/wishlist/${id}?locketId=${currentLocket.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Wishlist</h1>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-body-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="flex gap-2 mb-6">
        {(['shared', 'me', 'partner'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-caption border ${
              tab === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted'
            }`}
          >
            {t === 'me' ? 'For me' : t === 'partner' ? 'For partner' : 'Shared'}
          </button>
        ))}
      </div>
      {adding && (
        <div className="card-base p-4 mb-4 space-y-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title"
            className="w-full bg-elevated border border-border rounded p-2 text-body-sm"
          />
          <input
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="URL (optional)"
            className="w-full bg-elevated border border-border rounded p-2 text-body-sm"
          />
          <input
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            placeholder="Price (optional)"
            className="w-full bg-elevated border border-border rounded p-2 text-body-sm"
          />
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
            className="w-full bg-elevated border border-border rounded p-2 text-body-sm"
            rows={2}
          />
          <select
            value={draft.for}
            onChange={(e) => setDraft({ ...draft, for: e.target.value as ForChoice })}
            className="w-full bg-elevated border border-border rounded p-2 text-body-sm"
          >
            <option value="shared">Shared</option>
            <option value="me">For me</option>
            <option value="partner">Surprise for partner</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={save}
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
        {filtered.map((i) => (
          <li key={i.id} className="card-base p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{i.title}</p>
              {i.price_cents !== null && (
                <p className="text-caption text-muted">${(i.price_cents / 100).toFixed(2)}</p>
              )}
              {i.url && (
                <a
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-primary hover:underline truncate block"
                >
                  {i.url}
                </a>
              )}
            </div>
            <button
              onClick={() => remove(i.id)}
              className="text-faint hover:text-primary p-2"
              aria-label="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-muted text-center py-12">Nothing here yet.</li>
        )}
      </ul>
    </div>
  )
}
