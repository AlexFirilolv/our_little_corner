'use client'
import { useEffect, useState } from 'react'
import { Upload, Trash2, Download, FileText } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { DocumentRecord, DocumentCategory } from '@/lib/types'

const categories: DocumentCategory[] = [
  'id',
  'insurance',
  'medical',
  'vehicle',
  'property',
  'financial',
  'pet',
  'other',
]

export default function DocumentsPage() {
  const { currentLocket } = useLocket()
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [filter, setFilter] = useState<DocumentCategory | 'all'>('all')
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/documents?locketId=${currentLocket.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setDocs((await res.json()).documents)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocket?.id])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentLocket) return
    setUploading(true)
    try {
      const token = await getCurrentUserToken()
      const sign = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          locketId: currentLocket.id,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      })
      if (!sign.ok) throw new Error('sign_failed')
      const { uploadUrl, gcs_key } = await sign.json()

      // Resumable 2-step: initiate, then PUT file to session URL
      const init = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'x-goog-resumable': 'start',
          'content-type': file.type || 'application/octet-stream',
        },
      })
      const session = init.headers.get('Location')
      if (!session) throw new Error('no_session')
      await fetch(session, { method: 'PUT', body: file })

      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          locketId: currentLocket.id,
          name: file.name,
          category: 'other',
          gcs_key,
          file_type: file.type || null,
          size_bytes: file.size,
        }),
      })
      await load()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/documents/${id}?locketId=${currentLocket.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  const download = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/documents/${id}/url?locketId=${currentLocket.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const { url } = await res.json()
      window.open(url, '_blank')
    }
  }

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.category === filter)

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Documents</h1>
        <label className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-body-sm font-medium cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading\u2026' : 'Upload'}
          <input type="file" className="hidden" onChange={onPick} disabled={uploading} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-caption border ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-caption border ${
              filter === c
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filtered.map((d) => (
          <li key={d.id} className="card-base p-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded bg-surface-amber/40 flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{d.name}</p>
              <p className="text-caption text-muted">
                {d.category}
                {d.expiry_date
                  ? ` \u00b7 expires ${new Date(d.expiry_date).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <button
              onClick={() => download(d.id)}
              className="text-faint hover:text-primary p-2"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => remove(d.id)}
              className="text-faint hover:text-primary p-2"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-muted text-center py-12">No documents.</li>
        )}
      </ul>
    </div>
  )
}
