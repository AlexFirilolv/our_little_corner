'use client';

import Image from 'next/image';
import { Heart, MessageCircle, Share2, MapPin, Calendar, MoreHorizontal, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocket } from '@/contexts/LocketContext';

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

    // Slideshow state
    const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const lastInteractionRef = useRef<number>(Date.now());
    const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use mediaItems if provided, otherwise fallback to single imageUrl
    const allMedia = mediaItems.length > 0
        ? mediaItems
        : imageUrl
            ? [{ id: '0', storage_url: imageUrl, file_type: 'image/jpeg' }]
            : [];

    const hasMultipleImages = allMedia.length > 1;

    // Fetch like status on mount
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

    // Re-enable auto-advance after 30 seconds of no interaction
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

    // Auto-advance slideshow with subtle animation hint
    useEffect(() => {
        if (!hasMultipleImages || !autoAdvanceEnabled) return;

        const advanceSlide = () => {
            // Trigger animation hint before changing
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

        // Optimistic update
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
                // Revert on error
                setIsLiked(!newLiked);
                setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // Revert on error
            setIsLiked(!newLiked);
            setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
        } finally {
            setIsLiking(false);
        }
    };

    const currentMedia = allMedia[currentImageIndex];

    return (
        <div className={cn("group w-full max-w-md", className)}>
            <div
                className={cn(
                    "relative bg-white p-4 rounded-2xl shadow-sm border border-rose-100 transition-all duration-500",
                    "hover:shadow-lg hover:shadow-rose-100/50",
                    "hover:-translate-y-1",
                    align === 'left' ? "-rotate-1 hover:rotate-0" : "rotate-1 hover:rotate-0"
                )}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground font-medium">
                        {authorAvatarUrl && (
                            <div className="relative w-6 h-6 mr-1">
                                <Image
                                    src={authorAvatarUrl}
                                    alt="User"
                                    fill
                                    className="rounded-full object-cover border border-rose-100"
                                />
                            </div>
                        )}
                        <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {date}
                        </span>
                        {location && (
                            <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {location}
                            </span>
                        )}
                    </div>

                    {/* Edit Menu */}
                    {onEdit && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 rounded-full hover:bg-black/5 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-rose-100 py-1 z-20 min-w-[120px]">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onEdit?.();
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-rose-50 flex items-center gap-2"
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

                {/* Media with Slideshow */}
                <div
                    className="relative aspect-[4/5] w-full overflow-hidden rounded-xl mb-4 bg-muted cursor-pointer"
                    onClick={onImageClick}
                >
                    {currentMedia ? (
                        <>
                            {currentMedia.file_type.startsWith('video/') ? (
                                <video
                                    src={currentMedia.storage_url}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                />
                            ) : (
                                <Image
                                    src={currentMedia.storage_url}
                                    alt="Memory"
                                    fill
                                    className={cn(
                                        "object-cover transition-all duration-700 group-hover:scale-105",
                                        // Subtle horizontal shift animation hint for slideshow
                                        hasMultipleImages && isAnimating && "translate-x-2 opacity-80"
                                    )}
                                />
                            )}

                            {/* Slideshow Controls */}
                            {hasMultipleImages && (
                                <>
                                    {/* Subtle pulsing glow on edges to hint at more content */}
                                    <div className={cn(
                                        "absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white/20 to-transparent pointer-events-none transition-opacity duration-1000",
                                        autoAdvanceEnabled ? "opacity-100 animate-pulse" : "opacity-0"
                                    )} />

                                    {/* Previous/Next buttons */}
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <ChevronRight size={18} />
                                    </button>

                                    {/* Dots indicator */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                        {allMedia.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={(e) => handleDotClick(e, index)}
                                                className={cn(
                                                    "h-2 rounded-full transition-all duration-300",
                                                    index === currentImageIndex
                                                        ? "bg-white w-4"
                                                        : "bg-white/50 hover:bg-white/75 w-2"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    {/* Image count badge with auto-advance indicator */}
                                    <div className={cn(
                                        "absolute top-3 right-3 text-white text-xs px-2 py-1 rounded-full z-10 flex items-center gap-1.5",
                                        autoAdvanceEnabled ? "bg-black/50" : "bg-black/70"
                                    )}>
                                        {!autoAdvanceEnabled && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/70" title="Auto-advance paused" />
                                        )}
                                        {currentImageIndex + 1}/{allMedia.length}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-rose-50/50">
                            <span className="text-xs">No Media</span>
                        </div>
                    )}
                </div>

                {/* Caption */}
                {caption && (
                    <p className="text-sm font-body text-truffle leading-relaxed mb-4">
                        {caption}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-rose-50">
                    <div className="flex space-x-4">
                        <button
                            onClick={handleLike}
                            disabled={isLiking}
                            className={cn(
                                "flex items-center space-x-1 transition-all hover:scale-110 active:scale-95",
                                isLiked ? "text-primary" : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            <Heart
                                size={20}
                                className={cn(
                                    "transition-all duration-300",
                                    isLiked && "fill-primary"
                                )}
                            />
                            {likeCount > 0 && (
                                <span className="text-xs font-medium">{likeCount}</span>
                            )}
                        </button>
                        <button
                            onClick={onComment}
                            className="flex items-center space-x-1 text-muted-foreground hover:text-truffle transition-colors hover:scale-110 active:scale-95"
                        >
                            <MessageCircle size={20} />
                            {comments > 0 && <span className="text-xs font-medium">{comments}</span>}
                        </button>
                    </div>
                    <button className="text-muted-foreground hover:text-truffle transition-colors">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
