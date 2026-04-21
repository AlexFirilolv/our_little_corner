'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { WishlistItem } from '@/lib/types'

export function WishlistPeek({ locketId }: { locketId: string }) {
  const [items, setItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/wishlist?locketId=${locketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!cancelled && res.ok) {
        const data = await res.json()
        setItems(data.items ?? [])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locketId])

  return (
    <Link
      href="/wishlist"
      className="card-base p-5 block hover:bg-foreground/5 transition animate-fade-in"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <Gift className="w-3.5 h-3.5" /> Wishlist
        </div>
        <span className="text-caption text-faint">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-body-sm">
          Add things you want — or surprise gifts for your partner.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 3).map((i) => (
            <li key={i.id} className="text-body-sm text-foreground truncate">
              • {i.title}
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
