'use client';

import React from 'react';
import { Loader2, Flag, Heart, Home, Plane, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';

export function MilestoneList() {
    const { currentLocket } = useLocket();
    const [milestones, setMilestones] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchMilestones() {
            if (!currentLocket) return;
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();
                // Fetch all memory groups for this locket
                const res = await fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const allGroups = data.memoryGroups || [];
                    // Filter for milestones
                    const milestonGroups = allGroups.filter((g: any) => g.is_milestone);
                    setMilestones(milestonGroups);
                }
            } catch (error) {
                console.error("Failed to fetch milestones", error);
            } finally {
                setLoading(false);
            }
        }

        if (currentLocket) {
            fetchMilestones();
        } else {
            setLoading(false);
        }
    }, [currentLocket]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary/50" /></div>;

    if (milestones.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 text-center">
                <h2 className="font-heading text-2xl text-primary mb-2 flex items-center justify-center gap-2">
                    <Flag className="w-6 h-6" />
                    Milestones
                </h2>
                <p className="text-muted-foreground mb-4">No milestones recorded yet.</p>
                <div className="p-4 border border-dashed border-rose-200 rounded-xl bg-rose-50/50 text-sm text-muted-foreground">
                    When you create a memory, mark it as a "Milestone" to see it here!
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6">
            <h2 className="font-heading text-2xl text-primary mb-6 flex items-center">
                <Flag className="mr-2 w-6 h-6" />
                Milestones
            </h2>

            <div className="relative border-l-2 border-rose-200 ml-3 space-y-8 pb-2">
                {milestones.map((milestone, index) => {
                    // Default icon for now, real app would store icon type in metadata
                    const Icon = Star;
                    return (
                        <div key={milestone.id} className="relative pl-8">
                            {/* Dot on the line */}
                            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-accent border-2 border-white shadow-sm z-10" />

                            <div className="group cursor-pointer hover:translate-x-1 transition-transform">
                                <div className="flex items-center mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-3">
                                        {new Date(milestone.date_taken || milestone.created_at).toLocaleDateString()}
                                    </span>
                                    <div className="h-px bg-rose-50 flex-1" />
                                </div>

                                <div className="flex items-start">
                                    <div className="mr-3 p-2 bg-rose-50 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-heading text-lg text-truffle font-bold group-hover:text-primary transition-colors">{milestone.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action button implies create flow which we aren't linking closely yet */}
            <div className="w-full mt-8 py-3 text-center text-xs text-muted-foreground">
                Marks memories as milestones to add them to this journey.
            </div>
        </div>
    );
}
