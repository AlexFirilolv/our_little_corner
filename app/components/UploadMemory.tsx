'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useLocket } from '../contexts/LocketContext'
import {
  Upload as UploadIcon,
  X,
  Calendar as CalendarIcon,
  Smile,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UploadMemory({ isMilestone = false }: { isMilestone?: boolean }) {
  const { user } = useAuth()
  const { currentLocket } = useLocket()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null) // ... (rest of state)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mood, setMood] = useState('🙂')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) processFile(droppedFile)
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    setFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!file || !currentLocket) return

    setIsLoading(true)
    try {
      // 1. Get Presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size
        })
      })

      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl, storageKey } = await res.json()

      // 2. Upload to GCS
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!uploadRes.ok) throw new Error('Failed to upload file')

      // 3. Create Memory Group
      const groupRes = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (await import('@/lib/firebase/auth').then(m => m.getCurrentUserToken()))
        },
        body: JSON.stringify({
          locket_id: currentLocket.id,
          title: caption || (isMilestone ? 'New Milestone' : 'Untitled Memory'),
          description: `Uploaded on ${new Date().toLocaleDateString()}`,
          mood: mood,
          is_milestone: isMilestone // Pass the flag
        })
      })

      if (!groupRes.ok) throw new Error('Failed to create memory group')
      const { data: group } = await groupRes.json()

      // 4. Create Media Item linked to Group
      const mediaRes = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (await import('@/lib/firebase/auth').then(m => m.getCurrentUserToken()))
        },
        body: JSON.stringify({
          locket_id: currentLocket.id,
          memory_group_id: group.id,
          filename: file.name,
          storage_key: storageKey,
          storage_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          title: caption,
          date_taken: new Date(date)
        })
      })

      if (!mediaRes.ok) throw new Error('Failed to save media metadata')

      router.push('/timeline')

    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload memory. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentLocket) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Please select a Locket first.</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X className="w-6 h-6 text-[#181113] dark:text-white" />
        </button>
        <h1 className="font-display italic text-3xl text-[#181113] dark:text-white">Add a Memory</h1>
      </div>

      <div className="flex flex-col gap-8">

        {/* Dropzone / Preview */}
        <div
          className={`
            aspect-[4/3] rounded-2xl border-2 border-dashed transition-all relative overflow-hidden flex flex-col items-center justify-center cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-black/10 dark:border-white/10 hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5'}
            ${preview ? 'border-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !preview && fileInputRef.current?.click()}
        >
          {preview ? (
            <>
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="font-display text-xl text-[#181113] dark:text-white mb-2">Tap to upload</p>
              <p className="text-[#875e69] dark:text-[#dcb8c3] text-sm">or drag and drop here</p>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </div>

        {/* Details Form */}
        <div className="flex flex-col gap-6">

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-[#875e69] dark:text-[#dcb8c3] mb-2 font-display uppercase tracking-wider">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's the story behind this moment?"
              className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-4 text-lg font-sans placeholder:text-black/20 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none h-32"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-[#875e69] dark:text-[#dcb8c3] mb-2 font-display uppercase tracking-wider">Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-4 pl-12 text-lg font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-[#875e69] dark:text-[#dcb8c3] mb-2 font-display uppercase tracking-wider">Vibe</label>
              <div className="flex gap-2">
                {['😴', '😐', '🙂', '🥰', '🤩'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`
                        flex-1 aspect-square rounded-xl text-2xl flex items-center justify-center border transition-all
                        ${mood === m
                        ? 'bg-primary/10 border-primary shadow-inner scale-95'
                        : 'bg-white dark:bg-[#2a1d21] border-black/10 dark:border-white/10 hover:border-primary/50'}
                      `}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Submit */}
        <Button
          onClick={handleUpload}
          disabled={!file || isLoading}
          className="h-16 text-lg font-medium rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5 mr-2" />
              Add to Locket
            </>
          )}
        </Button>

      </div>
    </div>
  )
}