'use client';

import dynamic from 'next/dynamic';
import { Globe } from 'lucide-react';

// Dynamic import for the Map component to avoid SSR issues
const JourneyMapInner = dynamic(() => import('./JourneyMapInner'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[300px] md:h-[600px] rounded-2xl bg-rose-50 flex items-center justify-center text-muted-foreground animate-pulse border border-rose-100">
            <Globe className="w-10 h-10 mb-2 opacity-50" />
            <span className="sr-only">Loading Map...</span>
        </div>
    ),
});

export default function JourneyMap() {
    return <JourneyMapInner />;
}
