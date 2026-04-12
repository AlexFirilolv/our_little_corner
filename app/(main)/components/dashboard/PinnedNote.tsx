'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Pin, MessageCircle, Loader2, RefreshCw } from 'lucide-react';
import { FridgeDetailModal, ReplacePinModal } from './FridgeDetailModal';
import type { MemoryGroup } from '@/lib/types';

interface PinnedNoteProps {
  locketId: string;
  partnerName?: string;
}

export function PinnedNote({ locketId, partnerName = 'your partner' }: PinnedNoteProps) {
  const [pinnedMemory, setPinnedMemory] = useState<MemoryGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPinnedMemory = useCallback(async () => {
    try {
      setLoading(true);
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/lockets/${locketId}/pinned`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPinnedMemory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pinned memory:', error);
    } finally {
      setLoading(false);
    }
  }, [locketId]);

  useEffect(() => {
    if (locketId) fetchPinnedMemory();
  }, [locketId, refreshKey, fetchPinnedMemory]);

  const handlePinned = () => {
    setRefreshKey(prev => prev + 1);
  };

  const hasImage = pinnedMemory?.media_items && pinnedMemory.media_items.length > 0;
  const firstImage = hasImage ? pinnedMemory?.media_items?.[0] : null;

  return (
    <>
      <div className="relative bg-elevated rounded-xl shadow-md p-3 pb-4 max-w-[340px] mx-auto group border border-border rotate-[-3deg] hover:rotate-0 transition-transform duration-200">
        {/* Pushpin */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="w-6 h-6 rounded-full bg-primary shadow-sm flex items-center justify-center ring-2 ring-primary/30">
            <Pin className="w-3 h-3 text-primary-foreground fill-primary-foreground transform rotate-45" />
          </div>
        </div>

        {/* Replace hint on hover */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReplaceModal(true);
            }}
            className="p-1.5 bg-foreground/10 rounded-lg text-muted hover:bg-foreground/20 hover:text-foreground transition-colors"
            aria-label="Replace pin"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-2 pt-2">
          <span className="overline text-primary/60">
            The Fridge
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : pinnedMemory ? (
          <button
            onClick={() => setShowDetail(true)}
            className="block w-full text-left group/inner"
          >
            {hasImage && firstImage ? (
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-2 shadow-sm transform group-hover/inner:scale-[1.02] transition-transform">
                <Image
                  src={firstImage.storage_url}
                  alt={pinnedMemory.title || 'Pinned memory'}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-elevated/90 backdrop-blur-sm flex items-center justify-center">
                  <p className="font-display text-caption text-foreground truncate px-2">
                    {pinnedMemory.title || pinnedMemory.description?.slice(0, 30) || 'A special moment'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-surface-rose rounded-lg p-4 min-h-[80px] flex items-center justify-center group-hover/inner:bg-surface-rose/80 transition-colors">
                <p className="font-serif text-center text-foreground/70 italic leading-relaxed text-body-sm">
                  &ldquo;{pinnedMemory.description || pinnedMemory.title || 'A sweet note'}&rdquo;
                </p>
              </div>
            )}
            <p className="text-overline text-faint text-center mt-1.5">
              Tap to view
            </p>
          </button>
        ) : (
          <button
            onClick={() => setShowReplaceModal(true)}
            className="block w-full text-center py-5 group/empty"
          >
            <MessageCircle className="w-7 h-7 mx-auto text-faint/40 mb-2 group-hover/empty:text-primary/40 transition-colors" />
            <p className="text-caption text-muted mb-0.5">
              Nothing pinned yet
            </p>
            <p className="text-overline text-faint">
              Tap to pin something for {partnerName}
            </p>
          </button>
        )}
      </div>

      {showDetail && pinnedMemory && (
        <FridgeDetailModal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          memory={pinnedMemory}
          onReplace={() => {
            setShowDetail(false);
            setShowReplaceModal(true);
          }}
        />
      )}

      {showReplaceModal && (
        <ReplacePinModal
          isOpen={showReplaceModal}
          onClose={() => setShowReplaceModal(false)}
          locketId={locketId}
          onPinned={handlePinned}
        />
      )}
    </>
  );
}
