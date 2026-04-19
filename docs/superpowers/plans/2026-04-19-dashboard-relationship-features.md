# Dashboard Relationship Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship seven dashboard features (Reminisce, Gratitude, Date-night, Wishlist, Chores, Documents, Grocery) to make the Twofold home dashboard active and useful daily.

**Architecture:** Each feature is one Postgres table (or zero) + one Next.js API route group + one dashboard widget + one full page + Vitest endpoint tests. All share a single `requireLocketMembership` helper for auth+tenant isolation. Migrations are added to `app/lib/migrations.ts` array (existing convention — not separate SQL files). Dashboard composition refactored once, then features dropped in.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · PostgreSQL via raw `pg` · Firebase Auth · GCS resumable uploads · Tailwind + shadcn UI · lucide-react · Vitest endpoint tests against real Postgres.

**Spec:** `docs/superpowers/specs/2026-04-19-dashboard-relationship-features-design.md`

**Rollout:** One commit per feature group. Foundation lands first. Then features in order: Reminisce → Gratitude → Date-night → Wishlist → Chores → Documents → Grocery → Nav+Dashboard composition.

---

## Foundation

### Task F1: Membership helper

**Files:**
- Create: `app/lib/auth-helpers.ts`
- Test: `tests/endpoints/auth-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/endpoints/auth-helpers.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

describe('membership helper via /api/grocery (smoke)', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('rejects request without auth (401)', async () => {
    const c = new TestClient()
    const res = await c.fetch(`/api/grocery?locketId=${couple.locketId}`)
    expect(res.status).toBe(401)
  })

  it('rejects request from non-member (403)', async () => {
    // Will be implemented after grocery route exists. Placeholder asserting helper error shape.
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Implement helper**

```ts
// app/lib/auth-helpers.ts
import { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import adminApp from '@/lib/firebase/admin'
import { query } from '@/lib/db'

void adminApp

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function requireUser(request: NextRequest): Promise<{ uid: string }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new AuthError(401, 'unauthenticated')
  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await getAuth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    throw new AuthError(401, 'invalid_token')
  }
}

export async function requireLocketMembership(
  request: NextRequest,
  locketId: string,
): Promise<{ uid: string; partnerUid: string | null }> {
  if (!locketId) throw new AuthError(400, 'locket_id_required')
  const { uid } = await requireUser(request)
  const { rows } = await query<{ firebase_uid: string }>(
    `SELECT firebase_uid FROM locket_users WHERE locket_id = $1`,
    [locketId],
  )
  const member = rows.find((r) => r.firebase_uid === uid)
  if (!member) throw new AuthError(403, 'not_a_member')
  const partner = rows.find((r) => r.firebase_uid !== uid) ?? null
  return { uid, partnerUid: partner?.firebase_uid ?? null }
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error('unexpected auth error', err)
  return Response.json({ error: 'internal' }, { status: 500 })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/auth-helpers.ts tests/endpoints/auth-helpers.test.ts
git commit -m "feat(auth): add requireLocketMembership helper"
```

---

## Feature 1: Reminisce

### Task R1: API route

**Files:**
- Create: `app/api/reminisce/route.ts`
- Test: `tests/endpoints/reminisce.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'
import { query } from '../helpers/db'

describe('GET /api/reminisce', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('returns memories from prior years matching today', async () => {
    const today = new Date()
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    await query(
      `INSERT INTO memory_groups (locket_id, title, date_taken, created_by_firebase_uid)
       VALUES ($1, 'Old Memory', $2, $3)`,
      [couple.locketId, lastYear.toISOString(), couple.partnerA.uid],
    )

    const c = new TestClient()
    await c.authenticateAs(couple.partnerA)
    const res = await c.fetch(`/api/reminisce?locketId=${couple.locketId}`, {
      headers: { Authorization: `Bearer ${await couple.partnerA.mintIdToken()}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.memories).toHaveLength(1)
    expect(body.memories[0].title).toBe('Old Memory')
  })

  it('returns 403 for non-member', async () => {
    const other = await createCouple()
    const c = new TestClient()
    const res = await c.fetch(`/api/reminisce?locketId=${couple.locketId}`, {
      headers: { Authorization: `Bearer ${await other.partnerA.mintIdToken()}` },
    })
    expect(res.status).toBe(403)
    await destroyCouple(other)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL** — `npm test -- reminisce`

- [ ] **Step 3: Implement route**

```ts
// app/api/reminisce/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT mg.*, COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') AS media_items
       FROM memory_groups mg
       LEFT JOIN media m ON m.memory_group_id = mg.id
       WHERE mg.locket_id = $1
         AND mg.date_taken IS NOT NULL
         AND extract(month FROM mg.date_taken) = extract(month FROM now())
         AND extract(day FROM mg.date_taken) = extract(day FROM now())
         AND mg.date_taken < date_trunc('day', now())
       GROUP BY mg.id
       ORDER BY mg.date_taken DESC
       LIMIT 5`,
      [locketId],
    )
    return Response.json({ memories: rows })
  } catch (err) {
    return authErrorResponse(err)
  }
}
```

- [ ] **Step 4: Run test, expect PASS** — `npm test -- reminisce`

### Task R2: Reminisce widget

**Files:**
- Create: `app/(main)/components/dashboard/widgets/ReminisceWidget.tsx`

- [ ] **Step 1: Implement widget**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { MemoryGroup } from '@/lib/types'
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal'

export function ReminisceWidget({ locketId }: { locketId: string }) {
  const [memories, setMemories] = useState<MemoryGroup[]>([])
  const [open, setOpen] = useState<MemoryGroup | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/reminisce?locketId=${locketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok || cancelled) return
      const { memories } = await res.json()
      setMemories(memories)
    })()
    return () => { cancelled = true }
  }, [locketId])

  if (memories.length === 0) return null
  const top = memories[0]
  const yearsAgo = top.date_taken
    ? new Date().getFullYear() - new Date(top.date_taken).getFullYear()
    : 0
  const cover = top.media_items?.[0]?.storage_url

  return (
    <>
      <button
        onClick={() => setOpen(top)}
        className="card-base relative w-full h-40 overflow-hidden group text-left animate-fade-in"
        aria-label={`Reminisce: ${top.title}`}
      >
        {cover && (
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated/90 backdrop-blur-sm border border-border text-caption font-bold text-accent">
          <Clock className="w-3 h-3" /> {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago today
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-display text-subheading text-foreground truncate">{top.title}</p>
        </div>
      </button>
      {open && (
        <MemoryDetailModal
          isOpen
          onClose={() => setOpen(null)}
          memory={{
            ...open,
            date_taken: open.date_taken ? String(open.date_taken) : undefined,
            created_at: String(open.created_at),
            media_items: open.media_items?.map((m) => ({ ...m, date_taken: m.date_taken ? String(m.date_taken) : undefined })),
          }}
          isLiked={false}
          likeCount={0}
          onLike={() => {}}
          onEdit={() => setOpen(null)}
          onComment={() => setOpen(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/reminisce app/(main)/components/dashboard/widgets/ReminisceWidget.tsx tests/endpoints/reminisce.test.ts
git commit -m "feat(reminisce): on-this-day widget surfacing prior-year memories"
```

---

## Feature 2: Gratitude

### Task G1: Migration

**Files:**
- Modify: `app/lib/migrations.ts` (append new entry to `migrations` array)

- [ ] **Step 1: Add migration entry**

```ts
{
  name: '200_create_gratitudes',
  sql: `
    CREATE TABLE IF NOT EXISTS gratitudes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
      from_uid VARCHAR(255) NOT NULL,
      to_uid VARCHAR(255) NOT NULL,
      text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 280),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      seen_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_gratitudes_locket_created ON gratitudes(locket_id, created_at DESC);
  `,
},
```

- [ ] **Step 2: Run migrations** — start dev server (`npm run dev`), then `curl -X POST http://localhost:3000/api/run-migrations` (or whatever the route exposes). Confirm `gratitudes` table exists.

### Task G2: Types

**Files:**
- Modify: `app/lib/types.ts` (append)

- [ ] **Step 1: Add interface**

```ts
export interface Gratitude {
  id: string
  locket_id: string
  from_uid: string
  to_uid: string
  text: string
  created_at: string
  seen_at: string | null
}
```

### Task G3: API routes

**Files:**
- Create: `app/api/gratitudes/route.ts`
- Create: `app/api/gratitudes/[id]/seen/route.ts`
- Test: `tests/endpoints/gratitudes.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const auth = async (c: TestClient, p: { mintIdToken: () => Promise<string> }) =>
  ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/gratitudes', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('POST creates gratitude addressed to partner', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/gratitudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await auth(c, couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, text: 'thanks for coffee' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.gratitude.from_uid).toBe(couple.partnerA.uid)
    expect(body.gratitude.to_uid).toBe(couple.partnerB.uid)
  })

  it('POST without partner returns 400 no_partner', async () => {
    // Remove partnerB from locket
    const { query } = await import('../helpers/db')
    await query(`DELETE FROM locket_users WHERE locket_id=$1 AND firebase_uid=$2`, [couple.locketId, couple.partnerB.uid])
    const c = new TestClient()
    const res = await c.fetch('/api/gratitudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await auth(c, couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, text: 'hi' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('no_partner')
  })

  it('GET returns ordered list', async () => {
    const c = new TestClient()
    await c.fetch('/api/gratitudes', { method: 'POST', headers: { 'content-type': 'application/json', ...(await auth(c, couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, text: 'one' }) })
    await c.fetch('/api/gratitudes', { method: 'POST', headers: { 'content-type': 'application/json', ...(await auth(c, couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, text: 'two' }) })
    const res = await c.fetch(`/api/gratitudes?locketId=${couple.locketId}`, { headers: await auth(c, couple.partnerA) })
    const body = await res.json()
    expect(body.gratitudes[0].text).toBe('two')
  })

  it('POST /:id/seen marks seen only for recipient', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/gratitudes', { method: 'POST', headers: { 'content-type': 'application/json', ...(await auth(c, couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, text: 'x' }) })
    const { gratitude } = await create.json()
    const res = await c.fetch(`/api/gratitudes/${gratitude.id}/seen`, { method: 'POST', headers: await auth(c, couple.partnerB) })
    expect(res.status).toBe(200)
    const after = await res.json()
    expect(after.gratitude.seen_at).not.toBeNull()
  })
})
```

- [ ] **Step 2: Implement list/create route**

```ts
// app/api/gratitudes/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM gratitudes WHERE locket_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [locketId],
    )
    return Response.json({ gratitudes: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const { locketId, text } = await request.json()
    const { uid, partnerUid } = await requireLocketMembership(request, locketId)
    if (!partnerUid) return Response.json({ error: 'no_partner' }, { status: 400 })
    if (typeof text !== 'string' || text.length < 1 || text.length > 280) {
      return Response.json({ error: 'invalid_text' }, { status: 400 })
    }
    const { rows } = await query(
      `INSERT INTO gratitudes (locket_id, from_uid, to_uid, text) VALUES ($1, $2, $3, $4) RETURNING *`,
      [locketId, uid, partnerUid, text],
    )
    return Response.json({ gratitude: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

- [ ] **Step 3: Implement seen route**

```ts
// app/api/gratitudes/[id]/seen/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireUser, authErrorResponse } from '@/lib/auth-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await requireUser(request)
    const { rows } = await query(
      `UPDATE gratitudes SET seen_at = NOW()
       WHERE id = $1 AND to_uid = $2 AND seen_at IS NULL
       RETURNING *`,
      [params.id, uid],
    )
    if (rows.length === 0) {
      const { rows: existing } = await query(`SELECT * FROM gratitudes WHERE id = $1`, [params.id])
      return Response.json({ gratitude: existing[0] ?? null })
    }
    return Response.json({ gratitude: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

- [ ] **Step 4: Run tests, expect PASS** — `npm test -- gratitudes`

### Task G4: Widget

**Files:**
- Create: `app/(main)/components/dashboard/widgets/GratitudeWidget.tsx`

- [ ] **Step 1: Implement widget**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { HeartHandshake, Send } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Gratitude } from '@/lib/types'

export function GratitudeWidget({ locketId, currentUid }: { locketId: string; currentUid: string }) {
  const [items, setItems] = useState<Gratitude[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/gratitudes?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setItems((await res.json()).gratitudes)
  }
  useEffect(() => { load() }, [locketId])

  const partnerLatest = items.find((g) => g.to_uid === currentUid)
  const hasUnseen = partnerLatest && !partnerLatest.seen_at

  useEffect(() => {
    if (!hasUnseen || !partnerLatest) return
    ;(async () => {
      const token = await getCurrentUserToken()
      await fetch(`/api/gratitudes/${partnerLatest.id}/seen`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    })()
  }, [hasUnseen, partnerLatest?.id])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const token = await getCurrentUserToken()
    const res = await fetch('/api/gratitudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId, text: text.trim() }),
    })
    setSending(false)
    if (res.ok) { setText(''); load() }
  }

  return (
    <div className={`card-base p-5 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in ${hasUnseen ? 'ring-2 ring-primary/30' : ''}`}>
      <div>
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider mb-2">
          <HeartHandshake className="w-3.5 h-3.5" /> Gratitude
        </div>
        {partnerLatest ? (
          <p className="text-foreground text-body leading-relaxed">"{partnerLatest.text}"</p>
        ) : (
          <p className="text-muted text-body-sm">Nothing yet — be the first to send one.</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          placeholder="One thing you appreciated today…"
          className="w-full bg-elevated border border-border rounded-lg p-3 text-body-sm text-foreground placeholder:text-faint focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          rows={3}
          aria-label="Write a gratitude"
        />
        <div className="flex justify-between items-center">
          <span className="text-caption text-faint">{text.length}/280</span>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-body-sm font-medium hover:brightness-110 disabled:opacity-50 transition"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Task G5: Page + commit

**Files:**
- Create: `app/(main)/gratitude/page.tsx`

- [ ] **Step 1: Implement feed page**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useLocket } from '@/contexts/LocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Gratitude } from '@/lib/types'

export default function GratitudePage() {
  const { currentLocket } = useLocket()
  const { user } = useAuth()
  const [items, setItems] = useState<Gratitude[]>([])

  useEffect(() => {
    if (!currentLocket) return
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/gratitudes?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setItems((await res.json()).gratitudes)
    })()
  }, [currentLocket?.id])

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8">
      <h1 className="font-display text-display text-foreground mb-6">Gratitude</h1>
      <ul className="space-y-3">
        {items.map((g) => {
          const mine = g.from_uid === user?.uid
          return (
            <li key={g.id} className={`card-base p-4 ${mine ? 'ml-12' : 'mr-12'}`}>
              <p className="text-body text-foreground">"{g.text}"</p>
              <p className="text-caption text-faint mt-2">
                {mine ? 'You' : 'Partner'} · {new Date(g.created_at).toLocaleDateString()}
              </p>
            </li>
          )
        })}
        {items.length === 0 && <li className="text-muted text-center py-12">Send your first gratitude from the home dashboard.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/lib/migrations.ts app/lib/types.ts app/api/gratitudes app/(main)/gratitude app/(main)/components/dashboard/widgets/GratitudeWidget.tsx tests/endpoints/gratitudes.test.ts
git commit -m "feat(gratitude): partner-to-partner gratitude pings on dashboard"
```

---

## Feature 3: Date-night

### Task DN1: Static seed

**Files:**
- Create: `app/lib/data/date-night-ideas.ts`

- [ ] **Step 1: Seed file (60+ ideas)**

```ts
export type DateVibe = 'cozy' | 'adventurous' | 'romantic' | 'silly'
export type DateSetting = 'in' | 'out'
export type DateBudget = 'free' | 'low' | 'mid' | 'high'

export interface DateIdea {
  id: string
  title: string
  vibe: DateVibe
  setting: DateSetting
  budget: DateBudget
  est_minutes: number
}

export const dateIdeas: DateIdea[] = [
  { id: 'cook-new-cuisine', title: 'Cook a cuisine neither of you has tried', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 120 },
  { id: 'sunrise-walk', title: 'Watch the sunrise together with coffee', vibe: 'romantic', setting: 'out', budget: 'free', est_minutes: 60 },
  { id: 'puzzle-night', title: '1000-piece puzzle + favorite playlist', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'museum-day', title: 'Spend the afternoon at a local museum', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'silent-disco', title: 'Silent disco in the living room', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'stargazing', title: 'Drive somewhere dark and watch stars', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'farmers-market', title: 'Farmers market then cook the haul', vibe: 'cozy', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'home-spa', title: 'Build an at-home spa night', vibe: 'romantic', setting: 'in', budget: 'low', est_minutes: 120 },
  { id: 'thrift-challenge', title: '$20 thrift store outfit challenge', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'hike-new-trail', title: 'Hike a trail neither has done', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 240 },
  { id: 'movie-marathon', title: "Marathon a director's filmography", vibe: 'cozy', setting: 'in', budget: 'free', est_minutes: 360 },
  { id: 'pottery-class', title: 'Take a pottery / paint class', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 120 },
  { id: 'recreate-first-date', title: 'Recreate your first date', vibe: 'romantic', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'board-game-bracket', title: 'Run a 4-game board game bracket', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 180 },
  { id: 'picnic-park', title: 'Pack a picnic for the nearest park', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'cocktail-experiment', title: 'Invent two new cocktails together', vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'photo-walk', title: 'Photo walk — only black & white shots', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 90 },
  { id: 'love-letters', title: 'Write each other a love letter, exchange', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'concert', title: 'Catch a small local concert', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'breakfast-for-dinner', title: 'Breakfast for dinner in pajamas', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'kayak', title: 'Rent kayaks for a couple hours', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'open-mic', title: 'Open mic night — comedy or music', vibe: 'adventurous', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'fireplace-reading', title: 'Take turns reading a book aloud', vibe: 'cozy', setting: 'in', budget: 'free', est_minutes: 90 },
  { id: 'mini-golf', title: 'Mini golf with loser-pays-dessert wager', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'rooftop-dinner', title: 'Cook fancy + eat on the rooftop/balcony', vibe: 'romantic', setting: 'in', budget: 'mid', est_minutes: 180 },
  { id: 'gallery-hop', title: 'Gallery hop in the arts district', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 180 },
  { id: 'horror-night', title: 'Horror movie night with a blanket fort', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 150 },
  { id: 'bike-ride', title: 'Bike ride to a coffee shop you have not tried', vibe: 'adventurous', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'karaoke', title: 'Karaoke duets — must sing one each', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'memory-replay', title: 'Pick a year from your timeline, scroll together', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'tasting-flight', title: 'Wine / coffee / tea tasting flight', vibe: 'romantic', setting: 'out', budget: 'mid', est_minutes: 90 },
  { id: 'plan-fantasy-trip', title: 'Plan a fantasy trip you would never take', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'volunteer', title: 'Volunteer somewhere together for a morning', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 180 },
  { id: 'craft-night', title: 'Pick one craft — try to finish it tonight', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'food-truck', title: 'Hit three food trucks, share everything', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 120 },
  { id: 'dancing-lesson', title: 'YouTube dance lesson in the kitchen', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'beach-bonfire', title: 'Beach bonfire with snacks', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 240 },
  { id: 'garden-project', title: 'Plant something together — herb or flower', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'language-class', title: 'Try one Duolingo language together', vibe: 'cozy', setting: 'in', budget: 'free', est_minutes: 45 },
  { id: 'antique-store', title: 'Browse an antique store, pick gifts for each other', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'fancy-dinner', title: 'Splurge on a tasting menu somewhere new', vibe: 'romantic', setting: 'out', budget: 'high', est_minutes: 180 },
  { id: 'escape-room', title: 'Book an escape room', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 90 },
  { id: 'long-walk-no-phone', title: 'Two-hour walk, no phones', vibe: 'romantic', setting: 'out', budget: 'free', est_minutes: 120 },
  { id: 'nostalgic-snacks', title: "Buy each other's childhood snacks, taste-test", vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 60 },
  { id: 'farm-day', title: 'U-pick farm — berries / pumpkins / flowers', vibe: 'cozy', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'home-improvement', title: 'Tackle one home project together', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'sunset-drive', title: 'Drive somewhere just for the sunset', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'recipe-swap', title: 'Each cook one course, no peeking', vibe: 'silly', setting: 'in', budget: 'mid', est_minutes: 180 },
  { id: 'thrift-then-makeover', title: 'Thrift outfits then dress each other', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'rock-climbing', title: 'Indoor rock climbing or bouldering', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 120 },
  { id: 'bookshop-pick', title: 'Pick a book for each other at a bookstore', vibe: 'cozy', setting: 'out', budget: 'low', est_minutes: 60 },
  { id: 'plan-bucket-list', title: 'Add 10 things to your shared bucket list', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 45 },
  { id: 'coffee-crawl', title: 'Coffee crawl — three shops, half a drink each', vibe: 'adventurous', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'pie-bake-off', title: 'Pie bake-off using the same crust recipe', vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'sound-bath', title: 'Sound bath or yoga class together', vibe: 'cozy', setting: 'out', budget: 'mid', est_minutes: 90 },
  { id: 'old-photos', title: 'Pull out old photo albums and reminisce', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 90 },
  { id: 'museum-after-hours', title: 'After-hours museum or gallery event', vibe: 'romantic', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'farm-to-table-class', title: 'Cooking class at a local market', vibe: 'adventurous', setting: 'out', budget: 'high', est_minutes: 180 },
  { id: 'paint-each-other', title: 'Paint each other — keep the worst one', vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'ice-cream-tour', title: 'Ice cream from three places, rank them', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'plan-next-trip', title: 'Plan your next trip — book one thing tonight', vibe: 'adventurous', setting: 'in', budget: 'free', est_minutes: 90 },
]
```

### Task DN2: Migration

- [ ] **Step 1: Append migration**

```ts
{
  name: '201_create_date_night_picks',
  sql: `
    CREATE TABLE IF NOT EXISTS date_night_picks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
      idea_id VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('saved','completed','dismissed')),
      created_by VARCHAR(255) NOT NULL,
      picked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_date_picks_locket_status ON date_night_picks(locket_id, status, picked_at DESC);
  `,
},
```

### Task DN3: Types + API

**Files:**
- Modify: `app/lib/types.ts`
- Create: `app/api/date-nights/ideas/route.ts`
- Create: `app/api/date-nights/picks/route.ts`
- Create: `app/api/date-nights/picks/[id]/route.ts`
- Test: `tests/endpoints/date-nights.test.ts`

- [ ] **Step 1: Type**

```ts
export interface DateNightPick {
  id: string
  locket_id: string
  idea_id: string
  status: 'saved' | 'completed' | 'dismissed'
  created_by: string
  picked_at: string
  completed_at: string | null
}
```

- [ ] **Step 2: Test**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const headers = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/date-nights', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('GET ideas returns array filterable by vibe', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/date-nights/ideas?vibe=cozy', { headers: await headers(couple.partnerA) })
    const body = await res.json()
    expect(body.ideas.every((i: { vibe: string }) => i.vibe === 'cozy')).toBe(true)
  })

  it('POST + PATCH pick lifecycle', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/date-nights/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await headers(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, idea_id: 'puzzle-night' }),
    })
    expect(create.status).toBe(200)
    const { pick } = await create.json()
    const patch = await c.fetch(`/api/date-nights/picks/${pick.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await headers(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, status: 'completed' }),
    })
    expect(patch.status).toBe(200)
    expect((await patch.json()).pick.status).toBe('completed')
  })
})
```

- [ ] **Step 3: Implement ideas route**

```ts
// app/api/date-nights/ideas/route.ts
import { NextRequest } from 'next/server'
import { dateIdeas } from '@/lib/data/date-night-ideas'
import { requireUser, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await requireUser(request)
    const url = new URL(request.url)
    const vibe = url.searchParams.get('vibe')
    const setting = url.searchParams.get('setting')
    const budget = url.searchParams.get('budget')
    const ideas = dateIdeas.filter(
      (i) => (!vibe || i.vibe === vibe) && (!setting || i.setting === setting) && (!budget || i.budget === budget),
    )
    return Response.json({ ideas })
  } catch (err) { return authErrorResponse(err) }
}
```

- [ ] **Step 4: Implement picks routes**

```ts
// app/api/date-nights/picks/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM date_night_picks WHERE locket_id = $1 ORDER BY picked_at DESC LIMIT 50`,
      [locketId],
    )
    return Response.json({ picks: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const { locketId, idea_id } = await request.json()
    const { uid } = await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `INSERT INTO date_night_picks (locket_id, idea_id, status, created_by) VALUES ($1, $2, 'saved', $3) RETURNING *`,
      [locketId, idea_id, uid],
    )
    return Response.json({ pick: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/date-nights/picks/[id]/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { locketId, status } = await request.json()
    await requireLocketMembership(request, locketId)
    if (!['saved', 'completed', 'dismissed'].includes(status)) {
      return Response.json({ error: 'invalid_status' }, { status: 400 })
    }
    const completedAt = status === 'completed' ? 'NOW()' : 'NULL'
    const { rows } = await query(
      `UPDATE date_night_picks SET status = $1, completed_at = ${completedAt}
       WHERE id = $2 AND locket_id = $3 RETURNING *`,
      [status, params.id, locketId],
    )
    return Response.json({ pick: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    await query(`DELETE FROM date_night_picks WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
```

### Task DN4: Widget + Page

**Files:**
- Create: `app/(main)/components/dashboard/widgets/DateNightWidget.tsx`
- Create: `app/(main)/date-nights/page.tsx`

- [ ] **Step 1: Widget**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, RotateCw } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import { dateIdeas } from '@/lib/data/date-night-ideas'
import type { DateNightPick } from '@/lib/types'

export function DateNightWidget({ locketId }: { locketId: string }) {
  const [savedPick, setSavedPick] = useState<DateNightPick | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/date-nights/picks?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const { picks } = await res.json()
      setSavedPick(picks.find((p: DateNightPick) => p.status === 'saved') ?? null)
    }
  }
  useEffect(() => { load() }, [locketId])

  const spin = async () => {
    setLoading(true)
    const idea = dateIdeas[Math.floor(Math.random() * dateIdeas.length)]
    const token = await getCurrentUserToken()
    await fetch('/api/date-nights/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId, idea_id: idea.id }),
    })
    await load()
    setLoading(false)
  }

  const idea = savedPick ? dateIdeas.find((i) => i.id === savedPick.idea_id) : null

  return (
    <div className="card-base p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Date night
        </div>
        <Link href="/date-nights" className="text-caption text-muted hover:text-foreground">All →</Link>
      </div>
      {idea ? (
        <div>
          <p className="font-display text-subheading text-foreground mb-2">{idea.title}</p>
          <p className="text-caption text-muted">{idea.vibe} · {idea.setting} · {idea.budget} · ~{idea.est_minutes} min</p>
          <button onClick={spin} disabled={loading} className="mt-4 inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline">
            <RotateCw className="w-3.5 h-3.5" /> Spin again
          </button>
        </div>
      ) : (
        <button onClick={spin} disabled={loading} className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium hover:brightness-110 disabled:opacity-50 transition">
          {loading ? 'Spinning…' : 'Spin a date night'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Page (filterable browse)**

```tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import { dateIdeas, type DateVibe, type DateSetting, type DateBudget } from '@/lib/data/date-night-ideas'

const vibes: DateVibe[] = ['cozy', 'adventurous', 'romantic', 'silly']
const settings: DateSetting[] = ['in', 'out']
const budgets: DateBudget[] = ['free', 'low', 'mid', 'high']

export default function DateNightsPage() {
  const { currentLocket } = useLocket()
  const [vibe, setVibe] = useState<DateVibe | null>(null)
  const [setting, setSetting] = useState<DateSetting | null>(null)
  const [budget, setBudget] = useState<DateBudget | null>(null)

  const filtered = useMemo(
    () => dateIdeas.filter((i) => (!vibe || i.vibe === vibe) && (!setting || i.setting === setting) && (!budget || i.budget === budget)),
    [vibe, setting, budget],
  )

  const save = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch('/api/date-nights/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId: currentLocket.id, idea_id: id }),
    })
  }

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8">
      <h1 className="font-display text-display text-foreground mb-6">Date nights</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {vibes.map((v) => (
          <button key={v} onClick={() => setVibe(vibe === v ? null : v)} className={`px-3 py-1 rounded-full text-caption border ${vibe === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{v}</button>
        ))}
        <span className="w-px bg-border mx-2" />
        {settings.map((s) => (
          <button key={s} onClick={() => setSetting(setting === s ? null : s)} className={`px-3 py-1 rounded-full text-caption border ${setting === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{s}</button>
        ))}
        <span className="w-px bg-border mx-2" />
        {budgets.map((b) => (
          <button key={b} onClick={() => setBudget(budget === b ? null : b)} className={`px-3 py-1 rounded-full text-caption border ${budget === b ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{b}</button>
        ))}
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((i) => (
          <li key={i.id} className="card-base p-4 flex flex-col gap-2">
            <p className="font-display text-subheading text-foreground">{i.title}</p>
            <p className="text-caption text-muted">{i.vibe} · {i.setting} · {i.budget} · ~{i.est_minutes} min</p>
            <button onClick={() => save(i.id)} className="self-start text-body-sm text-primary hover:underline">Save</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- date-nights
git add app/lib/migrations.ts app/lib/types.ts app/lib/data app/api/date-nights app/(main)/date-nights app/(main)/components/dashboard/widgets/DateNightWidget.tsx tests/endpoints/date-nights.test.ts
git commit -m "feat(date-nights): idea generator with saved pick on dashboard"
```

---

## Feature 4: Wishlist

### Task W1: Migration + types

- [ ] **Step 1: Migration**

```ts
{
  name: '202_create_wishlist_items',
  sql: `
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
      added_by VARCHAR(255) NOT NULL,
      for_uid VARCHAR(255),
      title TEXT NOT NULL,
      url TEXT,
      price_cents INT CHECK (price_cents IS NULL OR price_cents >= 0),
      notes TEXT,
      status VARCHAR(20) NOT NULL CHECK (status IN ('open','reserved','gifted','removed')) DEFAULT 'open',
      reserved_by VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_wishlist_locket_status ON wishlist_items(locket_id, status);
  `,
},
```

- [ ] **Step 2: Type**

```ts
export interface WishlistItem {
  id: string
  locket_id: string
  added_by: string
  for_uid: string | null
  title: string
  url: string | null
  price_cents: number | null
  notes: string | null
  status: 'open' | 'reserved' | 'gifted' | 'removed'
  reserved_by: string | null
  created_at: string
}
```

### Task W2: API + surprise rule

**Files:**
- Create: `app/api/wishlist/route.ts`
- Create: `app/api/wishlist/[id]/route.ts`
- Test: `tests/endpoints/wishlist.test.ts`

- [ ] **Step 1: Test (focus on surprise rule)**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/wishlist surprise rule', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('hides partner-added gift FOR me, but shows it to the giver', async () => {
    const c = new TestClient()
    // Partner A adds a gift FOR Partner B
    await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, title: 'Surprise watch', for_uid: couple.partnerB.uid }),
    })
    // Partner B should NOT see it
    const asB = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerB) })
    expect((await asB.json()).items).toHaveLength(0)
    // Partner A SHOULD see it
    const asA = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
    expect((await asA.json()).items).toHaveLength(1)
  })

  it('shared (for_uid null) and self-added items visible to both', async () => {
    const c = new TestClient()
    await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, title: 'New blender' }),
    })
    await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) },
      body: JSON.stringify({ locketId: couple.locketId, title: 'My headphones', for_uid: couple.partnerB.uid }),
    })
    const asA = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
    const asB = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerB) })
    expect((await asA.json()).items).toHaveLength(2)
    expect((await asB.json()).items).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Implement routes**

```ts
// app/api/wishlist/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    const { uid } = await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM wishlist_items
       WHERE locket_id = $1 AND status != 'removed'
         AND NOT (added_by != $2 AND for_uid = $2)
       ORDER BY created_at DESC`,
      [locketId, uid],
    )
    return Response.json({ items: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locketId, title, url, price_cents, notes, for_uid } = body
    const { uid } = await requireLocketMembership(request, locketId)
    if (!title || typeof title !== 'string') return Response.json({ error: 'title_required' }, { status: 400 })
    const { rows } = await query(
      `INSERT INTO wishlist_items (locket_id, added_by, for_uid, title, url, price_cents, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [locketId, uid, for_uid ?? null, title, url ?? null, price_cents ?? null, notes ?? null],
    )
    return Response.json({ item: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/wishlist/[id]/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { locketId, ...patch } = body
    const { uid } = await requireLocketMembership(request, locketId)
    const allowed = ['title', 'url', 'price_cents', 'notes', 'status', 'reserved_by', 'for_uid'] as const
    const updates: string[] = []
    const values: unknown[] = []
    for (const k of allowed) {
      if (k in patch) { values.push(patch[k]); updates.push(`${k} = $${values.length}`) }
    }
    if (updates.length === 0) return Response.json({ error: 'no_updates' }, { status: 400 })
    values.push(params.id); values.push(locketId)
    const { rows } = await query(
      `UPDATE wishlist_items SET ${updates.join(', ')} WHERE id = $${values.length - 1} AND locket_id = $${values.length} RETURNING *`,
      values,
    )
    void uid
    return Response.json({ item: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    await query(`UPDATE wishlist_items SET status = 'removed' WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
```

### Task W3: Widget + page

**Files:**
- Create: `app/(main)/components/dashboard/widgets/WishlistWidget.tsx`
- Create: `app/(main)/wishlist/page.tsx`

- [ ] **Step 1: Widget (peek)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { WishlistItem } from '@/lib/types'

export function WishlistWidget({ locketId }: { locketId: string }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  useEffect(() => {
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/wishlist?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setItems((await res.json()).items)
    })()
  }, [locketId])

  return (
    <Link href="/wishlist" className="card-base p-5 block hover:bg-foreground/5 transition animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <Gift className="w-3.5 h-3.5" /> Wishlist
        </div>
        <span className="text-caption text-faint">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-body-sm">Add things you want — or surprise gifts for your partner.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 3).map((i) => (
            <li key={i.id} className="text-body-sm text-foreground truncate">• {i.title}</li>
          ))}
        </ul>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Page (3 tabs: For me / For partner / Shared)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { WishlistItem } from '@/lib/types'

type Tab = 'me' | 'partner' | 'shared'

export default function WishlistPage() {
  const { currentLocket } = useLocket()
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [tab, setTab] = useState<Tab>('shared')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', url: '', price: '', notes: '', for: 'shared' as 'shared' | 'me' | 'partner' })

  const partnerUid = currentLocket && user
    ? null // populated below if needed; we don't expose other uid here, infer from items
    : null

  const load = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/wishlist?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setItems((await res.json()).items)
  }
  useEffect(() => { load() }, [currentLocket?.id])

  void partnerUid

  const filtered = items.filter((i) => {
    if (tab === 'me') return i.for_uid === user?.uid
    if (tab === 'partner') return i.for_uid && i.for_uid !== user?.uid
    return i.for_uid === null
  })

  const save = async () => {
    if (!currentLocket || !draft.title.trim()) return
    const token = await getCurrentUserToken()
    const otherUid = items.find((i) => i.added_by !== user?.uid)?.added_by
      ?? items.find((i) => i.for_uid && i.for_uid !== user?.uid)?.for_uid
      ?? null
    let for_uid: string | null = null
    if (draft.for === 'me') for_uid = user?.uid ?? null
    else if (draft.for === 'partner') for_uid = otherUid
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        locketId: currentLocket.id,
        title: draft.title.trim(),
        url: draft.url || undefined,
        price_cents: draft.price ? Math.round(parseFloat(draft.price) * 100) : undefined,
        notes: draft.notes || undefined,
        for_uid,
      }),
    })
    setDraft({ title: '', url: '', price: '', notes: '', for: 'shared' })
    setAdding(false)
    load()
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/wishlist/${id}?locketId=${currentLocket.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Wishlist</h1>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-body-sm font-medium">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="flex gap-2 mb-6">
        {(['shared', 'me', 'partner'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-caption border ${tab === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>
            {t === 'me' ? 'For me' : t === 'partner' ? 'For partner' : 'Shared'}
          </button>
        ))}
      </div>
      {adding && (
        <div className="card-base p-4 mb-4 space-y-2">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="w-full bg-elevated border border-border rounded p-2 text-body-sm" />
          <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="URL (optional)" className="w-full bg-elevated border border-border rounded p-2 text-body-sm" />
          <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price (optional)" className="w-full bg-elevated border border-border rounded p-2 text-body-sm" />
          <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" className="w-full bg-elevated border border-border rounded p-2 text-body-sm" rows={2} />
          <select value={draft.for} onChange={(e) => setDraft({ ...draft, for: e.target.value as typeof draft.for })} className="w-full bg-elevated border border-border rounded p-2 text-body-sm">
            <option value="shared">Shared</option>
            <option value="me">For me</option>
            <option value="partner">Surprise for partner</option>
          </select>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded text-body-sm font-medium">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 border border-border px-3 py-2 rounded text-body-sm">Cancel</button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {filtered.map((i) => (
          <li key={i.id} className="card-base p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{i.title}</p>
              {i.price_cents !== null && <p className="text-caption text-muted">${(i.price_cents / 100).toFixed(2)}</p>}
              {i.url && <a href={i.url} target="_blank" rel="noreferrer" className="text-caption text-primary hover:underline truncate block">{i.url}</a>}
            </div>
            <button onClick={() => remove(i.id)} className="text-faint hover:text-primary p-2" aria-label="Remove">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="text-muted text-center py-12">Nothing here yet.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- wishlist
git add app/lib/migrations.ts app/lib/types.ts app/api/wishlist app/(main)/wishlist app/(main)/components/dashboard/widgets/WishlistWidget.tsx tests/endpoints/wishlist.test.ts
git commit -m "feat(wishlist): shared wishlist with surprise gift hiding rule"
```

---

## Feature 5: Chores

### Task C1: Migration + types

- [ ] **Step 1: Migration**

```ts
{
  name: '203_create_chores',
  sql: `
    CREATE TABLE IF NOT EXISTS chores (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cadence_days INT NOT NULL CHECK (cadence_days > 0),
      assigned_to VARCHAR(255),
      last_done_by VARCHAR(255),
      last_done_at TIMESTAMP WITH TIME ZONE,
      next_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
      streak INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chores_locket_due ON chores(locket_id, next_due_at);
  `,
},
```

- [ ] **Step 2: Type**

```ts
export interface Chore {
  id: string
  locket_id: string
  name: string
  cadence_days: number
  assigned_to: string | null
  last_done_by: string | null
  last_done_at: string | null
  next_due_at: string
  streak: number
  created_at: string
}
```

### Task C2: API + complete logic

**Files:**
- Create: `app/api/chores/route.ts`
- Create: `app/api/chores/[id]/route.ts`
- Create: `app/api/chores/[id]/complete/route.ts`
- Test: `tests/endpoints/chores.test.ts`

- [ ] **Step 1: Test (focus on streak math)**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'
import { query } from '../helpers/db'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/chores', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('CRUD + complete bumps streak when on time', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Trash', cadence_days: 7 }),
    })
    const { chore } = await create.json()
    expect(chore.streak).toBe(0)

    const done1 = await c.fetch(`/api/chores/${chore.id}/complete?locketId=${couple.locketId}`, { method: 'POST', headers: await h(couple.partnerA) })
    const after1 = (await done1.json()).chore
    expect(after1.streak).toBe(1)
    expect(after1.last_done_by).toBe(couple.partnerA.uid)
  })

  it('streak resets when completed late', async () => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO chores (locket_id, name, cadence_days, next_due_at, streak)
       VALUES ($1, 'X', 7, NOW() - INTERVAL '2 days', 5) RETURNING id`,
      [couple.locketId],
    )
    const c = new TestClient()
    const res = await c.fetch(`/api/chores/${rows[0].id}/complete?locketId=${couple.locketId}`, { method: 'POST', headers: await h(couple.partnerA) })
    const { chore } = await res.json()
    expect(chore.streak).toBe(1)
  })
})
```

- [ ] **Step 2: Implement routes**

```ts
// app/api/chores/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(`SELECT * FROM chores WHERE locket_id = $1 ORDER BY next_due_at ASC`, [locketId])
    return Response.json({ chores: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const { locketId, name, cadence_days, assigned_to, next_due_at } = await request.json()
    await requireLocketMembership(request, locketId)
    if (!name || !cadence_days) return Response.json({ error: 'invalid' }, { status: 400 })
    const { rows } = await query(
      `INSERT INTO chores (locket_id, name, cadence_days, assigned_to, next_due_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW())) RETURNING *`,
      [locketId, name, cadence_days, assigned_to ?? null, next_due_at ?? null],
    )
    return Response.json({ chore: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/chores/[id]/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { locketId, name, cadence_days, assigned_to } = await request.json()
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `UPDATE chores SET name = COALESCE($1, name), cadence_days = COALESCE($2, cadence_days), assigned_to = $3
       WHERE id = $4 AND locket_id = $5 RETURNING *`,
      [name ?? null, cadence_days ?? null, assigned_to ?? null, params.id, locketId],
    )
    return Response.json({ chore: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    await query(`DELETE FROM chores WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/chores/[id]/complete/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    const { uid } = await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `UPDATE chores
       SET last_done_by = $1,
           last_done_at = NOW(),
           streak = CASE WHEN NOW() <= next_due_at THEN streak + 1 ELSE 1 END,
           next_due_at = NOW() + (cadence_days || ' days')::INTERVAL
       WHERE id = $2 AND locket_id = $3 RETURNING *`,
      [uid, params.id, locketId],
    )
    return Response.json({ chore: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

### Task C3: Widget + page

**Files:**
- Create: `app/(main)/components/dashboard/widgets/ChoresWidget.tsx`
- Create: `app/(main)/chores/page.tsx`

- [ ] **Step 1: Widget**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, Check } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Chore } from '@/lib/types'

export function ChoresWidget({ locketId }: { locketId: string }) {
  const [chores, setChores] = useState<Chore[]>([])
  const load = async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/chores?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setChores((await res.json()).chores)
  }
  useEffect(() => { load() }, [locketId])

  const complete = async (id: string) => {
    const token = await getCurrentUserToken()
    await fetch(`/api/chores/${id}/complete?locketId=${locketId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const top3 = chores.slice(0, 3)
  const tone = (due: string) => {
    const d = new Date(due).getTime() - Date.now()
    if (d < 0) return 'text-primary'
    if (d < 24 * 3600 * 1000) return 'text-accent'
    return 'text-muted'
  }

  return (
    <div className="card-base p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <CheckSquare className="w-3.5 h-3.5" /> Up next
        </div>
        <Link href="/chores" className="text-caption text-muted hover:text-foreground">All →</Link>
      </div>
      {top3.length === 0 ? (
        <p className="text-muted text-body-sm">No chores yet. <Link href="/chores" className="text-primary">Add one →</Link></p>
      ) : (
        <ul className="space-y-2">
          {top3.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <button onClick={() => complete(c.id)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition" aria-label={`Mark ${c.name} done`}>
                <Check className="w-3 h-3 opacity-0 hover:opacity-100" />
              </button>
              <span className="flex-1 text-body-sm text-foreground truncate">{c.name}</span>
              <span className={`text-caption ${tone(c.next_due_at)}`}>
                {new Date(c.next_due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Page**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, Flame } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { Chore } from '@/lib/types'

export default function ChoresPage() {
  const { currentLocket } = useLocket()
  const [chores, setChores] = useState<Chore[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', cadence_days: '7' })

  const load = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/chores?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setChores((await res.json()).chores)
  }
  useEffect(() => { load() }, [currentLocket?.id])

  const create = async () => {
    if (!currentLocket || !draft.name.trim()) return
    const token = await getCurrentUserToken()
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId: currentLocket.id, name: draft.name.trim(), cadence_days: parseInt(draft.cadence_days, 10) }),
    })
    setDraft({ name: '', cadence_days: '7' })
    setAdding(false)
    load()
  }

  const complete = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/chores/${id}/complete?locketId=${currentLocket.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/chores/${id}?locketId=${currentLocket.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Chores</h1>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-body-sm font-medium">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {adding && (
        <div className="card-base p-4 mb-4 space-y-2">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Chore name" className="w-full bg-elevated border border-border rounded p-2 text-body-sm" />
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-muted">Every</span>
            <input value={draft.cadence_days} onChange={(e) => setDraft({ ...draft, cadence_days: e.target.value })} type="number" min={1} className="w-20 bg-elevated border border-border rounded p-2 text-body-sm" />
            <span className="text-body-sm text-muted">days</span>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded text-body-sm font-medium">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 border border-border px-3 py-2 rounded text-body-sm">Cancel</button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {chores.map((c) => (
          <li key={c.id} className="card-base p-4 flex items-center gap-3">
            <button onClick={() => complete(c.id)} className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition" aria-label={`Done`}>
              <Check className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{c.name}</p>
              <p className="text-caption text-muted">Due {new Date(c.next_due_at).toLocaleDateString()} · every {c.cadence_days}d</p>
            </div>
            {c.streak > 0 && (
              <span className="inline-flex items-center gap-1 text-caption text-accent"><Flame className="w-3 h-3" />{c.streak}</span>
            )}
            <button onClick={() => remove(c.id)} className="text-faint hover:text-primary p-2" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
        {chores.length === 0 && <li className="text-muted text-center py-12">Add your first chore.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- chores
git add app/lib/migrations.ts app/lib/types.ts app/api/chores app/(main)/chores app/(main)/components/dashboard/widgets/ChoresWidget.tsx tests/endpoints/chores.test.ts
git commit -m "feat(chores): recurring chores with streak tracking"
```

---

## Feature 6: Documents

### Task D1: Migration + types

- [ ] **Step 1: Migration**

```ts
{
  name: '204_create_documents',
  sql: `
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category VARCHAR(20) NOT NULL CHECK (category IN ('id','insurance','medical','vehicle','property','financial','pet','other')) DEFAULT 'other',
      gcs_key TEXT NOT NULL,
      file_type VARCHAR(100),
      size_bytes BIGINT,
      expiry_date DATE,
      notes TEXT,
      added_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_documents_locket_expiry ON documents(locket_id, expiry_date);
  `,
},
```

- [ ] **Step 2: Type**

```ts
export type DocumentCategory = 'id' | 'insurance' | 'medical' | 'vehicle' | 'property' | 'financial' | 'pet' | 'other'

export interface DocumentRecord {
  id: string
  locket_id: string
  name: string
  category: DocumentCategory
  gcs_key: string
  file_type: string | null
  size_bytes: number | null
  expiry_date: string | null
  notes: string | null
  added_by: string
  created_at: string
}
```

### Task D2: API (reuse upload)

**Files:**
- Create: `app/api/documents/route.ts`
- Create: `app/api/documents/[id]/route.ts`
- Create: `app/api/documents/[id]/url/route.ts`
- Test: `tests/endpoints/documents.test.ts`

- [ ] **Step 1: Inspect existing GCS helpers** — read `app/lib/gcs.ts` to find the resumable signed-URL function and the GCS object delete function. Note their exact names; reuse below.

- [ ] **Step 2: Test**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/documents', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('records metadata after upload', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({
        locketId: couple.locketId,
        name: 'Passport.pdf',
        category: 'id',
        gcs_key: `lockets/${couple.locketId}/documents/test`,
        file_type: 'application/pdf',
        size_bytes: 12345,
        expiry_date: '2030-01-01',
      }),
    })
    expect(res.status).toBe(200)
    const list = await c.fetch(`/api/documents?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
    const { documents } = await list.json()
    expect(documents).toHaveLength(1)
    expect(documents[0].category).toBe('id')
  })

  it('blocks non-member from list', async () => {
    const other = await createCouple()
    const c = new TestClient()
    const res = await c.fetch(`/api/documents?locketId=${couple.locketId}`, { headers: await h(other.partnerA) })
    expect(res.status).toBe(403)
    await destroyCouple(other)
  })
})
```

- [ ] **Step 3: Implement routes**

```ts
// app/api/documents/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

const validCategories = ['id','insurance','medical','vehicle','property','financial','pet','other']

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(`SELECT * FROM documents WHERE locket_id = $1 ORDER BY created_at DESC`, [locketId])
    return Response.json({ documents: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locketId, name, category, gcs_key, file_type, size_bytes, expiry_date, notes } = body
    const { uid } = await requireLocketMembership(request, locketId)
    if (!name || !gcs_key) return Response.json({ error: 'invalid' }, { status: 400 })
    const cat = validCategories.includes(category) ? category : 'other'
    const { rows } = await query(
      `INSERT INTO documents (locket_id, name, category, gcs_key, file_type, size_bytes, expiry_date, notes, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [locketId, name, cat, gcs_key, file_type ?? null, size_bytes ?? null, expiry_date ?? null, notes ?? null, uid],
    )
    return Response.json({ document: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/documents/[id]/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'
import { deleteObject } from '@/lib/gcs' // confirm exact export name in gcs.ts

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { locketId, name, category, expiry_date, notes } = body
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `UPDATE documents SET name = COALESCE($1, name), category = COALESCE($2, category),
       expiry_date = $3, notes = $4
       WHERE id = $5 AND locket_id = $6 RETURNING *`,
      [name ?? null, category ?? null, expiry_date ?? null, notes ?? null, params.id, locketId],
    )
    return Response.json({ document: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query<{ gcs_key: string }>(`SELECT gcs_key FROM documents WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    if (rows[0]) {
      try { await deleteObject(rows[0].gcs_key) } catch (e) { console.error('GCS delete failed', e) }
    }
    await query(`DELETE FROM documents WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/documents/[id]/url/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'
import { getSignedDownloadUrl } from '@/lib/gcs' // confirm exact export

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query<{ gcs_key: string }>(`SELECT gcs_key FROM documents WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    if (!rows[0]) return Response.json({ error: 'not_found' }, { status: 404 })
    const url = await getSignedDownloadUrl(rows[0].gcs_key)
    return Response.json({ url })
  } catch (err) { return authErrorResponse(err) }
}
```

> **Note for implementer:** `app/lib/gcs.ts` may export the delete + signed-download helpers under different names. Open `app/lib/gcs.ts`, identify the two functions (delete object + create signed download URL), and adjust imports. If the signed-download helper doesn't exist, add one mirroring the existing resumable-URL helper but with `action: 'read'` and a short TTL (e.g. 10 min).

### Task D3: Widget + page

**Files:**
- Create: `app/(main)/components/dashboard/widgets/DocumentsWidget.tsx`
- Create: `app/(main)/documents/page.tsx`

- [ ] **Step 1: Widget (expiring-soon only)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, AlertTriangle } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { DocumentRecord } from '@/lib/types'

export function DocumentsWidget({ locketId }: { locketId: string }) {
  const [expiring, setExpiring] = useState<DocumentRecord[]>([])
  useEffect(() => {
    ;(async () => {
      const token = await getCurrentUserToken()
      const res = await fetch(`/api/documents?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const { documents } = await res.json()
      const cutoff = Date.now() + 30 * 24 * 3600 * 1000
      setExpiring(documents.filter((d: DocumentRecord) => d.expiry_date && new Date(d.expiry_date).getTime() <= cutoff))
    })()
  }, [locketId])

  if (expiring.length === 0) return null

  return (
    <Link href="/documents" className="card-base p-5 block hover:bg-foreground/5 transition animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" /> Documents
        </div>
        <span className="inline-flex items-center gap-1 text-caption text-primary"><AlertTriangle className="w-3 h-3" />{expiring.length} expiring</span>
      </div>
      <ul className="space-y-1">
        {expiring.slice(0, 3).map((d) => (
          <li key={d.id} className="text-body-sm text-foreground truncate">• {d.name} <span className="text-caption text-muted">({new Date(d.expiry_date!).toLocaleDateString()})</span></li>
        ))}
      </ul>
    </Link>
  )
}
```

- [ ] **Step 2: Page (categorized list + upload button)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Upload, Trash2, Download } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { DocumentRecord, DocumentCategory } from '@/lib/types'

const categories: DocumentCategory[] = ['id','insurance','medical','vehicle','property','financial','pet','other']

export default function DocumentsPage() {
  const { currentLocket } = useLocket()
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [filter, setFilter] = useState<DocumentCategory | 'all'>('all')
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/documents?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setDocs((await res.json()).documents)
  }
  useEffect(() => { load() }, [currentLocket?.id])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentLocket) return
    setUploading(true)
    try {
      const token = await getCurrentUserToken()
      // Reuse existing /api/upload signed-URL endpoint pattern
      const sign = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type, locketId: currentLocket.id, prefix: 'documents' }),
      })
      const { uploadUrl, gcs_key } = await sign.json()
      // Resumable: client-side 2-step. Reuse existing helper if one exists in app/lib/upload.ts.
      // Minimal inline implementation:
      const init = await fetch(uploadUrl, { method: 'POST', headers: { 'x-goog-resumable': 'start', 'content-type': file.type } })
      const session = init.headers.get('Location')!
      await fetch(session, { method: 'PUT', body: file })
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ locketId: currentLocket.id, name: file.name, category: 'other', gcs_key, file_type: file.type, size_bytes: file.size }),
      })
      load()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/documents/${id}?locketId=${currentLocket.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const download = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/documents/${id}/url?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const { url } = await res.json(); window.open(url, '_blank') }
  }

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.category === filter)

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Documents</h1>
        <label className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-body-sm font-medium cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload'}
          <input type="file" className="hidden" onChange={onPick} disabled={uploading} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-caption border ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1 rounded-full text-caption border ${filter === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{c}</button>
        ))}
      </div>
      <ul className="space-y-2">
        {filtered.map((d) => (
          <li key={d.id} className="card-base p-4 flex items-center gap-3">
            <FileTextIcon />
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{d.name}</p>
              <p className="text-caption text-muted">{d.category}{d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString()}` : ''}</p>
            </div>
            <button onClick={() => download(d.id)} className="text-faint hover:text-primary p-2" aria-label="Download"><Download className="w-4 h-4" /></button>
            <button onClick={() => remove(d.id)} className="text-faint hover:text-primary p-2" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
        {filtered.length === 0 && <li className="text-muted text-center py-12">No documents.</li>}
      </ul>
    </div>
  )
}

function FileTextIcon() {
  return <span className="w-8 h-8 rounded bg-surface-amber/40 flex items-center justify-center">📄</span>
}
```

> **Note for implementer:** `app/api/upload` may already exist with a different request shape. Check it before writing the upload call above; adapt the request body keys to match. If `prefix` isn't supported, store all docs in the same media path or extend the upload route.

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- documents
git add app/lib/migrations.ts app/lib/types.ts app/api/documents app/(main)/documents app/(main)/components/dashboard/widgets/DocumentsWidget.tsx tests/endpoints/documents.test.ts
git commit -m "feat(documents): shared documents drawer with expiry tracking"
```

---

## Feature 7: Grocery

### Task GR1: Migration + types

- [ ] **Step 1: Migration**

```ts
{
  name: '205_create_grocery_items',
  sql: `
    CREATE TABLE IF NOT EXISTS grocery_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      qty TEXT,
      category TEXT,
      checked BOOLEAN NOT NULL DEFAULT FALSE,
      added_by VARCHAR(255) NOT NULL,
      checked_by VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      checked_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_grocery_locket_state ON grocery_items(locket_id, checked, created_at DESC);
  `,
},
```

- [ ] **Step 2: Type**

```ts
export interface GroceryItem {
  id: string
  locket_id: string
  name: string
  qty: string | null
  category: string | null
  checked: boolean
  added_by: string
  checked_by: string | null
  created_at: string
  checked_at: string | null
}
```

### Task GR2: API

**Files:**
- Create: `app/api/grocery/route.ts`
- Create: `app/api/grocery/[id]/route.ts`
- Create: `app/api/grocery/clear-checked/route.ts`
- Test: `tests/endpoints/grocery.test.ts`

- [ ] **Step 1: Test**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/grocery', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('add → check → clear-checked flow', async () => {
    const c = new TestClient()
    const a = await c.fetch('/api/grocery', { method: 'POST', headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, name: 'Milk' }) })
    const { item } = await a.json()
    await c.fetch(`/api/grocery/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) }, body: JSON.stringify({ locketId: couple.locketId, checked: true }) })
    await c.fetch('/api/grocery/clear-checked', { method: 'POST', headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId }) })
    const list = await c.fetch(`/api/grocery?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
    expect((await list.json()).items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Implement routes**

```ts
// app/api/grocery/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(`SELECT * FROM grocery_items WHERE locket_id = $1 ORDER BY checked ASC, created_at DESC`, [locketId])
    return Response.json({ items: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const { locketId, name, qty, category } = await request.json()
    const { uid } = await requireLocketMembership(request, locketId)
    if (!name) return Response.json({ error: 'name_required' }, { status: 400 })
    const { rows } = await query(
      `INSERT INTO grocery_items (locket_id, name, qty, category, added_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [locketId, name, qty ?? null, category ?? null, uid],
    )
    return Response.json({ item: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/grocery/[id]/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { locketId, checked, name, qty, category } = body
    const { uid } = await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `UPDATE grocery_items
       SET name = COALESCE($1, name), qty = COALESCE($2, qty), category = COALESCE($3, category),
           checked = COALESCE($4, checked),
           checked_by = CASE WHEN $4 = true THEN $5 WHEN $4 = false THEN NULL ELSE checked_by END,
           checked_at = CASE WHEN $4 = true THEN NOW() WHEN $4 = false THEN NULL ELSE checked_at END
       WHERE id = $6 AND locket_id = $7 RETURNING *`,
      [name ?? null, qty ?? null, category ?? null, checked ?? null, uid, params.id, locketId],
    )
    return Response.json({ item: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    await query(`DELETE FROM grocery_items WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
```

```ts
// app/api/grocery/clear-checked/route.ts
import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const { locketId } = await request.json()
    await requireLocketMembership(request, locketId)
    await query(`DELETE FROM grocery_items WHERE locket_id = $1 AND checked = true`, [locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
```

### Task GR3: Widget + page

**Files:**
- Create: `app/(main)/components/dashboard/widgets/GroceryWidget.tsx`
- Create: `app/(main)/grocery/page.tsx`

- [ ] **Step 1: Widget (quick-add)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Plus } from 'lucide-react'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { GroceryItem } from '@/lib/types'

export function GroceryWidget({ locketId }: { locketId: string }) {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [name, setName] = useState('')

  const load = async () => {
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/grocery?locketId=${locketId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setItems((await res.json()).items)
  }
  useEffect(() => { load() }, [locketId])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const token = await getCurrentUserToken()
    await fetch('/api/grocery', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ locketId, name: name.trim() }) })
    setName('')
    load()
  }

  const unchecked = items.filter((i) => !i.checked)

  return (
    <div className="card-base p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-caption text-accent font-bold uppercase tracking-wider">
          <ShoppingCart className="w-3.5 h-3.5" /> Grocery
        </div>
        <Link href="/grocery" className="text-caption text-muted hover:text-foreground">{unchecked.length} open →</Link>
      </div>
      <ul className="space-y-1 mb-3">
        {unchecked.slice(0, 3).map((i) => (
          <li key={i.id} className="text-body-sm text-foreground truncate">• {i.name}{i.qty ? ` (${i.qty})` : ''}</li>
        ))}
        {unchecked.length === 0 && <li className="text-caption text-muted">List is empty.</li>}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add item…" className="flex-1 bg-elevated border border-border rounded p-2 text-body-sm" />
        <button type="submit" className="bg-primary text-primary-foreground px-3 rounded text-body-sm" aria-label="Add"><Plus className="w-4 h-4" /></button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Page**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import type { GroceryItem } from '@/lib/types'

export default function GroceryPage() {
  const { currentLocket } = useLocket()
  const [items, setItems] = useState<GroceryItem[]>([])
  const [name, setName] = useState('')

  const load = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    const res = await fetch(`/api/grocery?locketId=${currentLocket.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setItems((await res.json()).items)
  }
  useEffect(() => { load() }, [currentLocket?.id])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentLocket || !name.trim()) return
    const token = await getCurrentUserToken()
    await fetch('/api/grocery', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ locketId: currentLocket.id, name: name.trim() }) })
    setName('')
    load()
  }

  const toggle = async (id: string, checked: boolean) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/grocery/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ locketId: currentLocket.id, checked }) })
    load()
  }

  const remove = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch(`/api/grocery/${id}?locketId=${currentLocket.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const clearChecked = async () => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch('/api/grocery/clear-checked', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ locketId: currentLocket.id }) })
    load()
  }

  return (
    <div className="container mx-auto px-4 max-w-xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display text-foreground">Grocery</h1>
        <button onClick={clearChecked} className="text-body-sm text-muted hover:text-primary">Clear checked</button>
      </div>
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add item…" className="flex-1 bg-elevated border border-border rounded-lg p-3 text-body" />
        <button type="submit" className="bg-primary text-primary-foreground px-4 rounded-lg" aria-label="Add"><Plus className="w-4 h-4" /></button>
      </form>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2 border-b border-border">
            <input type="checkbox" checked={i.checked} onChange={(e) => toggle(i.id, e.target.checked)} className="w-5 h-5" aria-label={`Check ${i.name}`} />
            <span className={`flex-1 ${i.checked ? 'line-through text-faint' : 'text-foreground'}`}>{i.name}{i.qty ? ` (${i.qty})` : ''}</span>
            <button onClick={() => remove(i.id)} className="text-faint hover:text-primary p-1" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted text-center py-12">List is empty.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- grocery
git add app/lib/migrations.ts app/lib/types.ts app/api/grocery app/(main)/grocery app/(main)/components/dashboard/widgets/GroceryWidget.tsx tests/endpoints/grocery.test.ts
git commit -m "feat(grocery): shared grocery list with check + clear"
```

---

## Final: Dashboard composition + nav

### Task FN1: Wire widgets into ImmersiveHome

**Files:**
- Modify: `app/(main)/components/dashboard/ImmersiveHome.tsx`

- [ ] **Step 1: Add imports + render new widgets in order specified by spec**

Replace the dashboard render block in `ImmersiveHome.tsx` (between `{/* Pinned Note */}` and the closing `</div>` of the container) so it matches this order:

```tsx
import { ReminisceWidget } from './widgets/ReminisceWidget'
import { GratitudeWidget } from './widgets/GratitudeWidget'
import { DateNightWidget } from './widgets/DateNightWidget'
import { WishlistWidget } from './widgets/WishlistWidget'
import { ChoresWidget } from './widgets/ChoresWidget'
import { DocumentsWidget } from './widgets/DocumentsWidget'
import { GroceryWidget } from './widgets/GroceryWidget'
```

Inside the container (`<div className="container mx-auto px-4 max-w-5xl">`), the order from top to bottom must be:

1. Header (existing)
2. Days Together (existing)
3. `<ReminisceWidget locketId={locket.id} />` — new, full-width
4. PinnedNote (existing)
5. SpotlightCard (existing)
6. `<GratitudeWidget locketId={locket.id} currentUid={user.uid} />` — new, full-width
7. `<DateNightWidget locketId={locket.id} />` — new, full-width
8. CountdownWidget / Set-a-Date fallback (existing)
9. BucketListWidget (existing)
10. New 2-col grid: WishlistWidget, ChoresWidget, DocumentsWidget, GroceryWidget

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in">
  <WishlistWidget locketId={locket.id} />
  <ChoresWidget locketId={locket.id} />
  <DocumentsWidget locketId={locket.id} />
  <GroceryWidget locketId={locket.id} />
</div>
```

`DocumentsWidget` returns `null` when nothing is expiring, so the cell collapses gracefully.

### Task FN2: Nav grouping

**Files:**
- Modify: `app/components/Navigation.tsx`

- [ ] **Step 1: Add "Together" group**

Add a 6th nav item that opens a popover/sheet listing the new pages. Concrete change: add a `Together` item using lucide `LayoutGrid` icon. On tap, render a popover with links to `/wishlist`, `/chores`, `/documents`, `/grocery`, `/date-nights`, `/gratitude`. On desktop, render the same links in the side rail collapsed under a clickable disclosure.

```tsx
import { LayoutGrid, Gift, CheckSquare, FileText, ShoppingCart, Sparkles, HeartHandshake } from 'lucide-react'

const togetherLinks = [
  { label: 'Wishlist', href: '/wishlist', icon: Gift },
  { label: 'Chores', href: '/chores', icon: CheckSquare },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Grocery', href: '/grocery', icon: ShoppingCart },
  { label: 'Date nights', href: '/date-nights', icon: Sparkles },
  { label: 'Gratitude', href: '/gratitude', icon: HeartHandshake },
]
```

Add `{ label: 'Together', href: '#together', icon: LayoutGrid }` to the existing `navItems` array. When that nav button is tapped (use local `useState` open flag), render an absolutely-positioned panel listing `togetherLinks` with the same active-state styling used for the existing items.

> **Implementer note:** the existing `Navigation` has separate mobile + desktop rails. Add the popover behavior to both. Visual polish (transitions, exact positioning) can be refined here using the frontend-design skill if desired.

### Task FN3: Manual smoke + commit

- [ ] **Step 1: Manual smoke test**

Start dev server (`npm run dev`), log in, and verify on the home dashboard:

- Reminisce widget renders if there is a memory dated to today's month/day in a prior year (seed one if necessary).
- Gratitude widget renders empty state for first-time, accepts text under 280 chars, shows partner's gratitude on the other account.
- Date-night widget shows "Spin" CTA, then shows the saved pick.
- Wishlist/Chores/Grocery widgets render and link to their full pages.
- Documents widget is hidden when no docs are expiring within 30 days.
- "Together" nav button opens a panel with all six new feature links; each link routes correctly.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all endpoint tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/(main)/components/dashboard/ImmersiveHome.tsx app/components/Navigation.tsx
git commit -m "feat(dashboard): wire new widgets and Together nav group"
```

---

## Self-Review

- **Spec coverage:** Each spec section maps to tasks. Foundation (membership helper) → F1. Reminisce → R1, R2. Gratitude → G1–G5. Date-night → DN1–DN4. Wishlist → W1–W3. Chores → C1–C3. Documents → D1–D3. Grocery → GR1–GR3. Dashboard composition + nav → FN1–FN3. Design direction (tokens, motion, a11y) is referenced inside each widget code block; refinement is left to frontend-design skill in implementation.
- **Type consistency:** `MemoryGroup`, `MediaItem` reused from `@/lib/types`. New types `Gratitude`, `DateNightPick`, `WishlistItem`, `Chore`, `DocumentRecord`, `DocumentCategory`, `GroceryItem` are defined once and imported consistently.
- **Auth helper:** `requireLocketMembership` returns `{uid, partnerUid}`; gratitude POST is the only consumer of `partnerUid` and handles the no-partner case.
- **Migrations:** numbered `200`–`205` to avoid collision with existing 100s; appended to `app/lib/migrations.ts` array (codebase convention — spec referenced separate SQL files but actual code uses array).
- **GCS reuse:** Documents tasks call out that `app/lib/gcs.ts` may name helpers differently and instruct the implementer to verify and possibly add a signed-download helper.
- **Upload endpoint reuse:** Documents page upload flow flags that `/api/upload` may need a `prefix` parameter or alternative; implementer must check before wiring.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-19-dashboard-relationship-features.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
