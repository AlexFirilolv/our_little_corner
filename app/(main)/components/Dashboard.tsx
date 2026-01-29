'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, Calendar, Loader2 } from 'lucide-react';
import { CountdownWidget } from '@/(main)/profile/components/CountdownWidget';
import { JournalCard } from '@/(main)/timeline/components/JournalCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';

export default function Dashboard() {
    const { user } = useAuth();
    const { currentLocket, loading: locketLoading } = useLocket();

    if (locketLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!currentLocket) {
        return (
            <div className="min-h-screen pb-20 md:pb-8 bg-background-light flex flex-col items-center justify-center p-4 text-center">
                <h1 className="font-heading text-2xl text-truffle mb-2">Welcome, {user?.displayName || 'Friend'}</h1>
                <p className="text-muted-foreground mb-6">You haven't joined a locket yet.</p>
                <Link href="/locket-create" className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors">
                    Create or Join a Locket
                </Link>
            </div>
        )
    }

    // Determine target date (Anniversary or next countdown or default)
    // Default to New Year if nothing set
    const targetDate = currentLocket.next_countdown_date
        ? new Date(currentLocket.next_countdown_date)
        : currentLocket.anniversary_date
            ? new Date(new Date().getFullYear() + (new Date(currentLocket.anniversary_date).setFullYear(new Date().getFullYear()) < Date.now() ? 1 : 0), new Date(currentLocket.anniversary_date).getMonth(), new Date(currentLocket.anniversary_date).getDate())
            : null;

    const countdownTitle = currentLocket.next_countdown_event_name || (currentLocket.anniversary_date ? "Anniversary" : "Next Milestone");

    return (
        <div className="min-h-screen pb-20 md:pb-8 bg-background-light">
            <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">

                {/* Welcome Header */}
                <header className="mb-6 md:mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="font-heading text-2xl md:text-4xl text-primary font-bold">Good Morning, {user?.displayName?.split(' ')[0] || 'Love'}</h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-1">Here's what's happening in <strong>{currentLocket.name}</strong> today.</p>
                    </div>
                    <Link href="/upload" className="hidden md:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors">
                        <Plus size={18} />
                        <span>Add Memory</span>
                    </Link>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Left Column: Widgets (Horizontal Scroll on Mobile) */}
                    <div className="md:col-span-5">
                        {/* Mobile: Horizontal Scroll Container */}
                        <div className="flex md:block overflow-x-auto pb-4 md:pb-0 gap-4 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:space-y-6 no-scrollbar">

                            {/* Countdown Widget */}
                            <div className="min-w-[85%] md:min-w-0 snap-center">
                                {targetDate ? (
                                    <CountdownWidget targetDate={targetDate} title={countdownTitle} />
                                ) : (
                                    <div className="bg-gradient-to-br from-primary to-rose-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[200px]">
                                        <p className="font-heading text-xl mb-2">Set a Date</p>
                                        <p className="text-rose-100 text-sm mb-4">Add your anniversary or next trip to see a countdown here.</p>
                                        <Link href="/settings" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-bold transition-colors">
                                            Configure Locket
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* On This Day Widget (Placeholder/Future) */}
                            <div className="min-w-[85%] md:min-w-0 snap-center bg-white rounded-2xl p-5 shadow-sm border border-rose-100 h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-heading text-lg font-bold text-truffle flex items-center gap-2">
                                        <Calendar size={18} className="text-primary" />
                                        On This Day
                                    </h3>
                                </div>
                                <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-50/50 text-center py-8">
                                    <p className="text-muted-foreground text-sm">No memories from previous years today.</p>
                                </div>
                            </div>

                            {/* Quick Bucket List Widget */}
                            <div className="min-w-[85%] md:min-w-0 snap-center bg-gradient-to-br from-[#FDF6F7] to-white rounded-2xl p-5 shadow-sm border border-rose-100 h-full">
                                <BucketListWidget locketId={currentLocket.id} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Recent Activity */}
                    <Link href="/upload" className="md:hidden fixed bottom-20 right-4 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center animate-in zoom-in duration-300">
                        <Plus size={24} />
                    </Link>

                    <RecentMemories locketId={currentLocket.id} />

                </div>
            </div>
        </div>
    );
}

function BucketListWidget({ locketId }: { locketId: string }) {
    const [items, setItems] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchItems() {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/bucket-list?locketId=${locketId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Take top 3 active items
                    const activeItems = (data.items || [])
                        .filter((i: any) => i.status === 'active')
                        .slice(0, 3);
                    setItems(activeItems);
                }
            } catch (error) {
                console.error("Failed to fetch bucket list", error);
            } finally {
                setLoading(false);
            }
        }
        if (locketId) fetchItems();
    }, [locketId]);

    return (
        <>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-bold text-truffle">Bucket List</h3>
                <Link href="/profile" className="text-xs font-bold text-primary hover:underline flex items-center">
                    View <ArrowRight size={10} className="ml-0.5" />
                </Link>
            </div>
            {loading ? (
                <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            ) : items.length > 0 ? (
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-3 h-3 rounded-sm border-2 border-rose-200 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                    <p>No dreams added yet.</p>
                </div>
            )}
        </>
    );
}

function RecentMemories({ locketId }: { locketId: string }) {
    const [memories, setMemories] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchMemories() {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/memory-groups?locketId=${locketId}&limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setMemories(data.memoryGroups || []);
                }
            } catch (error) {
                console.error("Failed to fetch memories", error);
            } finally {
                setLoading(false);
            }
        }

        fetchMemories();
    }, [locketId]);

    if (loading) return <div className="md:col-span-7 flex justify-center py-12"><Loader2 className="animate-spin text-primary/50" /></div>;

    if (memories.length === 0) {
        return (
            <div className="md:col-span-7">
                <div className="flex items-center justify-between mb-4 mt-2 md:mt-0">
                    <h2 className="font-heading text-xl md:text-2xl text-truffle">Recent Memories</h2>
                </div>
                <div className="bg-white rounded-2xl p-8 text-center border dashed border-rose-200">
                    <p className="text-muted-foreground mb-4">No memories yet.</p>
                    <Link href="/upload" className="text-primary font-medium hover:underline">Start adding some!</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="md:col-span-7">
            <div className="flex items-center justify-between mb-4 mt-2 md:mt-0">
                <h2 className="font-heading text-xl md:text-2xl text-truffle">Recent Memories</h2>
                <Link href="/timeline" className="text-sm text-primary font-medium hover:underline">View Timeline</Link>
            </div>

            <div className="space-y-4">
                {memories.map((group: any) => (
                    <div key={group.id}>
                        <JournalCard
                            date={new Date(group.date_taken || group.created_at).toLocaleDateString()}
                            location={group.media_items?.[0]?.place_name || undefined}
                            imageUrl={group.media_items?.[0]?.storage_url}
                            caption={group.title || group.description || 'New memory'}
                            likes={0}
                            className="w-full max-w-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
