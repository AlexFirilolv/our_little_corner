'use client'
import { useEffect, useState } from 'react'
import { useLocket } from '@/contexts/LocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Gratitude } from '@/lib/types'

export default function GratitudePage() {
  const { currentLocket } = useLocket()
  const { user } = useAuth()
  const [items, setItems] = useState<Gratitude[]>([])

  useEffect(() => {
    if (!currentLocket) return
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/gratitudes?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setItems((await res.json()).gratitudes)
    })()
  }, [currentLocket?.id])

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8">
      <h1 className="font-display text-display text-foreground mb-6">Gratitude</h1>
      <ul className="space-y-3">
        {items.map((g) => {
          const mine = g.from_uid === user?.uid
          return (
            <li key={g.id} className={`card-base p-4 ${mine ? 'ml-12' : 'mr-12'}`}>
              <p className="text-body text-foreground">"{g.text}"</p>
              <p className="text-caption text-faint mt-2">
                {mine ? 'You' : 'Partner'} · {new Date(g.created_at).toLocaleDateString()}
              </p>
            </li>
          )
        })}
        {items.length === 0 && <li className="text-muted text-center py-12">Send your first gratitude from the home dashboard.</li>}
      </ul>
    </div>
  )
}
