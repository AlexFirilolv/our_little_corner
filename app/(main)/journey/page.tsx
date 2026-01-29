'use client';

import dynamic from 'next/dynamic';
import { MilestoneList } from './components/MilestoneList';
import { Globe } from 'lucide-react';

// JourneyMap now handles dynamic import internally
import JourneyMap from './components/JourneyMap';

export default function JourneyPage() {
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
              <div className="text-2xl font-bold text-accent">3</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Countries</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">12</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Cities</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">5,432</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Miles</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-50 text-center">
              <div className="text-2xl font-bold text-accent">∞</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Memories</div>
            </div>
          </div>
        </div>

        {/* Sidebar / Milestones */}
        <div className="lg:col-span-1">
          <MilestoneList />

          {/* "On This Day" Widget */}
          <div className="mt-8 bg-[#FDF6F7] rounded-2xl p-6 border border-rose-100 shadow-sm">
            <h3 className="font-heading text-lg text-primary font-bold mb-4">On This Day</h3>
            <div className="bg-white p-4 rounded-xl border border-rose-50 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
              <p className="text-xs text-muted-foreground mb-1">2 Years Ago</p>
              <p className="text-truffle font-medium">First date at the Italian restaurant. You spilled wine on your shirt.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
