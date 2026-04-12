'use client';

import React from 'react';
import { Loader2, Flag, Star } from 'lucide-react';
import { useLocket } from '@/contexts/LocketContext';

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
                const res = await fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const allGroups = data.memoryGroups || [];
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
            <div className="card-base p-6 text-center">
                <h2 className="font-display text-heading text-foreground mb-2 flex items-center justify-center gap-2">
                    <Flag className="w-5 h-5 text-accent" />
                    Milestones
                </h2>
                <p className="text-muted text-body-sm mb-4">No milestones recorded yet.</p>
                <div className="p-4 border border-dashed border-border rounded-lg bg-background text-body-sm text-faint font-serif italic">
                    Mark a memory as a &ldquo;Milestone&rdquo; to see it here!
                </div>
            </div>
        )
    }

    return (
        <div className="card-base p-6">
            <h2 className="font-display text-heading text-foreground mb-6 flex items-center gap-2">
                <Flag className="w-5 h-5 text-accent" />
                Milestones
            </h2>

            <div className="relative border-l-2 border-border ml-3 space-y-6 pb-2">
                {milestones.map((milestone) => {
                    const Icon = Star;
                    return (
                        <div key={milestone.id} className="relative pl-8">
                            {/* Dot on the line */}
                            <div className="absolute -left-[6px] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-elevated z-10" />

                            <div className="group cursor-pointer hover:translate-x-1 transition-transform">
                                <div className="flex items-center mb-1.5">
                                    <span className="overline text-faint mr-3">
                                        {new Date(milestone.date_taken || milestone.created_at).toLocaleDateString()}
                                    </span>
                                    <div className="h-px bg-border flex-1" />
                                </div>

                                <div className="flex items-start">
                                    <div className="mr-3 p-2 bg-surface-amber rounded-lg text-accent group-hover:bg-accent/20 transition-colors">
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-display text-body text-foreground font-semibold group-hover:text-primary transition-colors">{milestone.title}</h3>
                                        {milestone.description && (
                                            <p className="text-body-sm text-muted leading-relaxed mt-0.5">{milestone.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="w-full mt-6 py-2 text-center overline text-faint">
                Mark memories as milestones to grow this journey
            </div>
        </div>
    );
}
