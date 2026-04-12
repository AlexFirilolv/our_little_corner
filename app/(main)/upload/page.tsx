'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';
import UploadMemory from '@/components/UploadMemory';
import { ImageIcon, Flag, StickyNote, List, ArrowLeft, Loader2, Check } from 'lucide-react';

type CreationType = 'select' | 'memory' | 'milestone' | 'note' | 'bucket';

export default function UploadPage() {
  const { currentLocket, loading } = useLocket();
  const router = useRouter();
  const [step, setStep] = useState<CreationType>('select');

  React.useEffect(() => {
    if (!loading && !currentLocket) {
      router.push('/locket-create');
    }
  }, [loading, currentLocket, router]);

  if (loading || !currentLocket) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'memory') return <UploadMemory />;
  if (step === 'milestone') return <UploadMemory isMilestone />;
  if (step === 'note') return <CreateNote onCancel={() => setStep('select')} />;
  if (step === 'bucket') return <CreateBucketItem onCancel={() => setStep('select')} />;

  const cards = [
    {
      key: 'memory' as const,
      icon: ImageIcon,
      label: 'Memory',
      sub: 'Photo or Video',
      surfaceColor: 'bg-surface-rose',
      iconColor: 'text-primary',
    },
    {
      key: 'milestone' as const,
      icon: Flag,
      label: 'Milestone',
      sub: 'Major Life Event',
      surfaceColor: 'bg-surface-amber',
      iconColor: 'text-accent',
    },
    {
      key: 'note' as const,
      icon: StickyNote,
      label: 'Love Note',
      sub: 'Text Only',
      surfaceColor: 'bg-surface-rose',
      iconColor: 'text-primary',
    },
    {
      key: 'bucket' as const,
      icon: List,
      label: 'Bucket List',
      sub: 'Shared Goal',
      surfaceColor: 'bg-surface-green',
      iconColor: 'text-secondary',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl min-h-screen">
      <div className="text-center mb-10 animate-fade-in">
        <p className="overline text-faint mb-3">Add to your locket</p>
        <h1 className="font-display text-display text-foreground tracking-tight">
          Create Something
        </h1>
        <p className="text-muted mt-2 font-serif italic">
          What would you like to add to {currentLocket.name}?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => setStep(card.key)}
              className="group relative overflow-hidden rounded-xl border border-border bg-elevated transition-all duration-200 hover:border-border-emphasis hover:shadow-md hover:-translate-y-0.5 aspect-square flex flex-col items-center justify-center p-6"
            >
              <div className={`relative w-14 h-14 rounded-xl ${card.surfaceColor} flex items-center justify-center mb-4 ${card.iconColor} group-hover:scale-105 transition-transform duration-200`}>
                <Icon size={28} strokeWidth={1.5} />
              </div>
              <span className="font-display text-subheading text-foreground">{card.label}</span>
              <span className="text-caption text-faint mt-1">{card.sub}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => router.back()}
        className="mt-10 flex items-center justify-center w-full text-faint hover:text-muted transition-colors py-2 group"
      >
        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="text-body-sm">Back</span>
      </button>
    </div>
  );
}

// ── Sub-components ──

function CreateNote({ onCancel }: { onCancel: () => void }) {
  const { currentLocket } = useLocket();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !currentLocket) return;

    setLoading(true);
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locket_id: currentLocket.id,
          title: 'Love Note',
          description: note
        })
      });

      if (res.ok) {
        router.push('/timeline');
      }
    } catch (error) {
      console.error("Failed to create note", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg min-h-screen flex flex-col">
      <button onClick={onCancel} className="mb-6 flex items-center text-faint hover:text-muted transition-colors self-start group">
        <ArrowLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <h1 className="font-display text-heading text-foreground mb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-rose flex items-center justify-center">
          <StickyNote className="text-primary w-5 h-5" />
        </div>
        Write a Love Note
      </h1>
      <p className="text-muted text-body-sm font-serif italic mb-6">Something sweet for your person</p>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write something sweet..."
          className="flex-1 w-full bg-elevated border border-border rounded-xl p-6 text-lg font-serif italic text-foreground/80 placeholder:text-faint resize-none min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          autoFocus
        />

        <button
          type="submit"
          disabled={!note.trim() || loading}
          className="mt-6 w-full py-4 bg-primary hover:brightness-110 text-primary-foreground rounded-lg font-bold shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Check />}
          Post Note
        </button>
      </form>
    </div>
  );
}

function CreateBucketItem({ onCancel }: { onCancel: () => void }) {
  const { currentLocket } = useLocket();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a goal or dream');
      return;
    }

    if (!currentLocket) {
      setError('No locket selected');
      return;
    }

    setLoading(true);
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch('/api/bucket-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locketId: currentLocket.id,
          title: title,
          category: 'other'
        })
      });

      if (res.ok) {
        router.push('/lists');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add item');
      }
    } catch (error) {
      console.error("Failed to create bucket item", error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg min-h-screen">
      <button onClick={onCancel} className="mb-6 flex items-center text-faint hover:text-muted transition-colors self-start group">
        <ArrowLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <h1 className="font-display text-heading text-foreground mb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-green flex items-center justify-center">
          <List className="text-secondary w-5 h-5" />
        </div>
        Add to Bucket List
      </h1>
      <p className="text-muted text-body-sm font-serif italic mb-6">A dream you share together</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="overline text-faint mb-3 block">Goal / Dream</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Visit Japan"
            className="w-full bg-elevated border border-border rounded-md px-4 py-3 text-body font-body text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-destructive text-body-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary hover:brightness-110 text-primary-foreground rounded-lg font-bold shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Check />}
          Add to List
        </button>
      </form>
    </div>
  );
}
