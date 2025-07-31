"use client"

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  Heart,
  Calendar,
  FileText,
  Check,
  AlertCircle
} from 'lucide-react'
import RichTextEditor from './RichTextEditor'

interface FileWithPreview extends File {
  preview?: string
  id: string
}

interface UploadProgress {
  [fileId: string]: {
    progress: number
    status: 'uploading' | 'processing' | 'completed' | 'error'
    error?: string
  }
}

export default function UploadForm() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dateTaken, setDateTaken] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    
    const newFiles = selectedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      fileWithPreview.id = Math.random().toString(36).substring(2, 15)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      
      return fileWithPreview
    })
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
    
    // Remove progress tracking
    setUploadProgress(prev => {
      const updated = { ...prev }
      delete updated[fileId]
      return updated
    })
  }

  const uploadFile = async (file: FileWithPreview): Promise<void> => {
    const fileId = file.id
    
    try {
      // Update progress to uploading
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 0, status: 'uploading' }
      }))

      // Get presigned URL
      const presignedResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      })

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, key, fileUrl } = await presignedResponse.json()

      // Upload file to S3
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 50, status: 'uploading' }
      }))

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Create media record in database
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 80, status: 'processing' }
      }))

      const mediaResponse = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          original_name: file.name,
          s3_key: key,
          s3_url: fileUrl,
          file_type: file.type,
          file_size: file.size,
          title: title || undefined,
          note: note || undefined,
          date_taken: dateTaken ? new Date(dateTaken).toISOString() : undefined,
        }),
      })

      if (!mediaResponse.ok) {
        throw new Error('Failed to save media record')
      }

      // Mark as completed
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 100, status: 'completed' }
      }))

    } catch (error) {
      console.error('Upload error:', error)
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { 
          progress: 0, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (files.length === 0) {
      alert('Please select at least one file to upload.')
      return
    }

    setIsUploading(true)

    try {
      // Upload all files concurrently
      await Promise.all(files.map(file => uploadFile(file)))
      
      // Reset form after successful upload
      setFiles([])
      setTitle('')
      setNote('')
      setDateTaken('')
      setUploadProgress({})
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Refresh the page to show new uploads
      window.location.reload()
      
    } catch (error) {
      console.error('Batch upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) {
      return <Video className="h-6 w-6 text-purple-600" />
    }
    return <ImageIcon className="h-6 w-6 text-blue-600" />
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-romantic text-primary">
            <Upload className="h-5 w-5" />
            Select Files
          </CardTitle>
          <CardDescription className="font-body">
            Choose photos and videos to add to your romantic gallery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-accent/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-romantic text-primary mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-muted-foreground font-body mb-4">
              Supports images (JPG, PNG, GIF, WebP, HEIC) and videos (MP4, MOV, WebM)
            </p>
            <Button type="button" variant="outline" className="font-body">
              Choose Files
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-body font-medium text-foreground">Selected Files:</h4>
              {files.map((file) => {
                const progress = uploadProgress[file.id]
                return (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                    {/* File preview/icon */}
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        getFileIcon(file.type)
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground font-body">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {/* Progress bar */}
                      {progress && (
                        <div className="mt-2">
                          <div className="w-full bg-accent/30 rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2 transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {progress.status === 'completed' && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                            {progress.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-xs text-muted-foreground font-body">
                              {progress.status === 'uploading' && 'Uploading...'}
                              {progress.status === 'processing' && 'Processing...'}
                              {progress.status === 'completed' && 'Completed'}
                              {progress.status === 'error' && (progress.error || 'Error')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    {!progress && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-romantic text-primary">
              <Heart className="h-5 w-5" />
              Memory Details
            </CardTitle>
            <CardDescription className="font-body">
              Add a title and date for your memory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title" className="font-body font-medium">
                Title (Optional)
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Our First Date, Beach Vacation..."
                className="romantic-input mt-1"
              />
            </div>

            <div>
              <Label htmlFor="date-taken" className="font-body font-medium">
                Date Taken (Optional)
              </Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date-taken"
                  type="datetime-local"
                  value={dateTaken}
                  onChange={(e) => setDateTaken(e.target.value)}
                  className="romantic-input pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rich Note */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-romantic text-primary">
              <FileText className="h-5 w-5" />
              Memory Note
            </CardTitle>
            <CardDescription className="font-body">
              Write a beautiful note about this memory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={note}
              onChange={setNote}
              placeholder="Share the story behind this memory... What made it special? How did it make you feel? 💖"
            />
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="romantic"
          size="lg"
          disabled={files.length === 0 || isUploading}
          className="min-w-[200px]"
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Upload Memory
              <Heart className="h-5 w-5" />
            </div>
          )}
        </Button>
      </div>
    </form>
  )
}