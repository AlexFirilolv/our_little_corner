'use client';

import React from 'react';
import { MilestoneList } from './components/MilestoneList';
import { Globe, Loader2, MapPin, Compass, Heart, Sparkles } from 'lucide-react';
import JourneyMap from './components/JourneyMap';
import { useLocket } from '@/contexts/LocketContext';
import Link from 'next/link';

interface JourneyStats {
  memories: number;
  places: number;
  milestones: number;
}

export default function JourneyPage() {
  const { currentLocket, loading: locketLoading } = useLocket();
  const [stats, setStats] = React.useState<JourneyStats>({ memories: 0, places: 0, milestones: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      if (!currentLocket) return;
      try {
        const { getCurrentUserToken } = await import('@/lib/firebase/auth');
        const token = await getCurrentUserToken();
        const res = await fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const groups = data.memoryGroups || [];
          const uniquePlaces = new Set(
            groups
              .flatMap((g: any) => g.media_items || [])
              .map((m: any) => m.place_name)
              .filter(Boolean)
          );
          setStats({
            memories: groups.length,
            places: uniquePlaces.size,
            milestones: groups.filter((g: any) => g.is_milestone).length
          });
        }
      } catch (error) {
        console.error("Failed to fetch journey stats", error);
      } finally {
        setLoading(false);
      }
    }

    if (currentLocket) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [currentLocket]);

  if (locketLoading || loading) {
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
            <Compass className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-heading text-2xl text-primary font-bold mb-2">No Locket Selected</h1>
          <p className="text-muted-foreground mb-6">
            Create or join a locket to start tracking your journey together.
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

  const hasData = stats.memories > 0;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <header className="mb-8 text-center md:text-left">
        <h1 className="font-heading text-3xl md:text-4xl text-primary font-bold">Our Journey</h1>
        <p className="text-muted-foreground mt-2">Where we've been and where we're going.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-2 rounded-3xl shadow-md border border-rose-100">
            <JourneyMap />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Stats Cards */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">{stats.memories}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Memories</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">{stats.places}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Places</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">{stats.milestones}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Milestones</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">∞</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Adventures</div>
            </div>
          </div>
        </div>

        {/* Sidebar / Milestones */}
        <div className="lg:col-span-1">
          <MilestoneList />

          {/* "On This Day" Widget - Only show if we have memories */}
          {hasData && (
            <div className="mt-8 bg-[#FDF6F7] rounded-2xl p-6 border border-rose-100 shadow-sm">
              <h3 className="font-heading text-lg text-primary font-bold mb-4">On This Day</h3>
              <div className="bg-white/50 p-4 rounded-xl border border-rose-50/50 text-center">
                <Sparkles className="w-6 h-6 text-rose-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Check back when you have more memories to see flashbacks!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
