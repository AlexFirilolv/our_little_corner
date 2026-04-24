'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Clock } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { MemoryGroup } from '@/lib/types'
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal'

export function ReminisceWidget({ locketId }: { locketId: string }) {
  const [memories, setMemories] = useState<MemoryGroup[]>([])
  const [open, setOpen] = useState<MemoryGroup | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/reminisce?locketId=${locketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        console.warn('Reminisce fetch failed', res.status, res.statusText)
        return
      }
      if (cancelled) return
      const { memories } = await res.json()
      if (!cancelled) setMemories(memories)
    })()
    return () => { cancelled = true }
  }, [locketId])

  if (memories.length === 0) return null
  const top = memories[0]
  const yearsAgo = top.date_taken
    ? new Date().getFullYear() - new Date(top.date_taken).getFullYear()
    : 0
  const cover = top.media_items?.[0]?.storage_url

  return (
    <>
      <button
        onClick={() => setOpen(top)}
        className="card-base relative w-full h-40 overflow-hidden group text-left animate-fade-in"
        aria-label={`Reminisce: ${top.title}`}
      >
        {cover && (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated/90 backdrop-blur-sm border border-border text-caption font-bold text-accent">
          <Clock className="w-3 h-3" /> {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago today
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-display text-subheading text-foreground truncate">{top.title}</p>
        </div>
      </button>
      {open && (
        <MemoryDetailModal
          isOpen
          onClose={() => setOpen(null)}
          memory={{
            ...open,
            date_taken: open.date_taken ? String(open.date_taken) : undefined,
            created_at: String(open.created_at),
            media_items: open.media_items?.map((m) => ({ ...m, date_taken: m.date_taken ? String(m.date_taken) : undefined })),
          }}
          isLiked={false}
          likeCount={0}
          onLike={() => {}}
          onEdit={() => setOpen(null)}
          onComment={() => setOpen(null)}
        />
      )}
    </>
  )
}
