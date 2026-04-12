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
        const item = items.find(i => i.id === id);
        if (!item) return;

        const newCompleted = !item.completed;

        setItems(prevItems => prevItems.map(i =>
            i.id === id ? { ...i, completed: newCompleted } : i
        ));

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const res = await fetch(`/api/bucket-list/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newCompleted ? 'completed' : 'active'
                })
            });

            if (!res.ok) {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            setItems(prevItems => prevItems.map(i =>
                i.id === id ? { ...i, completed: item.completed } : i
            ));
            console.error('Failed to update item status:', error);
            alert('Failed to update item status. Please try again.');
        }
    };

    const addItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim() || !currentLocket) return;

        const text = newItemText;
        setNewItemText('');

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
                    title: text,
                    category: 'other'
                })
            });

            if (res.ok) {
                const data = await res.json();
                const newItem: BucketItem = {
                    id: data.item.id,
                    text: data.item.title,
                    completed: false,
                    category: data.item.category
                };
                setItems(prev => [...prev, newItem]);
            } else {
                throw new Error('Failed to add item');
            }
        } catch (error) {
            console.error("Failed to add item", error);
            setNewItemText(text);
            alert('Failed to add item. Please try again.');
        }
    };

    const deleteItem = async (id: string) => {
        const itemToDelete = items.find(i => i.id === id);
        if (!itemToDelete) return;

        setItems(prevItems => prevItems.filter(item => item.id !== id));

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const res = await fetch(`/api/bucket-list/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to delete item');
            }
        } catch (error) {
            setItems(prev => [...prev, itemToDelete]);
            console.error('Failed to delete item:', error);
            alert('Failed to delete item. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="card-base p-6 flex justify-center">
                <Loader2 className="animate-spin text-primary/50" />
            </div>
        )
    }

    return (
        <div className="card-base p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-heading text-foreground">Our Bucket List</h2>
                <span className="text-caption text-muted bg-foreground/5 px-3 py-1.5 rounded-full font-medium">
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
                        className="w-full bg-elevated border border-border rounded-md px-4 py-3 pr-12 text-body font-body text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition-all"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </form>

            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "group flex items-center p-3 rounded-lg border transition-all duration-200",
                            item.completed
                                ? "bg-foreground/[0.02] border-transparent opacity-50"
                                : "bg-elevated border-border hover:border-border-emphasis hover:shadow-sm"
                        )}
                    >
                        <button
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                                "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors",
                                item.completed
                                    ? "bg-secondary border-secondary text-secondary-foreground"
                                    : "border-border text-transparent hover:border-secondary/50"
                            )}
                        >
                            <Check size={14} strokeWidth={3} />
                        </button>

                        <span
                            className={cn(
                                "flex-1 text-body transition-all",
                                item.completed ? "line-through text-faint" : "text-foreground/80"
                            )}
                        >
                            {item.text}
                        </span>

                        <button
                            onClick={() => deleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-faint hover:text-destructive transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-8 text-muted">
                        <p className="font-serif italic">Your list is empty. Start dreaming together!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
