'use client';

import React from 'react';
import { Cloud, Sun, CloudRain, Snowflake } from 'lucide-react';

interface WeatherWidgetProps {
  location?: string;
}

export function WeatherWidget({ location = 'Your City' }: WeatherWidgetProps) {
  // Placeholder component - can be enhanced with actual weather API integration
  return (
    <div className="bg-gradient-to-br from-sky-50 to-white rounded-2xl p-6 border border-sky-100/50 backdrop-blur-sm relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-sky-200/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600/70">Weather</span>
        </div>

        {/* Placeholder Content */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Cloud className="w-8 h-8 text-sky-400" />
            <span className="text-3xl font-bold text-truffle">--</span>
          </div>
          <p className="text-sm text-muted-foreground">{location}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">Weather integration coming soon</p>
        </div>
      </div>
    </div>
  );
}
