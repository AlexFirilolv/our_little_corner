'use client';

import Image from 'next/image';
import { Heart, MessageCircle, Share2, MapPin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalCardProps {
    date: string;
    location?: string;
    imageUrl?: string;
    videoUrl?: string;
    caption: string;
    likes?: number; // Representing partner's reaction
    comments?: number;
    className?: string;
    align?: 'left' | 'right';
    authorAvatarUrl?: string; // New
}

export function JournalCard({
    date,
    location,
    imageUrl,
    videoUrl,
    caption,
    likes = 0,
    comments = 0,
    className,
    align = 'left',
    authorAvatarUrl
}: JournalCardProps) {
    return (
        <div className={cn("group w-full max-w-md", className)}>
            <div
                className={cn(
                    "relative bg-white p-4 rounded-2xl shadow-sm border border-rose-100 transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                    // Add a subtle rotation based on alignment for a "scrapbook" feel
                    align === 'left' ? "-rotate-1" : "rotate-1"
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
                </div>

                {/* Media */}
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl mb-4 bg-muted">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt="Memory"
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : videoUrl ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Video Player Placeholder
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-rose-50/50">
                            <span className="text-xs">No Media</span>
                        </div>
                    )}
                </div>

                {/* Caption */}
                <p className="text-sm font-body text-truffle leading-relaxed mb-4">
                    {caption}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-rose-50">
                    <div className="flex space-x-4">
                        <button className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors hover:scale-110 active:scale-95">
                            <Heart size={20} className={likes > 0 ? "fill-primary text-primary" : ""} />
                            {likes > 0 && <span className="text-xs font-medium">{likes}</span>}
                        </button>
                        <button className="flex items-center space-x-1 text-muted-foreground hover:text-truffle transition-colors hover:scale-110 active:scale-95">
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
