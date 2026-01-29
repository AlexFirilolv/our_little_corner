'use client';

import React from 'react';
import { differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, Edit2 } from 'lucide-react';

interface CountdownWidgetProps {
    targetDate?: Date;
    title?: string;
    className?: string; // Standard React className prop
}

export function CountdownWidget({ targetDate = new Date('2024-12-31'), title = "New Year's Eve" }: CountdownWidgetProps) {
    const daysLeft = differenceInDays(targetDate, new Date());

    return (
        <div className="bg-gradient-to-br from-primary to-rose-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center space-x-2 text-rose-100 mb-2">
                    <CalendarIcon size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Upcoming</span>
                </div>

                <h3 className="font-heading text-2xl font-bold mb-1">{title}</h3>

                <div className="my-4 relative">
                    <span className="text-6xl font-bold font-display tracking-tight leading-none">
                        {daysLeft > 0 ? daysLeft : 0}
                    </span>
                    <span className="block text-sm font-medium text-rose-100 mt-1">days left</span>
                </div>

                <p className="text-sm text-rose-100/90 font-medium">
                    {targetDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>

                <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100">
                    <Edit2 size={14} />
                </button>
            </div>
        </div>
    );
}
