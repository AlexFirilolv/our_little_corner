'use client';

import React from 'react';
import { Heart, MapPin } from 'lucide-react';

interface DaysTogetherWidgetProps {
  daysTogether: number;
  anniversaryDate: Date;
  locationOrigin?: string;
}

export function DaysTogetherWidget({ daysTogether, anniversaryDate, locationOrigin }: DaysTogetherWidgetProps) {
  const formattedDate = anniversaryDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-6 border border-rose-100/50 backdrop-blur-sm relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary fill-primary" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Days Together</span>
        </div>

        {/* Main Counter */}
        <div className="text-center mb-4">
          <span className="text-5xl font-bold font-heading text-primary tracking-tight">
            {daysTogether.toLocaleString()}
          </span>
          <p className="text-sm text-muted-foreground mt-1">days of love</p>
        </div>

        {/* Anniversary Date */}
        <div className="text-center space-y-2">
          <p className="text-sm text-truffle/80">
            Since <span className="font-medium">{formattedDate}</span>
          </p>

          {locationOrigin && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationOrigin}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
