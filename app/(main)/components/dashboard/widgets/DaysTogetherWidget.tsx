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
    <div className="card-base p-6 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-surface-rose flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary fill-primary" />
          </div>
          <span className="overline text-primary/80">Days Together</span>
        </div>

        <div className="text-center mb-4">
          <span className="text-5xl font-bold font-display text-primary tracking-tight">
            {daysTogether.toLocaleString()}
          </span>
          <p className="text-body-sm text-muted mt-1">days of love</p>
        </div>

        <div className="text-center space-y-2">
          <p className="text-body-sm text-muted">
            Since <span className="font-medium text-foreground">{formattedDate}</span>
          </p>

          {locationOrigin && (
            <div className="flex items-center justify-center gap-1.5 text-body-sm text-faint">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationOrigin}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
