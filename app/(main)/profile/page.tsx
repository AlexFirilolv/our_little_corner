'use client';

import React from 'react';
import { CountdownWidget } from './components/CountdownWidget';
import { Settings, LogOut, Loader2, Users, UserPlus, List } from 'lucide-react';
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-heading text-2xl text-primary font-bold mb-2">No Locket Selected</h1>
          <p className="text-muted-foreground mb-6">
            Create or join a locket to build your profile together.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  // Get member names for display
  const memberNames = members.map(m => m.display_name || 'Partner').join(' & ');
  const createdYear = currentLocket.created_at ? new Date(currentLocket.created_at).getFullYear() : new Date().getFullYear();

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Left Column: Profile Info & Countdown */}
        <div className="md:col-span-4 space-y-8">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-rose-100/50" />

            <div className="relative mt-8 mb-4 flex justify-center -space-x-4">
              {members.slice(0, 2).map((member, index) => {
                const colors = [
                  { bg: 'bg-rose-200', text: 'text-rose-500' },
                  { bg: 'bg-indigo-200', text: 'text-indigo-500' }
                ];
                const colorSet = colors[index % colors.length];
                const initial = member.display_name?.charAt(0).toUpperCase() || '?';

                return member.avatar_url ? (
                  <div key={member.id} className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden relative">
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
                    className={`w-20 h-20 rounded-full border-4 border-white shadow-md ${colorSet.bg} flex items-center justify-center text-2xl`}
                  >
                    <span className={`font-heading ${colorSet.text}`}>{initial}</span>
                  </div>
                );
              })}
              {members.length < 2 && (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            <h2 className="font-heading text-xl font-bold text-truffle">
              {memberNames || currentLocket.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Writing our story since {createdYear}</p>

            <div className="grid grid-cols-2 gap-2 border-t border-rose-50 pt-4">
              <div className="text-center">
                <span className="block font-bold text-lg text-primary">{stats.memories}</span>
                <span className="text-xs text-muted-foreground">Memories</span>
              </div>
              <div className="text-center border-l border-rose-50">
                <span className="block font-bold text-lg text-primary">{stats.places}</span>
                <span className="text-xs text-muted-foreground">Places</span>
              </div>
            </div>
          </div>

          {currentLocket.next_countdown_date && currentLocket.next_countdown_event_name && (
            <CountdownWidget
              targetDate={new Date(currentLocket.next_countdown_date)}
              title={currentLocket.next_countdown_event_name}
            />
          )}

          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors border-b border-rose-50 text-left">
              <div className="flex items-center space-x-3 text-truffle">
                <Settings size={20} className="text-muted-foreground" />
                <span className="font-medium">Settings</span>
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-left text-red-500 hover:text-red-600"
            >
              <div className="flex items-center space-x-3">
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Quick Links & Settings */}
        <div className="md:col-span-8 space-y-8">
          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/lists"
              className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <List size={24} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-medium text-truffle">Our Lists</h3>
                  <p className="text-sm text-muted-foreground">Bucket list & favorites</p>
                </div>
              </div>
            </Link>

            <Link
              href="/timeline"
              className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-medium text-truffle">Timeline</h3>
                  <p className="text-sm text-muted-foreground">{stats.memories} memories</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Settings Section (Mobile) */}
          <div className="md:hidden bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors border-b border-rose-50 text-left">
              <div className="flex items-center space-x-3 text-truffle">
                <Settings size={20} className="text-muted-foreground" />
                <span className="font-medium">Settings</span>
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-left text-red-500 hover:text-red-600"
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
