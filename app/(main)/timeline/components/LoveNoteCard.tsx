'use client';

import { cn } from '@/lib/utils';
import { Heart, Quote } from 'lucide-react';

interface LoveNoteCardProps {
    date: string;
    note: string;
    authorInitial?: string;
    authorAvatarUrl?: string;
    className?: string;
    align?: 'left' | 'right';
}

export function LoveNoteCard({
    date,
    note,
    authorInitial,
    authorAvatarUrl,
    className,
    align = 'left'
}: LoveNoteCardProps) {
    return (
        <div className={cn("group w-full max-w-md", className)}>
            <div
                className={cn(
                    "relative p-6 rounded-xl bg-surface-rose border border-border transition-all duration-200",
                    "hover:shadow-md hover:border-border-emphasis hover:-translate-y-0.5",
                    "border-l-[3px] border-l-primary"
                )}
            >
                <div className="mb-4 text-center">
                    <span className="overline flex items-center justify-center gap-1">
                        {date}
                    </span>
                </div>

                <div className="relative px-4">
                    <Quote className="absolute -top-1 -left-1 w-5 h-5 text-accent/30" />
                    <p className="font-serif text-xl md:text-2xl text-foreground/90 italic leading-relaxed text-center px-4 py-2">
                        {note}
                    </p>
                </div>

                <div className="mt-6 flex justify-center items-center">
                    {authorAvatarUrl ? (
                        <img
                            src={authorAvatarUrl}
                            alt={authorInitial || "User"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-border shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-accent font-display font-semibold text-body-sm border border-border">
                            {authorInitial || (
                                <Heart className="w-4 h-4 text-primary fill-primary" />
                            )}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-4 h-4 text-primary fill-primary" />
                </div>
            </div>
        </div>
    );
}
