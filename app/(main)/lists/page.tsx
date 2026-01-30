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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
            <List className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-heading text-2xl text-primary font-bold mb-2">No Locket Selected</h1>
          <p className="text-muted-foreground mb-6">
            Create or join a locket to start your shared lists.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl text-primary font-bold">Our Lists</h1>
        <p className="text-muted-foreground mt-2">Dreams, goals, and favorites you share together.</p>
      </header>

      <div className="space-y-8">
        {/* Bucket List */}
        <BucketList />

        {/* Favorites List Coming Soon */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 flex flex-col items-center justify-center text-center py-12 border-dashed">
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-3">
            <Heart className="text-rose-300" />
          </div>
          <h3 className="font-heading text-lg font-medium text-truffle">Favorites List</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1 mb-4">
            Coming soon: Keep track of your favorite restaurants, movies, and songs.
          </p>
        </div>
      </div>
    </div>
  );
}
