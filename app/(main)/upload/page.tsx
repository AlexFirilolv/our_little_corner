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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl min-h-screen">
      <h1 className="font-heading text-3xl text-primary font-bold mb-2 text-center">Create New Entry</h1>
      <p className="text-muted-foreground text-center mb-8">What would you like to add to {currentLocket.name}?</p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setStep('memory')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-rose-100 shadow-sm hover:shadow-md hover:border-primary/50 transition-all group aspect-square"
        >
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
            <ImageIcon size={32} />
          </div>
          <span className="font-heading text-lg font-bold text-truffle">Memory</span>
          <span className="text-xs text-muted-foreground mt-1">Photo or Video</span>
        </button>

        <button
          onClick={() => setStep('milestone')}
          className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group aspect-square"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
            <Flag size={32} />
          </div>
          <span className="font-heading text-lg font-bold text-truffle">Milestone</span>
          <span className="text-xs text-muted-foreground mt-1">Major Life Event</span>
        </button>

        <button
          onClick={() => setStep('note')}
          className="flex flex-col items-center justify-center p-6 bg-amber-50/50 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group aspect-square"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4 text-amber-600 group-hover:scale-110 transition-transform">
            <StickyNote size={32} />
          </div>
          <span className="font-heading text-lg font-bold text-truffle">Love Note</span>
          <span className="text-xs text-muted-foreground mt-1">Text Only</span>
        </button>

        <button
          onClick={() => setStep('bucket')}
          className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group aspect-square"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
            <List size={32} />
          </div>
          <span className="font-heading text-lg font-bold text-truffle">Bucket List</span>
          <span className="text-xs text-muted-foreground mt-1">Shared Goal</span>
        </button>
      </div>

      <button
        onClick={() => router.back()}
        className="mt-8 flex items-center justify-center w-full text-muted-foreground hover:text-primary transition-colors py-2"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back
      </button>
    </div>
  );
}

// Sub-components for simpler forms (Note & Bucket)

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
      <button onClick={onCancel} className="mb-6 flex items-center text-muted-foreground hover:text-primary transition-colors self-start">
        <ArrowLeft size={20} className="mr-1" /> Back
      </button>

      <h1 className="font-heading text-2xl font-bold text-amber-700 mb-6 flex items-center gap-2">
        <StickyNote className="text-amber-500" />
        Write a Love Note
      </h1>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write something sweet..."
          className="flex-1 w-full bg-[#fdfbf7] border border-amber-200 rounded-xl p-6 text-lg font-serif italic text-truffle placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-200/50 resize-none shadow-inner"
          autoFocus
        />

        <button
          type="submit"
          disabled={!note.trim() || loading}
          className="mt-6 w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold shadow-lg shadow-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      <button onClick={onCancel} className="mb-6 flex items-center text-muted-foreground hover:text-primary transition-colors self-start">
        <ArrowLeft size={20} className="mr-1" /> Back
      </button>

      <h1 className="font-heading text-2xl font-bold text-emerald-700 mb-6 flex items-center gap-2">
        <List className="text-emerald-500" />
        Add to Bucket List
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">Goal / Dream</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Visit Japan"
            className="w-full bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 text-lg font-medium text-truffle focus:outline-none focus:ring-2 focus:ring-emerald-200/50 placeholder:text-muted-foreground/50"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Check />}
          Add to List
        </button>
      </form>
    </div>
  );
}