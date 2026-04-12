'use client';

import React from 'react';
import { MilestoneList } from './components/MilestoneList';
import { Loader2, Compass, Sparkles } from 'lucide-react';
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Compass className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-heading text-foreground mb-2">No Locket Selected</h1>
          <p className="text-muted mb-6">
            Create or join a locket to start tracking your journey together.
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

  const hasData = stats.memories > 0;

  const statItems = [
    { value: stats.memories, label: 'Memories', color: 'text-primary' },
    { value: stats.places, label: 'Places', color: 'text-secondary' },
    { value: stats.milestones, label: 'Milestones', color: 'text-accent' },
    { value: '\u221E', label: 'Adventures', color: 'text-muted' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <p className="overline text-faint mb-2">Where you&apos;ve been</p>
        <h1 className="font-display text-display text-foreground tracking-tight">Our Journey</h1>
        <p className="text-muted mt-2 font-serif italic">Where we&apos;ve been and where we&apos;re going.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-base p-1.5 overflow-hidden animate-fade-in-up">
            <div className="rounded-lg overflow-hidden">
              <JourneyMap />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up">
            {statItems.map((stat) => (
              <div
                key={stat.label}
                className="card-base p-4 text-center"
              >
                <div className={`text-heading font-display font-bold ${stat.color}`}>{stat.value}</div>
                <div className="overline text-faint mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6 animate-fade-in-up">
          <MilestoneList />

          {/* "On This Day" Widget */}
          {hasData && (
            <div className="card-base bg-surface-amber p-5">
              <h3 className="font-display text-subheading text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                On This Day
              </h3>
              <div className="bg-background p-4 rounded-lg border border-border text-center">
                <Sparkles className="w-6 h-6 text-primary/30 mx-auto mb-2" />
                <p className="text-body-sm text-muted font-serif italic">
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
