# Dashboard Relationship Features — Design Spec

**Date:** 2026-04-19
**Status:** Draft, awaiting user review
**Scope:** Seven new features layered onto the home dashboard (`ImmersiveHome`) to make Twofold a daily-use couple's tool, not just a passive scrapbook.

## Goals

- Move the home dashboard from passive (display-only) to active (rituals + utility).
- Each feature is independently shippable behind no flag — additive only.
- All features reuse existing infra: Postgres + raw SQL, Firebase Auth, GCS resumable upload, locket multi-tenant model, Tailwind + shadcn UI tokens.

## Non-Goals (this spec)

- Trip planner, meal plan, finances trio (budget snapshot, savings goals, who-owes-who) — each gets its own future spec.
- Push notifications, email digests, OCR, URL unfurling, third-party integrations.

## Features

| # | Feature           | New tables          | Reuses                  |
|---|-------------------|---------------------|-------------------------|
| 1 | Reminisce card    | none                | `memory_groups`         |
| 2 | Gratitude ping    | `gratitudes`        | —                       |
| 3 | Date-night gen    | `date_night_picks`  | static seed file        |
| 4 | Wishlist          | `wishlist_items`    | —                       |
| 5 | Chores            | `chores`            | —                       |
| 6 | Documents drawer  | `documents`         | GCS resumable upload    |
| 7 | Grocery list      | `grocery_items`     | —                       |

## Shared Architecture

- **Tenant isolation:** every new table has `locket_id uuid NOT NULL REFERENCES lockets(id)`. Every API query filters by `locket_id` and verifies the caller is a member via `locket_users`. RLS policy mirrors existing tenant tables.
- **API:** REST under `/api/<feature>`. Endpoints: `GET` (list), `POST` (create), `PATCH /:id`, `DELETE /:id`, plus feature-specific actions where noted. Auth via existing Firebase JWT middleware.
- **Types:** new interfaces in `app/lib/types.ts` (TS PascalCase, DB snake_case).
- **DB access:** raw SQL via `query()` from `@/lib/db`. Parameterized only.
- **Migrations:** one additive SQL file per feature in `database/migrations/`.
- **Pages:** `app/(main)/<feature>/page.tsx`.
- **Widgets:** `app/(main)/components/dashboard/widgets/<Feature>Widget.tsx`.

## Schemas

### `gratitudes`
```sql
CREATE TABLE gratitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locket_id uuid NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
  from_uid text NOT NULL,
  to_uid text NOT NULL,
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);
CREATE INDEX idx_gratitudes_locket_created ON gratitudes(locket_id, created_at DESC);
```

### `date_night_picks`
```sql
CREATE TABLE date_night_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locket_id uuid NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
  idea_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('saved','completed','dismissed')),
  created_by text NOT NULL,
  picked_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_date_picks_locket_status ON date_night_picks(locket_id, status, picked_at DESC);
```
Static idea seed in `app/lib/data/date-night-ideas.ts` exporting an array of `{id, title, vibe, setting, budget, est_minutes}`. ~60 entries to start.

### `wishlist_items`
```sql
CREATE TABLE wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locket_id uuid NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
  added_by text NOT NULL,
  for_uid text,
  title text NOT NULL,
  url text,
  price_cents int CHECK (price_cents IS NULL OR price_cents >= 0),
  notes text,
  status text NOT NULL CHECK (status IN ('open','reserved','gifted','removed')) DEFAULT 'open',
  reserved_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wishlist_locket_status ON wishlist_items(locket_id, status);
```
**`for_uid` semantics:** `NULL` means shared/either partner (visible to both). A specific uid means "intended recipient." **Surprise rule (server-enforced):** when `added_by != caller_uid` AND `for_uid = caller_uid`, exclude row from caller's `GET` response. Self-added items (`added_by = caller_uid`) and shared items (`for_uid IS NULL`) remain visible to both partners.

### `chores`
```sql
CREATE TABLE chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locket_id uuid NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
  name text NOT NULL,
  cadence_days int NOT NULL CHECK (cadence_days > 0),
  assigned_to text,
  last_done_by text,
  last_done_at timestamptz,
  next_due_at timestamptz NOT NULL,
  streak int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chores_locket_due ON chores(locket_id, next_due_at);
```
**Complete action:** `next_due_at = now() + cadence_days * interval '1 day'`; if `now() <= prev next_due_at` then `streak += 1` else `streak = 1`.

### `documents`
```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locket_id uuid NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('id','insurance','medical','vehicle','property','financial','pet','other')) DEFAULT 'other',
  gcs_key text NOT NULL,
  file_type text,
  size_bytes bigint,
  expiry_date date,
  notes text,
  added_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_locket_expiry ON documents(locket_id, expiry_date);
```
GCS path prefix: `lockets/<locket_id>/documents/<uuid>`. `DELETE` removes the GCS object.

### `grocery_items`
```sql
CREATE TABLE grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locket_id uuid NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty text,
  category text,
  checked boolean NOT NULL DEFAULT false,
  added_by text NOT NULL,
  checked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz
);
CREATE INDEX idx_grocery_locket_state ON grocery_items(locket_id, checked, created_at DESC);
```

## API Endpoints

### Reminisce
- `GET /api/reminisce?locketId=` — returns up to 5 `MemoryGroup` rows from prior years matching today's month/day.

### Gratitudes
- `GET /api/gratitudes?locketId=` — latest 20.
- `POST /api/gratitudes` `{text}` — `from_uid = caller`, `to_uid = the other member of `locket_users` for this locket. If the locket has only one member (no partner joined yet), responds 400 `{error: "no_partner"}`.
- `POST /api/gratitudes/:id/seen` — sets `seen_at` if recipient is caller.

### Date nights
- `GET /api/date-nights/ideas?vibe=&setting=&budget=` — filters static seed.
- `GET /api/date-nights/picks?locketId=` — current saved + recent completed.
- `POST /api/date-nights/picks` `{idea_id}` — status `saved`.
- `PATCH /api/date-nights/picks/:id` `{status}` — `completed` sets `completed_at`.

### Wishlist
- `GET /api/wishlist?locketId=` — server filters surprise rule.
- `POST /api/wishlist` `{title, url?, price_cents?, notes?, for_uid?}`.
- `PATCH /api/wishlist/:id` — fields above + `status`, `reserved_by`.
- `DELETE /api/wishlist/:id`.

### Chores
- `GET /api/chores?locketId=` — sorted by `next_due_at`.
- `POST /api/chores` `{name, cadence_days, assigned_to?, next_due_at?}` — defaults `next_due_at = now()`.
- `PATCH /api/chores/:id`.
- `POST /api/chores/:id/complete`.
- `DELETE /api/chores/:id`.

### Documents
- `GET /api/documents?locketId=`.
- `POST /api/documents` `{name, category, gcs_key, file_type, size_bytes, expiry_date?, notes?}` — called after upload completes.
- `PATCH /api/documents/:id`.
- `DELETE /api/documents/:id` — also deletes GCS object.
- `GET /api/documents/:id/url` — signed download URL.

### Grocery
- `GET /api/grocery?locketId=`.
- `POST /api/grocery` `{name, qty?, category?}`.
- `PATCH /api/grocery/:id` `{checked?, name?, qty?, category?}`.
- `DELETE /api/grocery/:id`.
- `POST /api/grocery/clear-checked` `{locketId}`.

## Dashboard Composition

`ImmersiveHome` order (top → bottom):

1. Header (greeting + locket name + settings) — unchanged.
2. Days-together hero number — unchanged.
3. **ReminisceWidget** — full-width band; cover image bleeds; "N years ago today" badge; tap → `MemoryDetailModal`. Hidden when no matches.
4. PinnedNote — unchanged.
5. SpotlightCard — unchanged.
6. **GratitudeWidget** — full-width card; partner's latest gratitude + inline composer; subtle pulse if `seen_at IS NULL`. On render, calls `/seen` for the displayed item.
7. **DateNightWidget** — narrow card; current saved pick OR "Spin a date night" CTA; tap → `/date-nights`.
8. CountdownWidget — unchanged.
9. BucketListWidget — unchanged.
10. **Widget grid (2-col desktop, 1-col mobile):** WishlistPeek · ChoresUpNext · DocumentsExpiring (only when count > 0) · GroceryQuickAdd.

## Navigation

Add nav entries (lucide icons in parens): Wishlist (`Gift`), Chores (`CheckSquare`), Documents (`FileText`), Grocery (`ShoppingCart`), Date nights (`Sparkles`), Gratitude (`HeartHandshake`). Reminisce has no nav entry.

To avoid crowding the existing rail, group these six under a single "Together" expandable section in `Navigation`. Implementation plan resolves the exact UX with frontend-design.

## Design Direction

- **Tokens:** Deep Rose, Blush Paper, Muted Gold, Truffle. Playfair (display), Lato (body). Tailwind + `cn()`. lucide icons.
- **Cards:** reuse `card-base` class; match rounding, border, shadow.
- **Empty states:** invitations, not errors. Verb-led microcopy + lucide glyph.
- **Motion:** fade-in on mount; gentle hover scale on Reminisce/Gratitude. No looping animations.
- **Mobile-first:** clean at 375px width. Touch targets ≥44px.
- **A11y:** aria-labels on icon buttons; existing `focus:ring-primary/20` pattern; semantic landmarks.
- **Inputs:** composer textareas capped at 280 chars with soft counter on focus.

## Auth & Permissions

All endpoints require Firebase JWT. Caller membership in `locket_users` for the requested `locket_id` is verified before any read/write. No role distinctions needed for these features (both partners equal).

## Error Handling

- API: 401 unauthenticated, 403 not-a-member, 404 row not found, 400 validation. JSON body `{error: string}`.
- Client: surface failure inline (toast or field message); never lose user input on error.

## Testing

Vitest endpoint suite covers each new route:
- Happy path CRUD.
- Tenant isolation: caller from another locket gets 403/404.
- Surprise rule: gift-for-partner hidden from intended recipient.
- Chore complete: streak math (on-time vs late).
- Documents delete: GCS object removed.

Frontend tested manually in dev server before merge.

## Rollout

- One PR per feature. Order: Reminisce → Gratitude → Date-night → Wishlist → Chores → Documents → Grocery.
- Each PR includes: migration, types, API, widget, full page, nav entry update, tests.
- No feature flags; additive shipping.
