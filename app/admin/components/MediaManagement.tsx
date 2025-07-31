"use client"

import { useState } from 'react'
import Image from 'next/image'
import { MediaItem } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Edit3, 
  Trash2, 
  Eye,
  Image as ImageIcon,
  Video,
  Calendar,
  FileText,
  Save,
  X,
  AlertTriangle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import RichTextEditor from './RichTextEditor'

interface MediaManagementProps {
  mediaItems: MediaItem[]
}

interface EditingItem {
  id: string
  title: string
  note: string
  date_taken: string
}

export default function MediaManagement({ mediaItems }: MediaManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filter media based on search
  const filteredMedia = mediaItems.filter(media =>
    media.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    media.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    media.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (media: MediaItem) => {
    setEditingItem({
      id: media.id,
      title: media.title || '',
      note: media.note || '',
      date_taken: media.date_taken ? new Date(media.date_taken).toISOString().slice(0, 16) : '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          title: editingItem.title || undefined,
          note: editingItem.note || undefined,
          date_taken: editingItem.date_taken ? new Date(editingItem.date_taken).toISOString() : undefined,
        }),
      })

      if (response.ok) {
        // Refresh the page to show updates
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to update: ${error.error}`)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update media item')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/media?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the page to show updates
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to delete: ${error.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete media item')
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search memories by title, note, or filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 romantic-input"
        />
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-romantic text-primary mb-2">
              {searchTerm ? 'No matching memories found' : 'No memories to manage'}
            </h3>
            <p className="text-muted-foreground font-body">
              {searchTerm ? 'Try adjusting your search terms.' : 'Upload some memories first!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedia.map((media) => (
            <Card key={media.id} className="overflow-hidden">
              {/* Media Preview */}
              <div className="relative aspect-video bg-accent/10">
                {media.file_type.startsWith('image/') ? (
                  <Image
                    src={media.s3_url}
                    alt={media.title || media.original_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-12 w-12 text-primary/40" />
                  </div>
                )}
                
                {/* Media type indicator */}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1">
                  {media.file_type.startsWith('video/') ? (
                    <Video className="h-4 w-4 text-white" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>

              <CardContent className="p-4">
                {editingItem?.id === media.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-body font-medium mb-1 block">Title</label>
                      <Input
                        value={editingItem.title}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                        placeholder="Enter title..."
                        className="romantic-input"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-body font-medium mb-1 block">Date Taken</label>
                      <Input
                        type="datetime-local"
                        value={editingItem.date_taken}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, date_taken: e.target.value } : null)}
                        className="romantic-input"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-body font-medium mb-1 block">Note</label>
                      <RichTextEditor
                        value={editingItem.note}
                        onChange={(value) => setEditingItem(prev => prev ? { ...prev, note: value } : null)}
                        placeholder="Add a note about this memory..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isLoading}
                        className="flex-1 font-body"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="font-body"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-3">
                    {/* Title */}
                    <h3 className="font-romantic text-lg text-primary line-clamp-2">
                      {media.title || media.original_name}
                    </h3>

                    {/* Metadata */}
                    <div className="space-y-2 text-sm text-muted-foreground font-body">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {media.date_taken 
                            ? new Date(media.date_taken).toLocaleDateString()
                            : `Added ${formatDistanceToNow(new Date(media.created_at), { addSuffix: true })}`
                          }
                        </span>
                      </div>
                      <div>
                        <strong>Size:</strong> {formatFileSize(media.file_size)}
                      </div>
                      {media.width && media.height && (
                        <div>
                          <strong>Dimensions:</strong> {media.width} × {media.height}
                        </div>
                      )}
                    </div>

                    {/* Note preview */}
                    {media.note && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div 
                          className="text-sm text-foreground/80 font-body line-clamp-3"
                          dangerouslySetInnerHTML={{ 
                            __html: (media.note || '').replace(/<[^>]*>/g, '').substring(0, 100) + ((media.note || '').length > 100 ? '...' : '')
                          }} 
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(media.s3_url, '_blank')}
                        className="flex-1 font-body"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(media)}
                        className="flex-1 font-body"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(media.id)}
                        disabled={deletingId === media.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 font-body"
                      >
                        {deletingId === media.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}