'use client';

import React, { useState } from 'react';
import { Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocket } from '@/contexts/LocketContext';

interface BucketItem {
    id: string;
    text: string;
    completed: boolean;
    category?: 'travel' | 'food' | 'activity' | 'other';
}

export function BucketList() {
    const { currentLocket } = useLocket();
    const [items, setItems] = useState<BucketItem[]>([]);
    const [newItemText, setNewItemText] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
        if (!currentLocket) return;
        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();
            const res = await fetch(`/api/bucket-list?locketId=${currentLocket.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items.map((i: any) => ({
                    id: i.id,
                    text: i.title,
                    completed: i.status === 'completed',
                    category: i.category
                })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (currentLocket) {
            fetchItems();
        } else {
            setLoading(false);
        }
    }, [currentLocket]);

    const toggleItem = async (id: string) => {
        // Optimistic update
        setItems(items.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        ));

        // TODO: Call API to update status
    };

    const addItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim() || !currentLocket) return;

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const res = await fetch('/api/bucket-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    locketId: currentLocket.id,
                    title: newItemText,
                    category: 'other'
                })
            });

            if (res.ok) {
                const data = await res.json();
                const newItem: BucketItem = {
                    id: data.item.id,
                    text: data.item.title,
                    completed: false, // Default from API is 'active'
                    category: data.item.category
                };
                setItems([...items, newItem]);
                setNewItemText('');
            }
        } catch (error) {
            console.error("Failed to add item", error);
        }
    };

    const deleteItem = (id: string) => {
        // Optimistic delete
        setItems(items.filter(item => item.id !== id));
        // TODO: Call API
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 flex justify-center">
                <Loader2 className="animate-spin text-primary/50" />
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-2xl text-primary">Our Bucket List</h2>
                <span className="text-sm text-muted-foreground bg-rose-50 px-3 py-1 rounded-full">
                    {items.filter(i => i.completed).length} / {items.length} Done
                </span>
            </div>

            <form onSubmit={addItem} className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="Add a new dream..."
                        className="w-full pl-4 pr-12 py-3 bg-rose-50/50 border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body text-truffle placeholder:text-muted-foreground/50"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </form>

            <div className="space-y-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "group flex items-center p-3 rounded-xl border transition-all duration-200",
                            item.completed
                                ? "bg-rose-50/30 border-transparent opacity-70"
                                : "bg-white border-rose-50 hover:border-rose-200 hover:shadow-sm"
                        )}
                    >
                        <button
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                                "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors",
                                item.completed
                                    ? "bg-primary border-primary text-white"
                                    : "border-muted-foreground/30 text-transparent hover:border-primary"
                            )}
                        >
                            <Check size={14} strokeWidth={3} />
                        </button>

                        <span
                            className={cn(
                                "flex-1 font-body text-sm md:text-base transition-all",
                                item.completed ? "line-through text-muted-foreground" : "text-truffle"
                            )}
                        >
                            {item.text}
                        </span>

                        <button
                            onClick={() => deleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-400 transition-all transform hover:scale-110"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Your list is empty. Start dreaming together! ✨</p>
                    </div>
                )}
            </div>
        </div>
    );
}
