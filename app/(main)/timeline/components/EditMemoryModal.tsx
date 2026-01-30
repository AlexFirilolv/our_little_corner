'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Calendar, MapPin, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocket } from '@/contexts/LocketContext';

interface MediaItem {
  id: string;
  storage_url: string;
  storage_key: string;
  filename: string;
  file_type: string;
  date_taken?: string;
  place_name?: string;
}

interface EditMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryId: string;
  initialTitle: string;
  initialDescription?: string;
  initialDate?: string;
  initialLocation?: string;
  mediaItems?: MediaItem[];
  onSaved?: () => void;
}

export function EditMemoryModal({
  isOpen,
  onClose,
  memoryId,
  initialTitle,
  initialDescription = '',
  initialDate,
  initialLocation = '',
  mediaItems = [],
  onSaved
}: EditMemoryModalProps) {
  const { currentLocket } = useLocket();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [date, setDate] = useState(initialDate || '');
  const [location, setLocation] = useState(initialLocation);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>(mediaItems);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      // Use initialDate, or fallback to first media item's date
      const effectiveDate = initialDate ||
        (mediaItems.length > 0 && mediaItems[0].date_taken
          ? mediaItems[0].date_taken.split('T')[0]
          : '');
      setDate(effectiveDate);
      // Use initialLocation, or fallback to first media item's place_name
      const effectiveLocation = initialLocation ||
        (mediaItems.length > 0 && mediaItems[0].place_name
          ? mediaItems[0].place_name
          : '');
      setLocation(effectiveLocation);
      setMedia(mediaItems);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialTitle, initialDescription, initialDate, initialLocation, mediaItems]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!currentLocket) return;
    setIsSaving(true);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: memoryId,
          locket_id: currentLocket.id,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          date_taken: date || undefined,
        })
      });

      if (!res.ok) throw new Error('Failed to save');

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentLocket) return;
    setIsDeleting(true);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups?id=${memoryId}&locket_id=${currentLocket.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete');

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !currentLocket) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      for (const file of files) {
        // Get presigned URL
        const presignRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type,
            fileSize: file.size
          })
        });

        if (!presignRes.ok) continue;
        const { uploadUrl, publicUrl, storageKey } = await presignRes.json();

        // Upload to GCS
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadRes.ok) continue;

        // Create media item
        await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            locket_id: currentLocket.id,
            memory_group_id: memoryId,
            filename: file.name,
            storage_key: storageKey,
            storage_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          })
        });
      }

      // Refresh and close
      onSaved?.();
    } catch (error) {
      console.error('Upload failed:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (mediaId: string) => {
    if (!currentLocket) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/media?id=${mediaId}&locket_id=${currentLocket.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setMedia(prev => prev.filter(m => m.id !== mediaId));
        onSaved?.();
      }
    } catch (error) {
      console.error('Remove photo failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1216] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-white/10">
          <h2 className="font-display text-xl text-[#181113] dark:text-white">Edit Memory</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Give this memory a title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Caption</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Add a caption..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Where was this?"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Photos</label>
            <div className="grid grid-cols-3 gap-2">
              {media.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  <img
                    src={item.storage_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemovePhoto(item.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Add</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleAddPhotos}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rose-100 dark:border-white/10 space-y-3">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 flex-1">Delete this memory?</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
