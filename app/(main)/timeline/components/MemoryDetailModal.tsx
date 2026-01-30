'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Calendar, MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface MemoryGroup {
    id: string;
    title?: string;
    description?: string;
    date_taken?: string;
    created_at: string;
    is_milestone?: boolean;
    media_items?: MediaItem[];
    creator_name?: string;
    creator_avatar_url?: string;
}

interface MemoryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    memory: MemoryGroup;
    onEdit?: () => void;
    onComment?: () => void;
    isLiked?: boolean;
    likeCount?: number;
    onLike?: () => void;
}

export function MemoryDetailModal({
    isOpen,
    onClose,
    memory,
    onEdit,
    onComment,
    isLiked = false,
    likeCount = 0,
    onLike
}: MemoryDetailModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const mediaItems = memory.media_items || [];

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    setCurrentIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1);
                    break;
                case 'ArrowRight':
                    setCurrentIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, mediaItems.length, onClose]);

    if (!isOpen) return null;

    const currentMedia = mediaItems[currentIndex];
    const hasMultiple = mediaItems.length > 1;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 text-white/70 hover:text-white transition-colors"
            >
                <X size={28} />
            </button>

            {/* Main content */}
            <div className="w-full h-full flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
                    {currentMedia ? (
                        <>
                            {currentMedia.file_type.startsWith('video/') ? (
                                <video
                                    src={currentMedia.storage_url}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                    controls
                                    autoPlay
                                />
                            ) : (
                                <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                                    <Image
                                        src={currentMedia.storage_url}
                                        alt={memory.title || 'Memory'}
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            )}

                            {/* Navigation arrows */}
                            {hasMultiple && (
                                <>
                                    <button
                                        onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1)}
                                        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0)}
                                        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="text-white/50 text-center">
                            <p>No media in this memory</p>
                        </div>
                    )}

                    {/* Thumbnail strip */}
                    {hasMultiple && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-xl p-2">
                            {mediaItems.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentIndex(index)}
                                    className={cn(
                                        "relative w-12 h-12 rounded-lg overflow-hidden transition-all",
                                        index === currentIndex
                                            ? "ring-2 ring-white ring-offset-2 ring-offset-black/50"
                                            : "opacity-50 hover:opacity-75"
                                    )}
                                >
                                    {item.file_type.startsWith('video/') ? (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-white">
                                            Video
                                        </div>
                                    ) : (
                                        <Image
                                            src={item.storage_url}
                                            alt=""
                                            fill
                                            className="object-cover"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Sidebar */}
                <div className="w-full md:w-96 bg-white dark:bg-[#1a1216] p-6 overflow-y-auto">
                    {/* Creator */}
                    {memory.creator_name && (
                        <div className="flex items-center gap-3 mb-4">
                            {memory.creator_avatar_url ? (
                                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                                    <Image
                                        src={memory.creator_avatar_url}
                                        alt={memory.creator_name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-medium">
                                    {memory.creator_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-truffle dark:text-white">{memory.creator_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(memory.date_taken || memory.created_at)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    {memory.title && (
                        <h2 className="font-heading text-xl text-truffle dark:text-white mb-2">
                            {memory.title}
                        </h2>
                    )}

                    {/* Description */}
                    {memory.description && (
                        <p className="text-muted-foreground mb-4">
                            {memory.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6">
                        {(memory.date_taken || currentMedia?.date_taken) && (
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {formatDate(memory.date_taken || currentMedia?.date_taken)}
                            </span>
                        )}
                        {currentMedia?.place_name && (
                            <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {currentMedia.place_name}
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-rose-100 dark:border-white/10">
                        <button
                            onClick={onLike}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                                isLiked
                                    ? "bg-primary/10 text-primary"
                                    : "bg-gray-100 dark:bg-white/10 text-muted-foreground hover:text-primary"
                            )}
                        >
                            <Heart size={18} className={isLiked ? "fill-current" : ""} />
                            <span className="text-sm font-medium">{likeCount || 'Like'}</span>
                        </button>
                        <button
                            onClick={onComment}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-white/10 text-muted-foreground hover:text-truffle transition-colors"
                        >
                            <MessageCircle size={18} />
                            <span className="text-sm font-medium">Comment</span>
                        </button>
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="p-2 rounded-full bg-gray-100 dark:bg-white/10 text-muted-foreground hover:text-truffle transition-colors ml-auto"
                            >
                                <Pencil size={18} />
                            </button>
                        )}
                    </div>

                    {/* Image counter */}
                    {hasMultiple && (
                        <p className="text-center text-sm text-muted-foreground mt-4">
                            {currentIndex + 1} of {mediaItems.length} photos
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
