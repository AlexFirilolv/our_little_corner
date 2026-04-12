'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ImmersiveHome } from './dashboard/ImmersiveHome';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';

export default function Dashboard() {
    const { user } = useAuth();
    const { currentLocket, loading: locketLoading } = useLocket();

    if (locketLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!currentLocket) {
        return (
            <div className="min-h-screen pb-20 md:pb-8 flex flex-col items-center justify-center p-4">
                <div className="max-w-md text-center">
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full animate-pulse" />
                        <div className="absolute inset-2 bg-elevated rounded-full flex items-center justify-center border border-border">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-surface-rose border-2 border-elevated" />
                                <div className="w-8 h-8 rounded-full bg-surface-amber border-2 border-elevated" />
                            </div>
                        </div>
                    </div>

                    <h1 className="font-display text-display text-foreground mb-2">Welcome to Twofold</h1>
                    <p className="text-subheading text-muted mb-1">Hey, {user?.displayName?.split(' ')[0] || 'there'}!</p>
                    <p className="text-muted mb-8">
                        Your digital locket awaits. Create one to start capturing your story together.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/locket-create"
                            className="block w-full bg-primary text-primary-foreground px-6 py-4 rounded-lg font-medium hover:brightness-110 transition-all shadow-sm"
                        >
                            Create Your Locket
                        </Link>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-background px-4 text-body-sm text-faint">or</span>
                            </div>
                        </div>

                        <p className="text-body-sm text-faint">
                            Have an invite code? Enter it on the invite page or ask your partner to share their link.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Render ImmersiveHome with locket and user
    return (
        <ImmersiveHome
            locket={currentLocket}
            user={{
                uid: user?.uid || '',
                displayName: user?.displayName
            }}
        />
    );
}
