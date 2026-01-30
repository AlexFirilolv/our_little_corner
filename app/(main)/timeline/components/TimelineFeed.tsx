'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { HelixLine } from '@/components/HelixLine';
import { JournalCard } from './JournalCard';
import { LoveNoteCard } from './LoveNoteCard';
import { EditMemoryModal } from './EditMemoryModal';
import { CommentsPanel } from './CommentsPanel';
import { MemoryDetailModal } from './MemoryDetailModal';
import { Clock, Loader2 } from 'lucide-react';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface MediaItem {
    id: string;
    storage_url: string;
    storage_key: string;
    filename: string;
    file_type: string;
    date_taken?: string;
    place_name?: string;
    latitude?: number;
    longitude?: number;
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

type JournalItem = {
    id: string;
    type: 'journal';
    date: string;
    location?: string;
    imageUrl?: string;
    videoUrl?: string;
    caption: string;
    likes: number;
    isLiked: boolean;
    comments?: number;
    authorName?: string;
    authorAvatarUrl?: string;
    mediaItems: MediaItem[];
    rawGroup: MemoryGroup;
};

type NoteItem = {
    id: string;
    type: 'note';
    date: string;
    authorInitial?: string;
    authorName?: string;
    authorAvatarUrl?: string;
    note: string;
    rawGroup: MemoryGroup;
};

type TimelineItem = JournalItem | NoteItem;

interface LocketMember {
    id: string;
    display_name?: string;
    avatar_url?: string;
    firebase_uid: string;
}

export function TimelineFeed() {
    const { currentLocket } = useLocket();
    const { user } = useAuth();
    const [items, setItems] = React.useState<TimelineItem[]>([]);
    const [members, setMembers] = React.useState<LocketMember[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Modal state
    const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
    const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
    const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
    const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });

    const fetchData = React.useCallback(async () => {
        if (!currentLocket || !user) return;

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const [membersRes, timelineRes, likesRes] = await Promise.all([
                fetch(`/api/lockets/${currentLocket.id}/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                // We'll batch fetch likes after we get memory groups
                Promise.resolve(null)
            ]);

            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setMembers(membersData.users || []);
            }

            if (timelineRes.ok) {
                const data = await timelineRes.json();
                const memoryGroups = data.memoryGroups || [];

                // Batch fetch likes for all memory groups
                const memoryIds = memoryGroups.map((g: MemoryGroup) => g.id);
                let likesMap = new Map<string, { liked: boolean; likeCount: number }>();

                if (memoryIds.length > 0) {
                    // For now, we'll get likes individually as we display
                    // In a real app, we'd have a batch endpoint
                }

                const mappedItems: TimelineItem[] = memoryGroups.map((group: MemoryGroup) => {
                    const hasMedia = group.media_items && group.media_items.length > 0;
                    const creatorName = group.creator_name || '';
                    const creatorAvatar = group.creator_avatar_url || '';
                    const authorInitial = creatorName ? creatorName.charAt(0).toUpperCase() : '?';

                    if (hasMedia) {
                        const firstMedia = group.media_items![0];
                        return {
                            id: group.id,
                            type: 'journal',
                            date: new Date(firstMedia.date_taken || group.date_taken || group.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }),
                            location: firstMedia.place_name,
                            imageUrl: firstMedia.storage_url,
                            caption: group.title || group.description || '',
                            likes: 0, // Will be fetched per card
                            isLiked: false,
                            comments: 0,
                            authorName: creatorName,
                            authorAvatarUrl: creatorAvatar,
                            mediaItems: group.media_items!,
                            rawGroup: group
                        } as JournalItem;
                    } else {
                        return {
                            id: group.id,
                            type: 'note',
                            date: new Date(group.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }),
                            authorInitial,
                            authorName: creatorName,
                            authorAvatarUrl: creatorAvatar,
                            note: group.description || group.title || 'No content',
                            rawGroup: group
                        } as NoteItem;
                    }
                });
                setItems(mappedItems);
            }
        } catch (err) {
            console.error("Error fetching timeline", err);
        } finally {
            setLoading(false);
        }
    }, [currentLocket, user]);

    React.useEffect(() => {
        if (currentLocket) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [currentLocket, fetchData]);

    const handleEditSaved = () => {
        fetchData(); // Refresh the timeline
    };

    const handleViewMemory = async (group: MemoryGroup) => {
        setViewingMemory(group);

        // Fetch like status for this memory
        if (currentLocket) {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/memory-groups/${group.id}/like?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
                }
            } catch (error) {
                console.error('Failed to fetch like status:', error);
            }
        }
    };

    const handleViewMemoryLike = async () => {
        if (!viewingMemory || !currentLocket) return;

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const res = await fetch(`/api/memory-groups/${viewingMemory.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ locket_id: currentLocket.id })
            });

            if (res.ok) {
                const data = await res.json();
                setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20 min-h-screen">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="relative w-full max-w-4xl mx-auto px-4 py-8 min-h-screen text-center">
                <HelixLine className="opacity-50" />
                <div className="relative z-10 pt-20">
                    <h1 className="font-heading text-3xl text-primary mt-4">Our Timeline</h1>
                    <p className="text-muted-foreground mt-4 mb-8">No memories found yet.</p>
                    <p>Time to make some memories!</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full max-w-4xl mx-auto px-4 py-8 min-h-screen">
            {/* Background Helix */}
            <HelixLine className="opacity-50" />

            {/* Header / Countdown Section */}
            <div className="flex flex-col items-center justify-center mb-16 pt-8 animate-fade-in">
                <div className="relative">
                    <div className="flex -space-x-4 mb-4">
                        {members.length > 0 ? (
                            members.slice(0, 2).map((member, index) => {
                                const colors = [
                                    { bg: 'bg-rose-200', text: 'text-rose-700' },
                                    { bg: 'bg-indigo-200', text: 'text-indigo-700' }
                                ];
                                const colorSet = colors[index % colors.length];
                                const initial = member.display_name?.charAt(0).toUpperCase() || '?';

                                return member.avatar_url ? (
                                    <div key={member.id} className="w-16 h-16 rounded-full border-4 border-background overflow-hidden relative">
                                        <Image
                                            src={member.avatar_url}
                                            alt={member.display_name || 'Partner'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        key={member.id}
                                        className={`w-16 h-16 rounded-full border-4 border-background ${colorSet.bg} flex items-center justify-center ${colorSet.text} font-heading text-xl`}
                                    >
                                        {initial}
                                    </div>
                                );
                            })
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full border-4 border-background bg-rose-200 flex items-center justify-center text-rose-700 font-heading text-xl">?</div>
                                <div className="w-16 h-16 rounded-full border-4 border-background bg-indigo-200 flex items-center justify-center text-indigo-700 font-heading text-xl">?</div>
                            </>
                        )}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-rose-100 flex items-center gap-1 whitespace-nowrap">
                        <Clock size={12} className="text-primary" />
                        <span className="text-[10px] font-bold text-truffle uppercase tracking-wide">Together Forever</span>
                    </div>
                </div>
                <h1 className="font-heading text-3xl md:text-4xl text-primary mt-4 text-center">Our Timeline</h1>
                <p className="text-muted-foreground mt-2 font-display text-sm tracking-wide">{currentLocket?.name || 'Us'}</p>
            </div>

            {/* Timeline Items */}
            <div className="space-y-12 md:space-y-24 relative z-10">
                {items.map((item, index) => {
                    const isEven = index % 2 === 0;
                    return (
                        <div
                            key={item.id}
                            className={`flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''} gap-8 md:gap-16`}
                            style={{
                                animation: `fadeSlideIn 0.6s ease-out ${index * 0.1}s both`
                            }}
                        >
                            {/* Content Card */}
                            <div className="w-full md:w-5/12 flex justify-center">
                                {item.type === 'journal' ? (
                                    <JournalCard
                                        id={item.id}
                                        date={item.date}
                                        location={item.location}
                                        imageUrl={item.imageUrl}
                                        caption={item.caption}
                                        likes={item.likes}
                                        isLiked={item.isLiked}
                                        comments={item.comments}
                                        authorAvatarUrl={item.authorAvatarUrl}
                                        mediaItems={item.mediaItems}
                                        align={isEven ? 'right' : 'left'}
                                        className="transform-gpu"
                                        onEdit={() => setEditingMemory(item.rawGroup)}
                                        onComment={() => setCommentingMemory({
                                            id: item.id,
                                            title: item.caption || 'Memory'
                                        })}
                                        onImageClick={() => handleViewMemory(item.rawGroup)}
                                    />
                                ) : (
                                    <LoveNoteCard
                                        {...item}
                                        align={isEven ? 'right' : 'left'}
                                        className="transform-gpu"
                                    />
                                )}
                            </div>

                            {/* Center Marker on Helix */}
                            <div className="hidden md:flex w-2/12 justify-center relative">
                                <div className="w-4 h-4 rounded-full bg-primary border-4 border-white shadow-md z-10 animate-pulse" />
                                <div className="absolute top-8 text-xs font-bold text-primary/50 bg-white/50 px-2 py-0.5 rounded-full">
                                    {item.date.split(',')[0]}
                                </div>
                            </div>

                            {/* Empty Space for Balance */}
                            <div className="hidden md:block w-5/12" />
                        </div>
                    );
                })}
            </div>

            {/* Load More Placeholder */}
            {items.length > 5 && (
                <div className="mt-20 flex justify-center pb-20">
                    <div className="h-10 w-1 rounded-full bg-gradient-to-b from-primary/50 to-transparent" />
                </div>
            )}

            {/* Edit Memory Modal */}
            {editingMemory && (
                <EditMemoryModal
                    isOpen={true}
                    onClose={() => setEditingMemory(null)}
                    memoryId={editingMemory.id}
                    initialTitle={editingMemory.title || ''}
                    initialDescription={editingMemory.description}
                    initialDate={editingMemory.date_taken ? editingMemory.date_taken.split('T')[0] : undefined}
                    mediaItems={editingMemory.media_items?.map(m => ({
                        id: m.id,
                        storage_url: m.storage_url,
                        storage_key: m.storage_key,
                        filename: m.filename,
                        file_type: m.file_type,
                        date_taken: m.date_taken,
                        place_name: m.place_name
                    }))}
                    onSaved={handleEditSaved}
                />
            )}

            {/* Comments Panel */}
            {commentingMemory && (
                <CommentsPanel
                    isOpen={true}
                    onClose={() => setCommentingMemory(null)}
                    memoryId={commentingMemory.id}
                    memoryTitle={commentingMemory.title}
                />
            )}

            {/* Memory Detail Modal */}
            {viewingMemory && (
                <MemoryDetailModal
                    isOpen={true}
                    onClose={() => setViewingMemory(null)}
                    memory={viewingMemory}
                    isLiked={viewingMemoryLike.isLiked}
                    likeCount={viewingMemoryLike.likeCount}
                    onLike={handleViewMemoryLike}
                    onEdit={() => {
                        setViewingMemory(null);
                        setEditingMemory(viewingMemory);
                    }}
                    onComment={() => {
                        setViewingMemory(null);
                        setCommentingMemory({
                            id: viewingMemory.id,
                            title: viewingMemory.title || 'Memory'
                        });
                    }}
                />
            )}

            {/* Animation keyframes */}
            <style jsx global>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
