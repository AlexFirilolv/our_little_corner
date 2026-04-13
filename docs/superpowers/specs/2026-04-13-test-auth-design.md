# Test Authentication & Endpoint Testing — Design

**Date:** 2026-04-13
**Status:** Approved (awaiting implementation plan)

## Problem

Twofold authenticates users exclusively via Google SSO through Firebase. There is no non-interactive path, which blocks automated endpoint testing both locally during development and in CI. A proposed UI-level hack (special invite-link string that bypasses Firebase from the landing page) was rejected because it ships a test-only surface into production code with a high blast radius if the gating env var is misconfigured or leaked.

## Goals

- Drive real `/api/*` endpoints from automated tests with a genuine `firebase-session` cookie.
- Zero production code modified. No test-only routes, no auth bypass in the app.
- Ephemeral, fully isolated test fixtures (two users + one locket per test) to exercise both owner-side and partner-side flows.
- Identical code path for local dev and CI.

## Non-Goals

- Browser-level end-to-end tests (Playwright). May be added later; framework choice (Vitest) does not preclude it.
- Load testing.
- Testing the Google SSO flow itself.

## Approach

Use Firebase's own Admin SDK to mint **custom tokens** for ephemeral test users. Tests exchange custom tokens for real Firebase ID tokens via the Firebase client SDK, then POST to the existing `/api/auth` endpoint to obtain a real `firebase-session` cookie. All subsequent requests use that cookie exactly as a browser would.

This exercises the real authentication path end-to-end and requires no changes to the application.

## Architecture

```
[Vitest test]
    ↓ tests/helpers/fixtures.ts
      ├─ Admin SDK: createUser(uid_A), createUser(uid_B)     (ephemeral)
      ├─ pg:        INSERT locket, INSERT locket_users (A,B)
      ├─ Admin SDK: createCustomToken(uid_A) → tokenA
      └─ Admin SDK: createCustomToken(uid_B) → tokenB
    ↓
[Test body]
      ├─ Client SDK: signInWithCustomToken(tokenA) → idTokenA
      ├─ fetch POST /api/auth {idToken: idTokenA}
      │     → Set-Cookie: firebase-session=...              (real session)
      ├─ fetch /api/... with cookie jar                     (endpoint under test)
      └─ assert
    ↓ afterEach
      ├─ Admin SDK: deleteUser(uid_A), deleteUser(uid_B)
      └─ pg: DELETE FROM lockets WHERE id=$1                (cascades)
```

## Components

### `tests/helpers/firebaseTest.ts`
Initialises the Firebase Admin SDK (reusing the existing `FIREBASE_ADMIN_*` environment variables) and a Firebase client SDK app pointed at the same project. Exposes `mintIdToken(uid)` which chains `createCustomToken` → `signInWithCustomToken` → `getIdToken`.

### `tests/helpers/fixtures.ts`
- `createCouple()`:
  1. Create two Firebase users with namespaced UIDs (`test-<nanoid>`) and disposable emails (`test+<nanoid>@twofold.test`).
  2. `INSERT` one locket row plus two `locket_users` rows (both `role = partner`).
  3. Return `{ locketId, partnerA: { uid, mintIdToken }, partnerB: { uid, mintIdToken } }`.
- `destroyCouple(fixture)`: `adminAuth.deleteUsers([...])` + `DELETE FROM lockets WHERE id = $1`.

### `tests/helpers/client.ts`
Thin `fetch` wrapper around a `tough-cookie` jar. `.authenticateAs(partner)` calls `mintIdToken()`, POSTs `/api/auth`, and persists the returned cookie. Base URL from `TEST_BASE_URL` (default `http://localhost:3000`).

### `tests/setup/globalSetup.ts` (Vitest globalSetup)
- Connect to the `twofold_test` database.
- `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Apply `database/multi-tenant-schema.sql` and any files in `database/migrations/` in order.

### `tests/setup/runServer.ts`
Starts Next.js against `.env.test` (with `DATABASE_URL` pointed at `twofold_test`). In CI the workflow spawns the server before running tests; locally the helper detects an already-running server on `TEST_BASE_URL` and reuses it, otherwise spawns one.

### `.env.test`
Committed file with safe defaults (`DATABASE_URL=postgres://.../twofold_test`, `TEST_BASE_URL=http://localhost:3000`). Real credentials come from CI secrets or a local untracked `.env.test.local`.

### `vitest.config.ts`
Registers globalSetup, sets `testTimeout: 30000`, runs files in parallel and tests within a file serially.

## Database Strategy

Local: add a second database, `twofold_test`, inside the existing `db` service in `docker-compose.yml` via an `init.sql` mounted at `/docker-entrypoint-initdb.d/`. No new service, no new port. The dev database (`twofold`) is untouched.

CI: GitHub Actions `services: postgres:15` service container; `globalSetup` applies the schema at the start of each workflow run.

**Safety guard:** `globalSetup` refuses to run if `DATABASE_URL`'s database name does not end in `_test`, to prevent accidental destruction of dev data.

## Data Flow and Isolation

Per-test lifecycle:
```
beforeEach → createCouple() → { locketId, partnerA, partnerB }
  test body → client.authenticateAs(partnerA) → fetch(/api/...) → assert
afterEach  → destroyCouple()
```

Isolation guarantees:
- Firebase UIDs are random nanoids, so parallel tests never collide.
- All tenant-scoped rows live under the ephemeral `locketId`; tenant tables FK on `locket_id` with `ON DELETE CASCADE` (schema audit step — add cascade where missing).
- No shared fixture state between tests.
- Vitest runs files in parallel, tests within a file serially.

Teardown robustness:
- `afterEach` teardown is wrapped in try/catch; failures are logged but do not mask the test's own assertion failures.
- A global `afterAll` sweeps stale `test-*` Firebase users as a safety net for crashes mid-test.

## Error Handling

- Missing `FIREBASE_ADMIN_*` or `DATABASE_URL` in the test environment → `globalSetup` fails fast with a clear message.
- `DATABASE_URL` does not target a `*_test` database → hard refuse before running migrations.
- Custom-token exchange failure surfaces as a setup error, not a silent test failure.

## CI Wiring

`.github/workflows/test.yml`:
- `services: postgres:15` container.
- Steps: checkout → `npm ci` → `npm run build` → `npm start &` (wait for health) → `npm test`.
- Secrets: reuse existing `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, plus the matching `NEXT_PUBLIC_FIREBASE_*` variables. Tests use the same Firebase project as dev; ephemeral users are namespaced `test-*` and cleaned up per test.

## Initial Test Coverage

Scoped to prove the harness works and catch the highest-value regressions. Expand in follow-up PRs.

1. `GET /api/auth` while authenticated → returns the user.
2. `GET /api/lockets` → returns only the caller's locket.
3. Tenant isolation: partner from couple A cannot read couple B's data (create two couples, assert 403/empty).
4. `POST /api/memory-groups` then `GET` round-trip.
5. `POST /api/bucket-list` then `GET` round-trip.

## Open Questions

None at this time. Implementation plan to follow via the `writing-plans` skill.
