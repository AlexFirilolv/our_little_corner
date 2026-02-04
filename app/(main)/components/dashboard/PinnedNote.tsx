'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Pin, MessageCircle, Loader2 } from 'lucide-react';
import type { MemoryGroup } from '@/lib/types';

interface PinnedNoteProps {
  locketId: string;
  partnerName?: string;
  onViewMemory?: (memory: MemoryGroup) => void;
}

export function PinnedNote({ locketId, partnerName = 'your partner', onViewMemory }: PinnedNoteProps) {
  const [pinnedMemory, setPinnedMemory] = useState<MemoryGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPinnedMemory() {
      try {
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
    }

    if (locketId) fetchPinnedMemory();
  }, [locketId]);

  const hasImage = pinnedMemory?.media_items && pinnedMemory.media_items.length > 0;
  const firstImage = hasImage ? pinnedMemory?.media_items?.[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -3 }}
      animate={{ opacity: 1, rotate: -2 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
      className="relative bg-[#FDF6F7] rounded-lg shadow-md p-4 pb-5 max-w-[280px] mx-auto"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23BA4A6808' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Pushpin */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <div className="w-6 h-6 rounded-full bg-red-500 shadow-md flex items-center justify-center">
          <Pin className="w-3 h-3 text-white fill-white transform rotate-45" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-3 pt-2">
        <span className="text-xs font-medium text-primary/60 uppercase tracking-wider">
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
          onClick={() => onViewMemory?.(pinnedMemory)}
          className="block w-full text-left group"
        >
          {hasImage && firstImage ? (
            // Photo pinned
            <div className="relative aspect-[4/3] rounded overflow-hidden mb-3 shadow-sm transform group-hover:scale-[1.02] transition-transform">
              <Image
                src={firstImage.storage_url}
                alt={pinnedMemory.title || 'Pinned memory'}
                fill
                className="object-cover"
              />
              {/* Polaroid-style bottom white strip */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                <p className="font-heading text-sm text-truffle truncate px-2">
                  {pinnedMemory.title || pinnedMemory.description?.slice(0, 30) || 'A special moment'}
                </p>
              </div>
            </div>
          ) : (
            // Text note pinned
            <div className="bg-white/50 rounded-lg p-4 min-h-[100px] flex items-center justify-center group-hover:bg-white/70 transition-colors">
              <p className="font-serif text-center text-truffle/80 italic leading-relaxed">
                "{pinnedMemory.description || pinnedMemory.title || 'A sweet note'}"
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tap to view
          </p>
        </button>
      ) : (
        // Empty state
        <div className="text-center py-6">
          <MessageCircle className="w-8 h-8 mx-auto text-primary/20 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            Nothing pinned yet
          </p>
          <p className="text-xs text-muted-foreground/70">
            Pin a memory for {partnerName} to see
          </p>
        </div>
      )}
    </motion.div>
  );
}
