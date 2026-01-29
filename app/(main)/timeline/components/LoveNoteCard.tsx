'use client';

import { Heart, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Newsreader } from 'next/font/google';

const newsreader = Newsreader({
    subsets: ['latin'],
    style: 'italic',
    variable: '--font-newsreader'
});

interface LoveNoteCardProps {
    date: string;
    note: string;
    authorInitial?: string;
    authorAvatarUrl?: string; // New prop
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
                    "relative bg-[#FDF6F7] p-6 rounded-sm shadow-sm border border-rose-100/50 transition-all duration-300 hover:shadow-md hover:-translate-y-1",
                    align === 'left' ? "rotate-1" : "-rotate-1",
                )}
                style={{
                    boxShadow: "2px 2px 10px rgba(74, 44, 53, 0.05)"
                }}
            >
                {/* Decorative Tape element - simulated with CSS */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-rose-200/40 rotate-[2deg] backdrop-blur-[1px]" />

                <div className="mb-4 text-center">
                    <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">{date}</span>
                </div>

                <div className="relative">
                    <Quote className="absolute -top-2 -left-2 w-6 h-6 text-accent/20 fill-accent/20" />
                    <p className={`${newsreader.className} text-xl md:text-2xl text-truffle leading-relaxed text-center px-4 py-2`}>
                        {note}
                    </p>
                    <Quote className="absolute -bottom-2 -right-2 w-6 h-6 text-accent/20 fill-accent/20 rotate-180" />
                </div>

                <div className="mt-6 flex justify-center items-center">
                    {authorAvatarUrl ? (
                        <img
                            src={authorAvatarUrl}
                            alt={authorInitial || "User"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-primary font-heading font-bold text-sm shadow-inner">
                            {authorInitial || '❤️'}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart size={16} className="text-rose-300 fill-rose-300" />
                </div>
            </div>
        </div>
    );
}
