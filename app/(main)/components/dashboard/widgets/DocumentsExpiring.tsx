'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, AlertTriangle } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { DocumentRecord } from '@/lib/types'

export function DocumentsExpiring({ locketId }: { locketId: string }) {
  const [expiring, setExpiring] = useState<DocumentRecord[]>([])

  useEffect(() => {
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/documents?locketId=${locketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const { documents } = (await res.json()) as { documents: DocumentRecord[] }
      const cutoff = Date.now() + 30 * 24 * 3600 * 1000
      setExpiring(
        documents.filter(
          (d) => d.expiry_date && new Date(d.expiry_date).getTime() <= cutoff,
        ),
      )
    })()
  }, [locketId])

  if (expiring.length === 0) return null

  return (
    <Link
      href="/documents"
      className="card-base p-5 block hover:bg-foreground/5 transition animate-fade-in"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" /> Documents
        </div>
        <span className="inline-flex items-center gap-1 text-caption text-primary">
          <AlertTriangle className="w-3 h-3" />
          {expiring.length} expiring
        </span>
      </div>
      <ul className="space-y-1">
        {expiring.slice(0, 3).map((d) => (
          <li key={d.id} className="text-body-sm text-foreground truncate">
            {'\u2022'} {d.name}{' '}
            <span className="text-caption text-muted">
              ({new Date(d.expiry_date!).toLocaleDateString()})
            </span>
          </li>
        ))}
      </ul>
    </Link>
  )
}
