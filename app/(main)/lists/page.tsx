'use client';

import React from 'react';
import { BucketList } from '@/(main)/profile/components/BucketList';
import { Heart, Loader2, List } from 'lucide-react';
import Link from 'next/link';
import { useLocket } from '@/contexts/LocketContext';

export default function ListsPage() {
  const { currentLocket, loading: locketLoading } = useLocket();

  if (locketLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentLocket) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <List className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-heading text-foreground mb-2">No Locket Selected</h1>
          <p className="text-muted mb-6">
            Create or join a locket to start your shared lists.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:brightness-110 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-3xl">
      <header className="mb-8 animate-fade-in">
        <p className="overline text-faint mb-2">Shared dreams</p>
        <h1 className="font-display text-display text-foreground tracking-tight">Our Lists</h1>
        <p className="text-muted mt-2 font-serif italic">Dreams, goals, and favorites you share together.</p>
      </header>

      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <BucketList />
        </div>

        {/* Favorites List Coming Soon */}
        <div className="card-base p-6 flex flex-col items-center justify-center text-center py-12 border-dashed animate-fade-in-up">
          <div className="w-12 h-12 bg-surface-rose rounded-xl flex items-center justify-center mb-3">
            <Heart className="text-primary/40" />
          </div>
          <h3 className="font-display text-subheading text-foreground/70">Favorites List</h3>
          <p className="text-body-sm text-muted max-w-xs mx-auto mt-1 mb-4 font-serif italic">
            Coming soon: Keep track of your favorite restaurants, movies, and songs.
          </p>
        </div>
      </div>
    </div>
  );
}
