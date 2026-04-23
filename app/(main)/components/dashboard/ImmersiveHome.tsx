'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Settings } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { PinnedNote } from './PinnedNote';
import { BucketListWidget } from './widgets/BucketListWidget';
import { ReminisceWidget } from './widgets/ReminisceWidget';
import { GratitudeWidget } from './widgets/GratitudeWidget';
import { DateNightWidget } from './widgets/DateNightWidget';
import { WishlistPeek } from './widgets/WishlistPeek';
import { ChoresUpNext } from './widgets/ChoresUpNext';
import { DocumentsExpiring } from './widgets/DocumentsExpiring';
import { GroceryQuickAdd } from './widgets/GroceryQuickAdd';
import { CountdownWidget } from '@/(main)/profile/components/CountdownWidget';
import { EditMemoryModal } from '@/(main)/timeline/components/EditMemoryModal';
import { CommentsPanel } from '@/(main)/timeline/components/CommentsPanel';
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal';
import type { Locket, MemoryGroup, MediaItem as MediaItemType } from '@/lib/types';

interface ImmersiveHomeProps {
  locket: Locket;
  user: {
    uid: string;
    displayName?: string | null;
  };
}

export function ImmersiveHome({ locket, user }: ImmersiveHomeProps) {
  const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
  const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
  const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
  const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });

  const daysTogether = locket.anniversary_date
    ? Math.floor((Date.now() - new Date(locket.anniversary_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const targetDate = locket.next_countdown_date
    ? new Date(locket.next_countdown_date)
    : locket.anniversary_date
      ? new Date(
          new Date().getFullYear() +
            (new Date(locket.anniversary_date).setFullYear(new Date().getFullYear()) < Date.now() ? 1 : 0),
          new Date(locket.anniversary_date).getMonth(),
          new Date(locket.anniversary_date).getDate()
        )
      : null;

  const countdownTitle = locket.next_countdown_event_name || (locket.anniversary_date ? 'Anniversary' : 'Next Milestone');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user.displayName?.split(' ')[0] || 'Love';

  const formattedAnniversary = locket.anniversary_date
    ? new Date(locket.anniversary_date).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const handleViewMemory = async (group: MemoryGroup) => {
    setViewingMemory(group);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups/${group.id}/like?locketId=${locket.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
      }
    } catch (error) {
      console.error('Failed to fetch like status:', error);
    }
  };

  const handleViewMemoryLike = async () => {
    if (!viewingMemory) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups/${viewingMemory.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ locket_id: locket.id })
      });

      if (res.ok) {
        const data = await res.json();
        setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-2 animate-fade-in">
          <div>
            <p className="text-muted text-body-sm font-medium">
              {getGreeting()}, {firstName}
            </p>
            <h1 className="font-display text-display text-foreground leading-tight">
              {locket.name}
            </h1>
          </div>
          <Link
            href="/settings"
            className="p-2.5 bg-elevated rounded-lg hover:bg-foreground/5 transition-colors border border-border"
            aria-label="Locket settings"
          >
            <Settings className="w-4 h-4 text-muted" />
          </Link>
        </div>

        {/* Days Together */}
        {daysTogether !== null && daysTogether > 0 && (
          <div className="mb-6 animate-fade-in">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-display-xl text-primary leading-none">
                {daysTogether.toLocaleString()}
              </span>
              <span className="text-muted text-body">days together</span>
              {formattedAnniversary && (
                <span className="text-faint text-caption hidden sm:inline">
                  since {formattedAnniversary}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reminisce */}
        <div className="mb-6 animate-fade-in">
          <ReminisceWidget locketId={locket.id} />
        </div>

        {/* Pinned Note */}
        <div className="flex items-start justify-center py-4 mb-6 animate-fade-in">
          <PinnedNote
            locketId={locket.id}
            partnerName="your partner"
          />
        </div>

        {/* Spotlight */}
        <div className="mb-6 animate-fade-in">
          <SpotlightCard locketId={locket.id} onViewMemory={handleViewMemory} />
        </div>

        {/* Gratitude */}
        <div className="mb-6 animate-fade-in">
          <GratitudeWidget locketId={locket.id} currentUid={user.uid} />
        </div>

        {/* Date Night */}
        <div className="mb-6 animate-fade-in">
          <DateNightWidget locketId={locket.id} />
        </div>

        {/* Countdown */}
        <div className="mb-6 animate-fade-in">
          {targetDate ? (
            <CountdownWidget targetDate={targetDate} title={countdownTitle} />
          ) : (
            <div className="card-base p-6 flex flex-col items-center text-center justify-center min-h-[180px]">
              <p className="font-display text-subheading text-foreground mb-2">Set a Date</p>
              <p className="text-muted text-body-sm mb-4">
                Add your anniversary or next trip to see a countdown here.
              </p>
              <Link
                href="/settings"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-body-sm font-medium transition-all hover:brightness-110"
              >
                Configure Locket
              </Link>
            </div>
          )}
        </div>

        {/* Bucket List */}
        <div className="mb-6 animate-fade-in">
          <BucketListWidget locketId={locket.id} />
        </div>

        {/* Together widget grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in">
          <WishlistPeek locketId={locket.id} />
          <ChoresUpNext locketId={locket.id} />
          <DocumentsExpiring locketId={locket.id} />
          <GroceryQuickAdd locketId={locket.id} />
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
          initialDate={editingMemory.date_taken ? String(editingMemory.date_taken).split('T')[0] : undefined}
          mediaItems={editingMemory.media_items?.map((m: MediaItemType) => ({
            id: m.id,
            storage_url: m.storage_url,
            storage_key: m.storage_key,
            filename: m.filename,
            file_type: m.file_type,
            date_taken: m.date_taken ? String(m.date_taken) : undefined,
            place_name: m.place_name
          }))}
          onSaved={() => {}}
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
          memory={{
            ...viewingMemory,
            date_taken: viewingMemory.date_taken ? String(viewingMemory.date_taken) : undefined,
            created_at: String(viewingMemory.created_at),
            media_items: viewingMemory.media_items?.map(m => ({
              ...m,
              date_taken: m.date_taken ? String(m.date_taken) : undefined
            }))
          }}
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
