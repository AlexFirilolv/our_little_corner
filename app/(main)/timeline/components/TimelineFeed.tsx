'use client';

import React from 'react';
import { HelixLine } from '@/components/HelixLine';
import { JournalCard } from './JournalCard';
import { LoveNoteCard } from './LoveNoteCard';
import { Clock } from 'lucide-react';

// Mock Data for the prototype
type JournalItem = {
    id: string;
    type: 'journal';
    date: string;
    location?: string;
    imageUrl?: string;
    videoUrl?: string;
    caption: string;
    likes?: number;
    comments?: number;
    authorAvatarUrl?: string;
};

type NoteItem = {
    id: string;
    type: 'note';
    date: string;
    authorInitial?: string;
    authorAvatarUrl?: string;
    note: string;
};

type TimelineItem = JournalItem | NoteItem;

const MOCK_ITEMS: TimelineItem[] = [
    {
        id: '1',
        type: 'journal',
        date: 'Oct 24, 2023',
        location: 'Central Park, NY',
        imageUrl: 'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?auto=format&fit=crop&q=80&w=800', // Placeholder
        caption: 'Our first autumn walk together. The leaves were perfect.',
        likes: 1,
        comments: 0,
    },
    {
        id: '2',
        type: 'note',
        date: 'Oct 25, 2023',
        authorInitial: 'A',
        note: "I just realized how much I smile when I see your name pop up on my phone.",
    },
    {
        id: '3',
        type: 'journal',
        date: 'Nov 1, 2023',
        location: 'Cafe Lalo',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
        caption: 'Best hot chocolate ever. Remind me to order the cheesecake next time!',
        likes: 1,
        comments: 2,
    },
    {
        id: '4',
        type: 'note',
        date: 'Nov 10, 2023',
        authorInitial: 'S',
        note: "Cannot wait for our trip next month! ✈️",
    },
];

import { useLocket } from '@/contexts/LocketContext';
import { Loader2 } from 'lucide-react';

export function TimelineFeed() {
    const { currentLocket } = useLocket();
    const [items, setItems] = React.useState<TimelineItem[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchTimeline() {
            if (!currentLocket) return;

            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();
                const res = await fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Transform API data to TimelineItem
                    const mappedItems: TimelineItem[] = (data.memoryGroups || []).map((group: any) => {
                        // Decide formatting based on content. If it has media, it's a journal. If text only, maybe note?
                        // For now defaulting to Journal if media is present.
                        const hasMedia = group.media_items && group.media_items.length > 0;

                        if (hasMedia) {
                            return {
                                id: group.id,
                                type: 'journal',
                                date: new Date(group.date_taken || group.created_at).toLocaleDateString(),
                                location: group.media_items[0].place_name,
                                imageUrl: group.media_items[0].storage_url,
                                caption: group.title || group.description || '',
                                likes: 0,
                                comments: 0
                            } as JournalItem;
                        } else {
                            return {
                                id: group.id,
                                type: 'note',
                                date: new Date(group.created_at).toLocaleDateString(),
                                authorInitial: '?', // TODO: map user ID to initial
                                note: group.description || group.title || 'No content'
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
        }

        if (currentLocket) {
            fetchTimeline();
        } else {
            setLoading(false);
        }
    }, [currentLocket]);

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
                        {/* Placeholder Avatars */}
                        <div className="w-16 h-16 rounded-full border-4 border-background bg-rose-200 flex items-center justify-center text-rose-700 font-heading text-xl">A</div>
                        <div className="w-16 h-16 rounded-full border-4 border-background bg-indigo-200 flex items-center justify-center text-indigo-700 font-heading text-xl">S</div>
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
                        >
                            {/* Content Card */}
                            <div className="w-full md:w-5/12 flex justify-center">
                                {item.type === 'journal' ? (
                                    <JournalCard
                                        {...item}
                                        align={isEven ? 'right' : 'left'}
                                        className="animate-in slide-in-from-bottom-8 duration-700 fade-in"
                                    />
                                ) : (
                                    <LoveNoteCard
                                        {...item}
                                        align={isEven ? 'right' : 'left'}
                                        className="animate-in slide-in-from-bottom-8 duration-700 delay-100 fade-in"
                                    />
                                )}
                            </div>

                            {/* Center Marker on Helix */}
                            <div className="hidden md:flex w-2/12 justify-center relative">
                                <div className="w-4 h-4 rounded-full bg-primary border-4 border-white shadow-md z-10" />
                                {/* Optional date marker */}
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

        </div>
    );
}
