'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus, Search, Calendar, Cloud, ArrowRight, Pin, Check, ShoppingCart,
  FileText, Gift, Paintbrush, Camera,
} from 'lucide-react';
import { getCurrentUserToken } from '@/lib/firebase/auth';
import { dateIdeas } from '@/lib/data/date-night-ideas';
import { EditMemoryModal } from '@/(main)/timeline/components/EditMemoryModal';
import { CommentsPanel } from '@/(main)/timeline/components/CommentsPanel';
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal';
import type {
  Locket, MemoryGroup, MediaItem as MediaItemType, Gratitude, DateNightPick,
  BucketListItem, Chore, GroceryItem, DocumentRecord, WishlistItem,
} from '@/lib/types';

interface TodayGlanceHomeProps {
  locket: Locket;
  user: { uid: string; displayName?: string | null };
}

type FeedEvent = {
  id: string;
  time: string;
  who: string;
  what: string;
  tone: 'rose' | 'green' | 'amber' | 'plum';
  group?: MemoryGroup;
};

function useAuthedFetch() {
  return useCallback(async (url: string, init?: RequestInit) => {
    const token = await getCurrentUserToken();
    return fetch(url, {
      ...init,
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    });
  }, []);
}

function fmtTime(iso: string | Date): string {
  const ts = new Date(iso);
  const now = new Date();
  const sameDay = ts.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const isYest = ts.toDateString() === yest.toDateString();
  if (sameDay) return ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isYest) return 'Yesterday';
  return ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function relTime(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TodayGlanceHome({ locket, user }: TodayGlanceHomeProps) {
  const authedFetch = useAuthedFetch();

  const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
  const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
  const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
  const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });

  const [allGroups, setAllGroups] = useState<MemoryGroup[]>([]);
  const [spotlight, setSpotlight] = useState<MemoryGroup | null>(null);
  const [reminisce, setReminisce] = useState<MemoryGroup[]>([]);
  const [gratitudes, setGratitudes] = useState<Gratitude[]>([]);
  const [datePick, setDatePick] = useState<DateNightPick | null>(null);
  const [bucketItems, setBucketItems] = useState<BucketListItem[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [grocery, setGrocery] = useState<GroceryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Single fetch burst
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lid = locket.id;
      const results = await Promise.allSettled([
        authedFetch(`/api/memory-groups?locketId=${lid}&includeMedia=true`).then(r => r.json()),
        authedFetch(`/api/memory-groups/spotlight?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/reminisce?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/gratitudes?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/date-nights/picks?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/bucket-list?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/chores?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/grocery?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/documents?locketId=${lid}`).then(r => r.json()),
        authedFetch(`/api/wishlist?locketId=${lid}`).then(r => r.json()),
      ]);
      if (cancelled) return;
      const [mg, sp, rm, gr, dp, bl, ch, gc, dc, wl] = results;
      if (mg.status === 'fulfilled') setAllGroups(mg.value.memoryGroups ?? []);
      if (sp.status === 'fulfilled') setSpotlight(sp.value.data ?? null);
      if (rm.status === 'fulfilled') setReminisce(rm.value.memories ?? []);
      if (gr.status === 'fulfilled') setGratitudes(gr.value.gratitudes ?? []);
      if (dp.status === 'fulfilled') {
        const picks: DateNightPick[] = dp.value.picks ?? [];
        setDatePick(picks.find(p => p.status === 'saved') ?? null);
      }
      if (bl.status === 'fulfilled') setBucketItems(bl.value.items ?? []);
      if (ch.status === 'fulfilled') setChores(ch.value.chores ?? []);
      if (gc.status === 'fulfilled') setGrocery((gc.value.items ?? []).filter((i: GroceryItem) => !i.checked));
      if (dc.status === 'fulfilled') setDocuments(dc.value.documents ?? []);
      if (wl.status === 'fulfilled') setWishlist((wl.value.items ?? []).filter((i: WishlistItem) => i.status === 'open'));
    })();
    return () => { cancelled = true; };
  }, [locket.id, authedFetch]);

  // Derived values
  const firstName = user.displayName?.split(' ')[0] || 'Love';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const daysTogether = locket.anniversary_date
    ? Math.floor((Date.now() - new Date(locket.anniversary_date).getTime()) / 86_400_000)
    : null;
  const anniversary = locket.anniversary_date
    ? new Date(locket.anniversary_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const targetDate = locket.next_countdown_date ? new Date(locket.next_countdown_date) : null;
  const countdownTitle = locket.next_countdown_event_name || (locket.anniversary_date ? 'Anniversary' : 'next');
  const countdownDays = targetDate ? Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000)) : null;
  const countdownProgress = (() => {
    if (!targetDate || countdownDays === null) return null;
    const total = 365;
    return Math.min(1, Math.max(0, (total - countdownDays) / total));
  })();

  const { memoriesYear, memoriesWeek, milestonesYear } = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const weekAgo = now.getTime() - 7 * 86_400_000;
    let y = 0, w = 0, ms = 0;
    for (const g of allGroups) {
      const t = g.date_taken ? new Date(g.date_taken).getTime() : new Date(g.created_at).getTime();
      if (t >= yearStart) {
        y++;
        if (g.is_milestone) ms++;
      }
      if (t >= weekAgo) w++;
    }
    return { memoriesYear: y, memoriesWeek: w, milestonesYear: ms };
  }, [allGroups]);

  // Partner gratitude to show in the "from your partner" card (replaces fridge)
  const partnerGratitude = useMemo(
    () => gratitudes.find(g => g.to_uid === user.uid) ?? null,
    [gratitudes, user.uid]
  );
  const othersGratitudes = useMemo(
    () => gratitudes.filter(g => !partnerGratitude || g.id !== partnerGratitude.id).slice(0, 2),
    [gratitudes, partnerGratitude]
  );

  const activity: FeedEvent[] = useMemo(() => {
    return [...allGroups]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map(g => ({
        id: g.id,
        time: fmtTime(g.created_at),
        who: g.creator_name || 'Someone',
        what: g.is_milestone
          ? `added milestone "${g.title ?? 'untitled'}"`
          : `shared "${g.title ?? 'a new memory'}"`,
        tone: g.is_milestone ? 'amber' : 'rose',
        group: g,
      }));
  }, [allGroups]);

  const dateIdea = datePick ? dateIdeas.find(i => i.id === datePick.idea_id) : null;

  const handleViewMemory = useCallback(async (g: MemoryGroup) => {
    setViewingMemory(g);
    try {
      const res = await authedFetch(`/api/memory-groups/${g.id}/like?locketId=${locket.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
      }
    } catch (e) { console.error(e); }
  }, [authedFetch, locket.id]);

  const handleViewMemoryLike = useCallback(async () => {
    if (!viewingMemory) return;
    try {
      const res = await authedFetch(`/api/memory-groups/${viewingMemory.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locket_id: locket.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
      }
    } catch (e) { console.error(e); }
  }, [authedFetch, locket.id, viewingMemory]);

  const completeChore = async (id: string) => {
    await authedFetch(`/api/chores/${id}/complete?locketId=${locket.id}`, { method: 'POST' });
    const r = await authedFetch(`/api/chores?locketId=${locket.id}`).then(r => r.json());
    setChores(r.chores ?? []);
  };

  const toggleBucket = async (item: BucketListItem) => {
    const newStatus = item.status === 'active' ? 'completed' : 'active';
    await authedFetch(`/api/bucket-list/${item.id}?locketId=${locket.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setBucketItems(prev => prev.map(b => b.id === item.id ? { ...b, status: newStatus } : b));
  };

  const spotlightImage = spotlight?.media_items?.[0];
  const reminiscePhotos = reminisce.flatMap(m => m.media_items ?? []).slice(0, 3);

  const bucketDone = bucketItems.filter(b => b.status === 'completed').length;
  const bucketShown = [...bucketItems].sort((a, b) => (a.status === 'active' ? -1 : 1)).slice(0, 6);

  const expiringSoon = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 90 * 86_400_000;
    return documents
      .filter(d => d.expiry_date)
      .map(d => ({ ...d, days: Math.ceil((new Date(d.expiry_date!).getTime() - now) / 86_400_000) }))
      .filter(d => d.days >= 0 && d.days <= 90)
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
  }, [documents]);

  const choreColor = (uid: string | null) => {
    if (!uid) return 'var(--surface-amber)';
    return uid === user.uid ? 'var(--surface-rose)' : 'var(--surface-green)';
  };
  const choreLabel = (uid: string | null) => (!uid ? 'Shared' : uid === user.uid ? 'You' : 'Partner');
  const choreDue = (next: string) => {
    const d = Math.ceil((new Date(next).getTime() - Date.now()) / 86_400_000);
    if (d < 0) return `${-d}d late`;
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d < 7) return new Date(next).toLocaleDateString(undefined, { weekday: 'short' });
    return new Date(next).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="tg-root">
      <style jsx global>{css}</style>

      <div className="tg-shell">
        {/* Topbar */}
        <header className="tg-topbar">
          <div>
            <div className="tg-faint">{greeting}, {firstName}</div>
            <h1 className="tg-h1">Today, together.</h1>
          </div>
          <div className="tg-top-actions">
            <Link href="/timeline" className="tg-search">
              <Search size={14} /> <span>Search memories, places, notes…</span>
            </Link>
            <Link href="/upload" className="tg-btn tg-btn-solid">
              <Plus size={14} /> Add
            </Link>
          </div>
        </header>

        {/* KPI strip */}
        <div className="tg-glance">
          <div className="tg-kpi">
            <div className="tg-kpi-k">Days together</div>
            <div className="tg-kpi-v" style={{ color: 'var(--primary)' }}>
              {daysTogether !== null ? daysTogether.toLocaleString() : '—'}
            </div>
            <div className="tg-faint tg-caption">
              {anniversary ? <>since {anniversary}</> : 'set your anniversary'}
            </div>
          </div>
          <div className="tg-kpi">
            <div className="tg-kpi-k">Until {countdownTitle}</div>
            <div className="tg-kpi-v">
              {countdownDays !== null ? countdownDays : '—'}
              <span className="tg-kpi-unit">{countdownDays === 1 ? 'day' : 'days'}</span>
            </div>
            {countdownProgress !== null ? (
              <div className="tg-kpi-bar"><span style={{ width: `${Math.round(countdownProgress * 100)}%` }} /></div>
            ) : (
              <div className="tg-faint tg-caption">add a countdown</div>
            )}
          </div>
          <div className="tg-kpi">
            <div className="tg-kpi-k">Memories this year</div>
            <div className="tg-kpi-v">{memoriesYear}</div>
            <div className="tg-faint tg-caption">
              {memoriesWeek > 0 ? `+${memoriesWeek} this week` : 'none this week'}
            </div>
          </div>
          <div className="tg-kpi tg-kpi-weather">
            <div className="tg-kpi-k">Milestones</div>
            <div className="tg-kpi-v">{milestonesYear}</div>
            <div className="tg-faint tg-caption"><Cloud size={11} /> this year</div>
          </div>
        </div>

        {/* Split pane */}
        <div className="tg-split">

          {/* Left column */}
          <section className="tg-col-l">

            {/* Partner gratitude (prominent — replaces fridge) */}
            <article className="tg-card tg-pinned">
              {partnerGratitude ? (
                <>
                  <div className="tg-row-between">
                    <span className="tg-chip"><Pin size={10} /> From your partner</span>
                    <span className="tg-faint">{relTime(partnerGratitude.created_at)}</span>
                  </div>
                  <p className="tg-pinned-text">&ldquo;{partnerGratitude.text}&rdquo;</p>
                  <div className="tg-pinned-actions">
                    <Link href="/gratitude" className="tg-link">Reply</Link>
                    <Link href="/gratitude" className="tg-link-ghost">View all</Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="tg-row-between">
                    <span className="tg-chip"><Pin size={10} /> Gratitude</span>
                  </div>
                  <p className="tg-pinned-text">Leave a note of thanks — the little things add up.</p>
                  <div className="tg-pinned-actions">
                    <Link href="/gratitude" className="tg-link">Write one</Link>
                  </div>
                </>
              )}
            </article>

            {/* Spotlight + Reminisce row */}
            <div className="tg-mem-row">
              <article className="tg-card tg-spot" onClick={() => spotlight && handleViewMemory(spotlight)} role={spotlight ? 'button' : undefined}>
                <div className="tg-spot-photo">
                  {spotlightImage?.storage_url ? (
                    <Image
                      src={spotlightImage.storage_url}
                      alt={spotlight?.title || 'Spotlight'}
                      fill
                      className="tg-spot-img"
                      sizes="160px"
                      unoptimized
                    />
                  ) : (
                    <div className="tg-photo-stub tg-tone-rose">
                      <Camera size={22} />
                    </div>
                  )}
                </div>
                <div className="tg-spot-body">
                  <div className="tg-overline">Spotlight</div>
                  <h3 className="tg-h3">{spotlight?.title ?? 'No spotlight yet'}</h3>
                  <div className="tg-faint tg-caption">
                    {spotlight?.date_taken
                      ? new Date(spotlight.date_taken).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : 'Add a memory'}
                    {spotlight ? ` · ${spotlight.media_count ?? spotlight.media_items?.length ?? 0} photos` : ''}
                  </div>
                  <button className="tg-btn tg-btn-ghost tg-btn-sm tg-spot-cta">
                    {spotlight ? <>Open memory <ArrowRight size={12} /></> : <>Add memory <Plus size={12} /></>}
                  </button>
                </div>
              </article>

              <article className="tg-card tg-rem">
                <div className="tg-overline">Reminisce · this day</div>
                <h3 className="tg-h3" style={{ fontSize: 17 }}>
                  {reminisce[0]?.title ?? 'On this day'}
                </h3>
                <div className="tg-rem-grid">
                  {[0, 1, 2].map(i => {
                    const p = reminiscePhotos[i];
                    if (p?.storage_url) {
                      return (
                        <div key={p.id} className="tg-rem-tile" onClick={() => {
                          const m = reminisce.find(r => r.media_items?.some(mi => mi.id === p.id));
                          if (m) handleViewMemory(m);
                        }}>
                          <Image src={p.storage_url} alt="" fill sizes="80px" unoptimized className="tg-rem-img" />
                        </div>
                      );
                    }
                    return <div key={i} className={`tg-rem-tile tg-photo-stub tg-tone-${i === 0 ? 'amber' : i === 1 ? 'plum' : 'green'}`} />;
                  })}
                </div>
                {reminisce.length > 0 ? (
                  <button className="tg-link" onClick={() => reminisce[0] && handleViewMemory(reminisce[0])}>
                    See all {reminiscePhotos.length} <ArrowRight size={12} />
                  </button>
                ) : (
                  <span className="tg-faint tg-caption">Nothing from past years yet.</span>
                )}
              </article>
            </div>

            {/* Activity feed */}
            <article className="tg-card tg-feed">
              <div className="tg-row-between" style={{ marginBottom: 12 }}>
                <div>
                  <div className="tg-overline">Shared activity</div>
                  <h3 className="tg-h3">What&rsquo;s happening in your locket</h3>
                </div>
              </div>
              {activity.length === 0 ? (
                <p className="tg-faint tg-caption" style={{ padding: '12px 0' }}>No activity yet. Add a memory to start the feed.</p>
              ) : (
                <ol className="tg-feed-list">
                  {activity.map(t => (
                    <li key={t.id} onClick={() => t.group && handleViewMemory(t.group)}>
                      <div className="tg-feed-time">{t.time}</div>
                      <div className="tg-feed-dot" style={{
                        background:
                          t.tone === 'rose' ? 'var(--primary)' :
                          t.tone === 'green' ? 'var(--secondary)' :
                          t.tone === 'amber' ? 'var(--accent)' : '#8E6E7A'
                      }} />
                      <div className="tg-feed-body"><strong>{t.who}</strong> {t.what}</div>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </section>

          {/* Right column */}
          <aside className="tg-col-r">

            {/* Date night */}
            <article className="tg-card tg-date">
              <div className="tg-overline">Date night</div>
              <h3 className="tg-h3">{dateIdea?.title ?? 'Pick something sweet'}</h3>
              <div className="tg-date-meta">
                <Calendar size={12} /> {dateIdea?.est_minutes ? `${dateIdea.est_minutes} min` : 'any time'}
                {dateIdea ? ` · ${dateIdea.setting === 'in' ? 'in' : 'out'} · ${dateIdea.vibe}` : ''}
              </div>
              <div className="tg-date-foot">
                <Link href="/date-nights" className="tg-link">{dateIdea ? 'Swap' : 'Browse'}</Link>
                <Link href="/date-nights" className="tg-link-ghost">All ideas</Link>
              </div>
            </article>

            {/* Gratitude (amber) */}
            <article className="tg-card tg-grat">
              <div className="tg-overline">Gratitude</div>
              {othersGratitudes.length === 0 ? (
                <div className="tg-grat-row">
                  <div>
                    <div className="tg-grat-text">&ldquo;A thank-you makes a good day better.&rdquo;</div>
                    <div className="tg-caption tg-faint">write one below</div>
                  </div>
                </div>
              ) : (
                othersGratitudes.map((g, i) => (
                  <div key={g.id} className="tg-grat-row">
                    <span className="tg-grat-dot" style={{ background: i === 0 ? 'var(--primary)' : 'var(--secondary)' }} />
                    <div>
                      <div className="tg-grat-text">&ldquo;{g.text}&rdquo;</div>
                      <div className="tg-caption tg-faint">{relTime(g.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
              <Link href="/gratitude" className="tg-link" style={{ color: '#8A6F2E' }}>+ add a thanks</Link>
            </article>

            {/* Bucket list */}
            <article className="tg-card tg-bucket">
              <div className="tg-row-between">
                <span className="tg-overline">Bucket list</span>
                <span className="tg-faint">{bucketDone} / {bucketItems.length}</span>
              </div>
              {bucketShown.length === 0 ? (
                <span className="tg-faint tg-caption">Dream something up.</span>
              ) : (
                <ul className="tg-buck-list">
                  {bucketShown.map(b => (
                    <li key={b.id} className={b.status === 'completed' ? 'is-done' : ''} onClick={() => toggleBucket(b)}>
                      <span className="tg-buck-check">{b.status === 'completed' ? <Check size={11} /> : null}</span>
                      <span className="tg-buck-text">{b.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            {/* Household */}
            <article className="tg-card tg-house">
              <div className="tg-overline">Household</div>

              <div className="tg-house-block">
                <div className="tg-house-head"><Paintbrush size={12} /> Chores up next</div>
                {chores.length === 0 ? (
                  <span className="tg-faint tg-caption">Nothing scheduled.</span>
                ) : (
                  <ul className="tg-mini-list">
                    {chores.slice(0, 3).map(c => (
                      <li key={c.id}>
                        <span className="tg-who" style={{ background: choreColor(c.assigned_to) }}>{choreLabel(c.assigned_to)}</span>
                        <span className="tg-trunc">{c.name}</span>
                        <span className="tg-faint tg-caption">{choreDue(c.next_due_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="tg-house-block">
                <div className="tg-house-head"><ShoppingCart size={12} /> Grocery ({grocery.length})</div>
                {grocery.length === 0 ? (
                  <span className="tg-faint tg-caption">Fridge is stocked.</span>
                ) : (
                  <div className="tg-tags">
                    {grocery.slice(0, 8).map(g => <span key={g.id} className="tg-tag">{g.name}</span>)}
                  </div>
                )}
              </div>

              <div className="tg-house-grid">
                <div>
                  <div className="tg-house-head"><FileText size={12} /> Expiring</div>
                  {expiringSoon.length === 0 ? (
                    <span className="tg-faint tg-caption">All clear.</span>
                  ) : expiringSoon.map(d => (
                    <div key={d.id} className="tg-mini-row">
                      <span className="tg-trunc">{d.name}</span>
                      <span className="tg-caption" style={{
                        color: d.days < 30 ? 'var(--destructive)' : 'var(--muted)',
                        fontWeight: 600,
                      }}>{d.days}d</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="tg-house-head"><Gift size={12} /> Wishlist</div>
                  {wishlist.length === 0 ? (
                    <span className="tg-faint tg-caption">Nothing yet.</span>
                  ) : wishlist.slice(0, 3).map(w => (
                    <div key={w.id} className="tg-mini-row">
                      <span className="tg-trunc">{w.title}</span>
                      <span className="tg-faint tg-caption">
                        {w.price_cents != null ? `$${(w.price_cents / 100).toFixed(0)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </aside>
        </div>
      </div>

      {/* Modals */}
      {editingMemory && (
        <EditMemoryModal
          isOpen
          onClose={() => setEditingMemory(null)}
          memoryId={editingMemory.id}
          initialTitle={editingMemory.title || ''}
          initialDescription={editingMemory.description}
          initialDate={editingMemory.date_taken ? String(editingMemory.date_taken).split('T')[0] : undefined}
          mediaItems={editingMemory.media_items?.map((m: MediaItemType) => ({
            id: m.id, storage_url: m.storage_url, storage_key: m.storage_key,
            filename: m.filename, file_type: m.file_type,
            date_taken: m.date_taken ? String(m.date_taken) : undefined,
            place_name: m.place_name,
          }))}
          onSaved={() => {}}
        />
      )}
      {commentingMemory && (
        <CommentsPanel
          isOpen
          onClose={() => setCommentingMemory(null)}
          memoryId={commentingMemory.id}
          memoryTitle={commentingMemory.title}
        />
      )}
      {viewingMemory && (
        <MemoryDetailModal
          isOpen
          onClose={() => setViewingMemory(null)}
          memory={{
            ...viewingMemory,
            date_taken: viewingMemory.date_taken ? String(viewingMemory.date_taken) : undefined,
            created_at: String(viewingMemory.created_at),
            media_items: viewingMemory.media_items?.map(m => ({
              ...m,
              date_taken: m.date_taken ? String(m.date_taken) : undefined,
            })),
          }}
          isLiked={viewingMemoryLike.isLiked}
          likeCount={viewingMemoryLike.likeCount}
          onLike={handleViewMemoryLike}
          onEdit={() => { setViewingMemory(null); setEditingMemory(viewingMemory); }}
          onComment={() => {
            setViewingMemory(null);
            setCommentingMemory({ id: viewingMemory.id, title: viewingMemory.title || 'Memory' });
          }}
        />
      )}
    </div>
  );
}

const css = `
.tg-root { --tg-fg: var(--foreground); --tg-bg: var(--background); --tg-elev: var(--elevated);
  --tg-muted: var(--muted); --tg-faint: var(--faint); --tg-border: var(--border);
  --tg-border-em: var(--border-emphasis); --tg-primary: var(--primary); --tg-primary-fg: var(--primary-foreground);
  --tg-secondary: var(--secondary); --tg-secondary-fg: var(--secondary-foreground);
  --tg-accent: var(--accent); --tg-rose: var(--surface-rose); --tg-green: var(--surface-green);
  --tg-amber: var(--surface-amber); --tg-destructive: var(--destructive);
  background: var(--tg-bg); color: var(--tg-fg);
  font-family: var(--font-body, "DM Sans"), system-ui, sans-serif; font-size: 14px;
  min-height: 100vh; padding-bottom: 96px;
}
@media (min-width: 768px) { .tg-root { padding-bottom: 40px; } }

.tg-shell { max-width: 1200px; margin: 0 auto; padding: 24px 28px 32px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
@media (max-width: 767px) { .tg-shell { padding: 16px 16px 24px; gap: 14px; } }

.tg-overline { font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tg-faint); }
.tg-caption { font-size: 11px; }
.tg-faint { color: var(--tg-faint); font-size: 12px; }
.tg-row-between { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.tg-h1 { font-family: var(--font-display, "Fraunces"), serif; font-size: 32px; font-weight: 600; margin: 2px 0 0; letter-spacing: -0.02em; color: var(--tg-fg); }
.tg-h3 { font-family: var(--font-display, "Fraunces"), serif; font-size: 19px; font-weight: 600; margin: 4px 0; letter-spacing: -0.01em; color: var(--tg-fg); }
.tg-link { background: none; border: 0; padding: 0; font-size: 13px; color: var(--tg-primary); font-weight: 500; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; text-decoration: none; }
.tg-link:hover { filter: brightness(1.1); }
.tg-link-ghost { background: none; border: 0; padding: 0; font-size: 13px; color: var(--tg-muted); cursor: pointer; text-decoration: none; }

.tg-topbar { display: flex; justify-content: space-between; align-items: end; gap: 16px; flex-wrap: wrap; }
.tg-top-actions { display: flex; gap: 10px; align-items: center; }
.tg-search { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; background: var(--tg-elev); border: 1px solid var(--tg-border); border-radius: 8px; font-size: 12px; width: 260px; max-width: 100%; color: var(--tg-muted); text-decoration: none; }
.tg-search:hover { color: var(--tg-fg); }
.tg-search span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
@media (max-width: 640px) { .tg-search { display: none; } }
.tg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid transparent; cursor: pointer; text-decoration: none; }
.tg-btn-sm { padding: 6px 10px; font-size: 12px; }
.tg-btn-solid { background: var(--tg-fg); color: var(--tg-bg); }
.tg-btn-solid:hover { filter: brightness(1.15); }
.tg-btn-ghost { background: var(--tg-elev); color: var(--tg-fg); border-color: var(--tg-border); }

.tg-glance { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 900px) { .tg-glance { grid-template-columns: repeat(2, 1fr); } }
.tg-kpi { background: var(--tg-elev); border: 1px solid var(--tg-border); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.tg-kpi-k { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--tg-muted); }
.tg-kpi-v { font-family: var(--font-display, "Fraunces"), serif; font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; margin-top: 2px; color: var(--tg-fg); }
.tg-kpi-unit { font-family: var(--font-display, "Fraunces"), serif; font-style: italic; font-size: 16px; color: var(--tg-muted); font-weight: 400; margin-left: 6px; }
.tg-kpi-bar { height: 3px; background: var(--tg-border); border-radius: 99px; overflow: hidden; margin-top: 6px; }
.tg-kpi-bar span { display: block; height: 100%; background: var(--tg-primary); border-radius: 99px; }
.tg-kpi-weather { background: var(--tg-green); border-color: transparent; color: var(--tg-secondary); }
.tg-kpi-weather .tg-kpi-k, .tg-kpi-weather .tg-kpi-v, .tg-kpi-weather .tg-faint, .tg-kpi-weather .tg-caption { color: var(--tg-secondary); }

.tg-split { display: grid; grid-template-columns: 1.35fr 1fr; gap: 16px; }
@media (max-width: 1024px) { .tg-split { grid-template-columns: 1fr; } }
.tg-col-l, .tg-col-r { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.tg-card { background: var(--tg-elev); border: 1px solid var(--tg-border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }

.tg-pinned { background: var(--tg-rose); border-color: transparent; }
.tg-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; padding: 3px 8px; border-radius: 999px; background: rgba(192,77,54,0.15); color: var(--tg-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; }
.tg-pinned-text { font-family: var(--font-display, "Fraunces"), serif; font-size: 22px; line-height: 1.35; margin: 6px 0 8px; color: var(--tg-fg); }
.tg-pinned-actions { display: flex; gap: 16px; }

.tg-mem-row { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; }
@media (max-width: 768px) { .tg-mem-row { grid-template-columns: 1fr; } }
.tg-spot { padding: 0; overflow: hidden; flex-direction: row; gap: 0; cursor: pointer; transition: transform 0.2s; }
.tg-spot:hover { transform: translateY(-1px); }
.tg-spot-photo { width: 160px; flex-shrink: 0; position: relative; background: var(--tg-rose); }
.tg-spot-img { object-fit: cover; }
.tg-photo-stub { width: 100%; height: 100%; display: grid; place-items: center; color: rgba(255,255,255,0.7); }
.tg-tone-rose { background: repeating-linear-gradient(135deg, #E9CFC4 0 14px, #DDBBAE 14px 28px); }
.tg-tone-amber { background: repeating-linear-gradient(135deg, #E4D3A9 0 14px, #D1BC8B 14px 28px); }
.tg-tone-green { background: repeating-linear-gradient(135deg, #CBDBD0 0 14px, #B6CEBC 14px 28px); }
.tg-tone-plum { background: repeating-linear-gradient(135deg, #D6C6CE 0 14px, #BFACB8 14px 28px); }
.tg-spot-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.tg-spot-cta { margin-top: auto; align-self: flex-start; }
.tg-rem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.tg-rem-tile { position: relative; aspect-ratio: 1 / 1; border-radius: 6px; overflow: hidden; cursor: pointer; }
.tg-rem-img { object-fit: cover; }

.tg-feed { padding-bottom: 6px; }
.tg-feed-list { list-style: none; margin: 0; padding: 0; }
.tg-feed-list li { display: grid; grid-template-columns: 70px 10px 1fr; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--tg-border); font-size: 13px; cursor: pointer; }
.tg-feed-list li:first-child { border-top: 0; }
.tg-feed-list li:hover { background: rgba(0,0,0,0.02); }
.tg-feed-time { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; color: var(--tg-faint); }
.tg-feed-dot { width: 8px; height: 8px; border-radius: 99px; justify-self: center; }
.tg-feed-body strong { font-weight: 600; color: var(--tg-fg); }
.tg-feed-body { color: var(--tg-muted); }

.tg-date-meta { font-size: 12px; color: var(--tg-muted); display: inline-flex; align-items: center; gap: 5px; }
.tg-date-foot { display: flex; gap: 14px; padding-top: 4px; }

.tg-grat { background: var(--tg-amber); border-color: transparent; }
.tg-grat-row { display: grid; grid-template-columns: 8px 1fr; gap: 10px; align-items: start; padding: 4px 0; }
.tg-grat-row:has(:only-child) { grid-template-columns: 1fr; }
.tg-grat-dot { width: 8px; height: 8px; border-radius: 99px; margin-top: 6px; }
.tg-grat-text { font-family: var(--font-display, "Fraunces"), serif; font-size: 15px; font-style: italic; color: var(--tg-fg); line-height: 1.35; }

.tg-buck-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tg-buck-list li { display: grid; grid-template-columns: 18px 1fr; gap: 10px; align-items: center; font-size: 13px; padding: 5px 0; border-top: 1px dashed var(--tg-border); cursor: pointer; }
.tg-buck-list li:first-child { border-top: 0; }
.tg-buck-check { width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid var(--tg-border-em); display: grid; place-items: center; }
.tg-buck-list li.is-done .tg-buck-check { background: var(--tg-secondary); border-color: var(--tg-secondary); color: var(--tg-secondary-fg); }
.tg-buck-list li.is-done .tg-buck-text { text-decoration: line-through; color: var(--tg-muted); }

.tg-house-block { padding-top: 10px; border-top: 1px dashed var(--tg-border); }
.tg-house-block:first-of-type { padding-top: 4px; border-top: 0; }
.tg-house-head { display: flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: var(--tg-muted); margin-bottom: 8px; }
.tg-mini-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.tg-mini-list li { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; font-size: 12px; }
.tg-who { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: var(--tg-fg); }
.tg-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tg-tag { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: var(--tg-bg); border: 1px solid var(--tg-border); }
.tg-house-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 10px; border-top: 1px dashed var(--tg-border); }
.tg-mini-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 3px 0; border-top: 1px dashed var(--tg-border); gap: 8px; }
.tg-mini-row:first-of-type { border-top: 0; }
.tg-trunc { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 0; }
`;
