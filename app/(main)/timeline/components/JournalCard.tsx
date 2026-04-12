'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocket } from '@/contexts/LocketContext';
import { Heart, MessageCircle, Share2, MapPin, Calendar, MoreHorizontal, Pencil, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

interface MediaItem {
    id: string;
    storage_url: string;
    file_type: string;
}

interface JournalCardProps {
    id: string;
    date: string;
    location?: string;
    imageUrl?: string;
    videoUrl?: string;
    caption: string;
    likes?: number;
    isLiked?: boolean;
    comments?: number;
    className?: string;
    align?: 'left' | 'right';
    authorAvatarUrl?: string;
    mediaItems?: MediaItem[];
    onEdit?: () => void;
    onComment?: () => void;
    onImageClick?: () => void;
    onLikeChange?: (liked: boolean, count: number) => void;
}

export function JournalCard({
    id,
    date,
    location,
    imageUrl,
    videoUrl,
    caption,
    likes = 0,
    isLiked: initialIsLiked = false,
    comments = 0,
    className,
    align = 'left',
    authorAvatarUrl,
    mediaItems = [],
    onEdit,
    onComment,
    onImageClick,
    onLikeChange
}: JournalCardProps) {
    const { currentLocket } = useLocket();
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [likeCount, setLikeCount] = useState(likes);
    const [showMenu, setShowMenu] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLiking, setIsLiking] = useState(false);
    const [likeLoaded, setLikeLoaded] = useState(false);

    const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const lastInteractionRef = useRef<number>(Date.now());

    const allMedia = mediaItems.length > 0
        ? mediaItems
        : imageUrl
            ? [{ id: '0', storage_url: imageUrl, file_type: 'image/jpeg' }]
            : [];

    const hasMultipleImages = allMedia.length > 1;

    useEffect(() => {
        if (!currentLocket || likeLoaded) return;

        const fetchLikeStatus = async () => {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/memory-groups/${id}/like?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setIsLiked(data.liked);
                    setLikeCount(data.likeCount);
                }
            } catch (error) {
                console.error('Failed to fetch like status:', error);
            } finally {
                setLikeLoaded(true);
            }
        };

        fetchLikeStatus();
    }, [id, currentLocket, likeLoaded]);

    useEffect(() => {
        if (autoAdvanceEnabled || !hasMultipleImages) return;

        const checkInterval = setInterval(() => {
            const timeSinceInteraction = Date.now() - lastInteractionRef.current;
            if (timeSinceInteraction >= 30000) {
                setAutoAdvanceEnabled(true);
            }
        }, 5000);

        return () => clearInterval(checkInterval);
    }, [autoAdvanceEnabled, hasMultipleImages]);

    useEffect(() => {
        if (!hasMultipleImages || !autoAdvanceEnabled) return;

        const advanceSlide = () => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentImageIndex(prev => (prev + 1) % allMedia.length);
                setIsAnimating(false);
            }, 300);
        };

        const interval = setInterval(advanceSlide, 5000);
        return () => clearInterval(interval);
    }, [hasMultipleImages, allMedia.length, autoAdvanceEnabled]);

    const handleManualNavigation = useCallback((newIndex: number) => {
        lastInteractionRef.current = Date.now();
        setAutoAdvanceEnabled(false);
        setCurrentImageIndex(newIndex);
    }, []);

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleManualNavigation(currentImageIndex === 0 ? allMedia.length - 1 : currentImageIndex - 1);
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleManualNavigation((currentImageIndex + 1) % allMedia.length);
    };

    const handleDotClick = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        handleManualNavigation(index);
    };

    const handleLike = async () => {
        if (!currentLocket || isLiking) return;

        setIsLiking(true);
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const res = await fetch(`/api/memory-groups/${id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ locket_id: currentLocket.id })
            });

            if (res.ok) {
                const data = await res.json();
                setIsLiked(data.liked);
                setLikeCount(data.likeCount);
                onLikeChange?.(data.liked, data.likeCount);
            } else {
                setIsLiked(!newLiked);
                setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            setIsLiked(!newLiked);
            setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
        } finally {
            setIsLiking(false);
        }
    };

    const currentMedia = allMedia[currentImageIndex];

    return (
        <div className={cn("group w-full max-w-2xl", className)}>
            <div className="card-base overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 pb-3">
                    <div className="flex items-center gap-3 text-caption text-muted font-medium">
                        {authorAvatarUrl && (
                            <div className="relative w-6 h-6">
                                <Image
                                    src={authorAvatarUrl}
                                    alt="User"
                                    fill
                                    className="rounded-full object-cover border border-border"
                                />
                            </div>
                        )}
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {date}
                        </span>
                        {location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[120px]">{location}</span>
                            </span>
                        )}
                    </div>

                    {onEdit && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <MoreHorizontal className="w-4 h-4 text-muted" />
                            </button>

                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-full mt-1 bg-elevated rounded-xl shadow-lg border border-border py-1 z-20 min-w-[120px]">
                                        <button
                                            onClick={() => { setShowMenu(false); onEdit?.(); }}
                                            className="w-full px-3 py-2 text-left text-body-sm text-foreground hover:bg-foreground/5 flex items-center gap-2"
                                        >
                                            <Pencil className="w-4 h-4" />
                                            Edit
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Media */}
                <div
                    className="relative aspect-[4/3] w-full overflow-hidden bg-background cursor-pointer"
                    onClick={onImageClick}
                >
                    {currentMedia ? (
                        <>
                            {currentMedia.file_type.startsWith('video/') ? (
                                <video
                                    src={currentMedia.storage_url}
                                    className="w-full h-full object-cover"
                                    muted loop playsInline
                                />
                            ) : (
                                <Image
                                    src={currentMedia.storage_url}
                                    alt="Memory"
                                    fill
                                    className={cn(
                                        "object-cover transition-all duration-500 group-hover:scale-105",
                                        hasMultipleImages && isAnimating && "translate-x-2 opacity-80"
                                    )}
                                />
                            )}

                            {hasMultipleImages && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-foreground/40 hover:bg-foreground/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-foreground/40 hover:bg-foreground/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                        {allMedia.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={(e) => handleDotClick(e, index)}
                                                className={cn(
                                                    "h-2 rounded-full transition-all duration-200",
                                                    index === currentImageIndex
                                                        ? "bg-white w-4"
                                                        : "bg-white/50 hover:bg-white/75 w-2"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    <div className="absolute top-3 right-3 text-white text-caption px-2 py-1 rounded-full z-10 bg-foreground/40">
                                        {currentImageIndex + 1}/{allMedia.length}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-faint bg-background">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                    )}
                </div>

                {/* Caption */}
                {caption && (
                    <p className="text-body text-foreground/80 leading-relaxed px-4 pt-3 pb-1">
                        {caption}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-2">
                    <div className="flex gap-4">
                        <button
                            onClick={handleLike}
                            disabled={isLiking}
                            className={cn(
                                "flex items-center gap-1 transition-all",
                                isLiked ? "text-primary" : "text-muted hover:text-primary"
                            )}
                        >
                            <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                            {likeCount > 0 && (
                                <span className="text-caption font-medium">{likeCount}</span>
                            )}
                        </button>
                        <button
                            onClick={onComment}
                            className="flex items-center gap-1 text-muted hover:text-foreground transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            {comments > 0 && <span className="text-caption font-medium">{comments}</span>}
                        </button>
                    </div>
                    <button className="text-muted hover:text-foreground transition-colors">
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
