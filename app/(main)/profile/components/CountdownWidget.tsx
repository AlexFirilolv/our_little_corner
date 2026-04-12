'use client';

import React from 'react';
import { differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

interface CountdownWidgetProps {
    targetDate?: Date;
    title?: string;
    className?: string;
}

export function CountdownWidget({ targetDate = new Date('2024-12-31'), title = "New Year's Eve" }: CountdownWidgetProps) {
    const daysLeft = differenceInDays(targetDate, new Date());

    return (
        <div className="card-base bg-surface-amber p-6 relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center space-x-2 text-accent mb-2">
                    <CalendarIcon size={16} />
                    <span className="overline">Upcoming</span>
                </div>

                <h3 className="font-display text-subheading text-foreground mb-1">{title}</h3>

                <div className="my-4 relative">
                    <span className="text-6xl font-display font-bold text-primary tracking-tight leading-none">
                        {daysLeft > 0 ? daysLeft : 0}
                    </span>
                    <span className="block text-body-sm font-medium text-muted mt-1">days left</span>
                </div>

                <p className="text-body-sm text-muted font-medium">
                    {targetDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
    );
}
