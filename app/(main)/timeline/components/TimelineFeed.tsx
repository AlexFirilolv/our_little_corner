'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { JournalCard } from './JournalCard';
import { LoveNoteCard } from './LoveNoteCard';
import { EditMemoryModal } from './EditMemoryModal';
import { CommentsPanel } from './CommentsPanel';
import { MemoryDetailModal } from './MemoryDetailModal';
import { Loader2, ImageIcon, User } from 'lucide-react';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProxiedImageUrl } from '@/lib/imageProxy';

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
    sortDate: Date;
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
    sortDate: Date;
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
    const [coverPhotoError, setCoverPhotoError] = React.useState(false);

    const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
    const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
    const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
    const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });

    React.useEffect(() => {
        setCoverPhotoError(false);
    }, [currentLocket?.id]);

    const fetchData = React.useCallback(async () => {
        if (!currentLocket || !user) return;

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const [membersRes, timelineRes] = await Promise.all([
                fetch(`/api/lockets/${currentLocket.id}/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setMembers(membersData.users || []);
            }

            if (timelineRes.ok) {
                const data = await timelineRes.json();
                const memoryGroups = data.memoryGroups || [];

                const mappedItems: TimelineItem[] = memoryGroups.map((group: MemoryGroup) => {
                    const hasMedia = group.media_items && group.media_items.length > 0;
                    const creatorName = group.creator_name || '';
                    const creatorAvatar = group.creator_avatar_url || '';
                    const authorInitial = creatorName ? creatorName.charAt(0).toUpperCase() : '?';
                    const rawDate = hasMedia
                        ? new Date(group.media_items![0].date_taken || group.date_taken || group.created_at)
                        : new Date(group.created_at);

                    if (hasMedia) {
                        const firstMedia = group.media_items![0];
                        return {
                            id: group.id,
                            type: 'journal',
                            date: rawDate.toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }),
                            sortDate: rawDate,
                            location: firstMedia.place_name,
                            imageUrl: firstMedia.storage_url,
                            caption: group.title || group.description || '',
                            likes: 0,
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
                            date: rawDate.toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }),
                            sortDate: rawDate,
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

    const handleEditSaved = () => { fetchData(); };

    const handleViewMemory = async (group: MemoryGroup) => {
        setViewingMemory(group);
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

    // Group items by month
    const groupedItems = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
        const monthKey = item.sortDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(item);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
                    <div className="relative mb-6">
                        {currentLocket?.cover_photo_url && !coverPhotoError ? (
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden ring-2 ring-primary/20 shadow-md">
                                <img
                                    src={getProxiedImageUrl(currentLocket.cover_photo_url)}
                                    alt="Locket cover"
                                    className="w-full h-full object-cover"
                                    onError={() => setCoverPhotoError(true)}
                                />
                            </div>
                        ) : (
                            <div className="flex -space-x-4">
                                {members.length > 0 ? (
                                    members.slice(0, 2).map((member) => (
                                        member.avatar_url ? (
                                            <div key={member.id} className="w-16 h-16 rounded-full border-4 border-background overflow-hidden relative ring-2 ring-primary/20">
                                                <Image src={member.avatar_url} alt={member.display_name || 'Partner'} fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <div key={member.id} className="w-16 h-16 rounded-full border-4 border-background bg-elevated flex items-center justify-center text-primary font-display text-xl ring-2 ring-primary/20">
                                                {member.display_name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )
                                    ))
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full border-4 border-background bg-elevated flex items-center justify-center text-faint ring-2 ring-primary/20">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="w-16 h-16 rounded-full border-4 border-background bg-elevated flex items-center justify-center text-faint ring-2 ring-primary/20">
                                            <User className="w-6 h-6" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <h1 className="font-display text-display text-foreground mb-3">Our Timeline</h1>
                    <p className="text-muted text-body-sm mb-8">{currentLocket?.name || 'Your Story'}</p>

                    <div className="card-base p-8 rounded-2xl max-w-sm text-center">
                        <ImageIcon className="w-12 h-12 text-faint mx-auto mb-4" />
                        <p className="text-muted mb-2">No memories yet</p>
                        <p className="text-faint text-body-sm">Time to make some memories!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-x-hidden pb-24 md:pb-8">
            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex flex-col items-center justify-center mb-12 pt-4">
                    <h1 className="font-display text-display text-foreground mb-2 text-center">Our Timeline</h1>
                    <p className="text-muted text-body-sm">{currentLocket?.name || 'Our Story'}</p>
                </div>

                {/* Timeline — single column with date grouping */}
                <div className="space-y-8">
                    {Object.entries(groupedItems).map(([monthLabel, monthItems]) => (
                        <div key={monthLabel}>
                            {/* Month header */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="overline text-faint">{monthLabel}</span>
                                <div className="h-px flex-1 bg-border" />
                            </div>

                            {/* Items */}
                            <div className="space-y-4">
                                {monthItems.map((item) => (
                                    <div key={item.id} className="flex justify-center animate-fade-in-up">
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
                                                onEdit={() => setEditingMemory(item.rawGroup)}
                                                onComment={() => setCommentingMemory({
                                                    id: item.id,
                                                    title: item.caption || 'Memory'
                                                })}
                                                onImageClick={() => handleViewMemory(item.rawGroup)}
                                            />
                                        ) : (
                                            <LoveNoteCard {...item} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
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
                        place_name: m.place_name,
                        latitude: m.latitude,
                        longitude: m.longitude
                    }))}
                    onSaved={handleEditSaved}
                />
            )}

            {commentingMemory && (
                <CommentsPanel
                    isOpen={true}
                    onClose={() => setCommentingMemory(null)}
                    memoryId={commentingMemory.id}
                    memoryTitle={commentingMemory.title}
                />
            )}

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
        </div>
    );
}
