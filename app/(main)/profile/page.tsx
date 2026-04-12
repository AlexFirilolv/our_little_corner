'use client';

import React from 'react';
import { CountdownWidget } from './components/CountdownWidget';
import { Settings, LogOut, Loader2, Users, UserPlus, List, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface LocketMember {
  id: string;
  display_name?: string;
  avatar_url?: string;
  firebase_uid: string;
}

interface ProfileStats {
  memories: number;
  places: number;
}

export default function ProfilePage() {
  const { currentLocket, loading: locketLoading } = useLocket();
  const { user, signOut } = useAuth();
  const [members, setMembers] = React.useState<LocketMember[]>([]);
  const [stats, setStats] = React.useState<ProfileStats>({ memories: 0, places: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      if (!currentLocket) return;
      try {
        const { getCurrentUserToken } = await import('@/lib/firebase/auth');
        const token = await getCurrentUserToken();

        const [membersRes, memoriesRes] = await Promise.all([
          fetch(`/api/lockets/${currentLocket.id}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.users || []);
        }

        if (memoriesRes.ok) {
          const data = await memoriesRes.json();
          const groups = data.memoryGroups || [];
          const uniquePlaces = new Set(
            groups
              .flatMap((g: any) => g.media_items || [])
              .map((m: any) => m.place_name)
              .filter(Boolean)
          );
          setStats({
            memories: groups.length,
            places: uniquePlaces.size
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile data", error);
      } finally {
        setLoading(false);
      }
    }

    if (currentLocket) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentLocket]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  if (locketLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentLocket) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-heading text-foreground mb-2">No Locket Selected</h1>
          <p className="text-muted mb-6">
            Create or join a locket to build your profile together.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:brightness-110 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const memberNames = members.map(m => m.display_name || 'Partner').join(' & ');
  const createdYear = currentLocket.created_at ? new Date(currentLocket.created_at).getFullYear() : new Date().getFullYear();

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Left Column: Profile Info & Countdown */}
        <div className="md:col-span-4 space-y-6">
          {/* Profile Card */}
          <div className="card-base p-6 text-center relative overflow-hidden animate-fade-in">
            <div className="relative mt-4 mb-4 flex justify-center -space-x-4">
              {members.slice(0, 2).map((member, index) => {
                const bgColors = ['bg-surface-rose', 'bg-surface-amber'];
                const textColors = ['text-primary', 'text-accent'];
                const initial = member.display_name?.charAt(0).toUpperCase() || '?';

                return member.avatar_url ? (
                  <div key={member.id} className="w-20 h-20 rounded-full border-4 border-background overflow-hidden relative ring-2 ring-primary/20">
                    <Image
                      src={member.avatar_url}
                      alt={member.display_name || 'Partner'}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    key={member.id}
                    className={`w-20 h-20 rounded-full border-4 border-background ring-2 ring-primary/20 ${bgColors[index % 2]} flex items-center justify-center text-2xl`}
                  >
                    <span className={`font-display ${textColors[index % 2]}`}>{initial}</span>
                  </div>
                );
              })}
              {members.length < 2 && (
                <div className="w-20 h-20 rounded-full border-4 border-background bg-elevated flex items-center justify-center ring-2 ring-primary/20">
                  <UserPlus className="w-8 h-8 text-faint" />
                </div>
              )}
            </div>

            <h2 className="font-display text-heading text-foreground">
              {memberNames || currentLocket.name}
            </h2>
            <p className="text-body-sm text-muted font-serif italic mb-6">Writing our story since {createdYear}</p>

            <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
              <div className="text-center">
                <span className="block font-bold text-subheading font-display text-primary">{stats.memories}</span>
                <span className="overline text-faint">Memories</span>
              </div>
              <div className="text-center border-l border-border">
                <span className="block font-bold text-subheading font-display text-secondary">{stats.places}</span>
                <span className="overline text-faint">Places</span>
              </div>
            </div>
          </div>

          {currentLocket.next_countdown_date && currentLocket.next_countdown_event_name && (
            <div className="animate-fade-in-up">
              <CountdownWidget
                targetDate={new Date(currentLocket.next_countdown_date)}
                title={currentLocket.next_countdown_event_name}
              />
            </div>
          )}

          {/* Settings / Logout */}
          <div className="hidden md:block card-base overflow-hidden animate-fade-in-up">
            <Link
              href="/settings"
              className="w-full flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors border-b border-border text-left"
            >
              <div className="flex items-center space-x-3 text-muted">
                <Settings size={20} />
                <span className="font-medium text-foreground">Settings</span>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors text-left text-destructive"
            >
              <div className="flex items-center space-x-3">
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Quick Links */}
        <div className="md:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
            <Link
              href="/lists"
              className="card-base p-6 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-amber rounded-xl flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                  <List size={24} />
                </div>
                <div>
                  <h3 className="font-display text-subheading text-foreground">Our Lists</h3>
                  <p className="text-body-sm text-muted">Bucket list & favorites</p>
                </div>
              </div>
            </Link>

            <Link
              href="/timeline"
              className="card-base p-6 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-rose rounded-xl flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Heart size={24} />
                </div>
                <div>
                  <h3 className="font-display text-subheading text-foreground">Timeline</h3>
                  <p className="text-body-sm text-muted">{stats.memories} memories</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Mobile Settings */}
          <div className="md:hidden card-base overflow-hidden">
            <Link
              href="/settings"
              className="w-full flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors border-b border-border text-left"
            >
              <div className="flex items-center space-x-3 text-muted">
                <Settings size={20} />
                <span className="font-medium text-foreground">Settings</span>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors text-left text-destructive"
            >
              <div className="flex items-center space-x-3">
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
