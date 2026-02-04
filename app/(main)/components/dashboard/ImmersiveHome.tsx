'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { HeroSection } from './HeroSection';
import { WidgetCarousel } from './WidgetCarousel';
import { SpotlightCard } from './SpotlightCard';
import { PinnedNote } from './PinnedNote';
import { DaysTogetherWidget } from './widgets/DaysTogetherWidget';
import { BucketListWidget } from './widgets/BucketListWidget';
import { CountdownWidget } from '@/(main)/profile/components/CountdownWidget';
import { JournalCard } from '@/(main)/timeline/components/JournalCard';
import { LoveNoteCard } from '@/(main)/timeline/components/LoveNoteCard';
import { EditMemoryModal } from '@/(main)/timeline/components/EditMemoryModal';
import { CommentsPanel } from '@/(main)/timeline/components/CommentsPanel';
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal';
import type { Locket, LocketCover, MemoryGroup, MediaItem as MediaItemType } from '@/lib/types';

interface ImmersiveHomeProps {
  locket: Locket;
  user: {
    uid: string;
    displayName?: string | null;
  };
}

export function ImmersiveHome({ locket, user }: ImmersiveHomeProps) {
  const [coverPhotos, setCoverPhotos] = useState<LocketCover[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(true);

  // Modal states
  const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
  const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
  const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
  const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch cover photos
  useEffect(() => {
    async function fetchCovers() {
      try {
        const { getCurrentUserToken } = await import('@/lib/firebase/auth');
        const token = await getCurrentUserToken();

        const res = await fetch(`/api/lockets/${locket.id}/covers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setCoverPhotos(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch cover photos:', error);
      } finally {
        setLoadingCovers(false);
      }
    }

    fetchCovers();
  }, [locket.id]);

  // Calculate days together
  const daysTogether = locket.anniversary_date
    ? Math.floor((Date.now() - new Date(locket.anniversary_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate countdown target
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

  const handleEditSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

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
    <div className="min-h-screen pb-20 md:pb-8 bg-background-light">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-0 md:pt-6 max-w-5xl">
        <HeroSection
          locketName={locket.name}
          userName={user.displayName || undefined}
          daysTogether={daysTogether}
          locationOrigin={locket.location_origin}
          coverPhotos={coverPhotos}
          fallbackCoverUrl={locket.cover_photo_url}
        />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Widget Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <WidgetCarousel>
            {/* Days Together Widget */}
            {daysTogether !== null && daysTogether > 0 && locket.anniversary_date && (
              <DaysTogetherWidget
                daysTogether={daysTogether}
                anniversaryDate={new Date(locket.anniversary_date)}
                locationOrigin={locket.location_origin}
              />
            )}

            {/* Countdown Widget */}
            {targetDate ? (
              <CountdownWidget targetDate={targetDate} title={countdownTitle} />
            ) : (
              <div className="bg-gradient-to-br from-primary to-rose-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[200px]">
                <p className="font-heading text-xl mb-2">Set a Date</p>
                <p className="text-rose-100 text-sm mb-4">
                  Add your anniversary or next trip to see a countdown here.
                </p>
                <Link
                  href="/settings"
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                >
                  Configure Locket
                </Link>
              </div>
            )}

            {/* Bucket List Widget */}
            <BucketListWidget locketId={locket.id} />
          </WidgetCarousel>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Spotlight & Fridge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-5 space-y-6"
          >
            {/* Spotlight Card */}
            <SpotlightCard locketId={locket.id} onViewMemory={handleViewMemory} />

            {/* Pinned Note (Fridge) */}
            <PinnedNote
              locketId={locket.id}
              partnerName="your partner"
              onViewMemory={handleViewMemory}
            />
          </motion.div>

          {/* Right Column - Recent Memories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-7"
          >
            <RecentMemories
              key={refreshKey}
              locketId={locket.id}
              onEdit={setEditingMemory}
              onComment={(id, title) => setCommentingMemory({ id, title })}
              onView={handleViewMemory}
            />
          </motion.div>
        </div>

        {/* Floating Add Button (Mobile) */}
        <Link
          href="/upload"
          className="md:hidden fixed bottom-20 right-4 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center animate-in zoom-in duration-300"
        >
          <Plus size={24} />
        </Link>
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

// Recent Memories Component
interface RecentMemoriesProps {
  locketId: string;
  onEdit: (group: MemoryGroup) => void;
  onComment: (id: string, title: string) => void;
  onView: (group: MemoryGroup) => void;
}

function RecentMemories({ locketId, onEdit, onComment, onView }: RecentMemoriesProps) {
  const [memories, setMemories] = useState<MemoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.error('Failed to fetch memories', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMemories();
  }, [locketId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary/50" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl md:text-2xl text-truffle">Recent Memories</h2>
        </div>
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-rose-200">
          <p className="text-muted-foreground mb-4">No memories yet.</p>
          <Link href="/upload" className="text-primary font-medium hover:underline">
            Start adding some!
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl md:text-2xl text-truffle">Recent Memories</h2>
        <Link href="/timeline" className="text-sm text-primary font-medium hover:underline">
          View Timeline
        </Link>
      </div>

      <div className="space-y-4">
        {memories.map((group) => {
          const hasMedia = group.media_items && group.media_items.length > 0;
          const creatorInitial = group.creator_name?.charAt(0).toUpperCase() || '?';

          if (!hasMedia) {
            return (
              <div key={group.id}>
                <LoveNoteCard
                  date={new Date(group.created_at).toLocaleDateString()}
                  note={group.description || group.title || 'A sweet note'}
                  authorInitial={creatorInitial}
                  authorAvatarUrl={group.creator_avatar_url}
                  className="w-full max-w-full"
                />
              </div>
            );
          }

          return (
            <div key={group.id}>
              <JournalCard
                id={group.id}
                date={new Date(group.date_taken || group.created_at).toLocaleDateString()}
                location={group.media_items?.[0]?.place_name || undefined}
                imageUrl={group.media_items?.[0]?.storage_url}
                caption={group.title || group.description || ''}
                likes={0}
                mediaItems={group.media_items}
                className="w-full max-w-full"
                onEdit={() => onEdit(group)}
                onComment={() => onComment(group.id, group.title || 'Memory')}
                onImageClick={() => onView(group)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
