# Twofold

A private digital locket for couples to store and cherish their shared memories together. Built with Next.js 14, PostgreSQL, Firebase Auth, and Google Cloud Storage.

## Features

### Core Experience
- **Timeline** - Chronological view of all shared memories and media
- **Journey Map** - Location-based visualization of memories
- **Memory Groups** - Organize photos and videos into meaningful collections
- **Milestones** - Mark special relationship moments
- **Bucket List** - Track shared goals and dreams together

### Security & Privacy
- **Firebase Authentication** - Secure Google sign-in
- **Multi-tenant Architecture** - Complete data isolation per couple ("Locket")
- **Row-Level Security** - Database-enforced access control
- **Partner Invites** - Secure invite codes to join a Locket

### Media Management
- **Cloud Storage** - Google Cloud Storage for all media files
- **Signed URLs** - Secure, time-limited access to media
- **Rich Notes** - TipTap editor for adding context to memories
- **Location Data** - Geotag support for memories

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- GCP project with Cloud Storage and Firebase

### Development Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start PostgreSQL with Docker
docker compose up -d db

# Run development server
npm run dev
```

### Docker Deployment
```bash
docker compose up -d --build
```

### Environment Variables

Required configuration groups:

| Group | Variables |
|-------|-----------|
| Database | `DATABASE_URL` |
| Security | `JWT_SECRET`, `NEXTAUTH_SECRET` |
| GCP | `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`, `GCS_BUCKET_NAME` |
| Firebase Client | `NEXT_PUBLIC_FIREBASE_*` (6 vars) |
| Firebase Admin | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` |

See `.env.example` for the complete list.

## Architecture

```
app/
├── (main)/              # Authenticated routes (timeline, journey, profile, upload)
├── api/                 # REST endpoints
├── contexts/            # React Contexts (AuthContext, LocketContext)
├── lib/                 # Utilities, DB, Firebase, types
└── components/ui/       # Shadcn UI components

database/
├── multi-tenant-schema.sql
└── migrations/
```

### Key Concepts
- **Locket** - A couple's private space (multi-tenant unit)
- **Memory Group** - A collection of related media items
- **Milestone** - A significant relationship event

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes, PostgreSQL (raw SQL with `pg`)
- **Auth**: Firebase Auth + `next-firebase-auth-edge`
- **Storage**: Google Cloud Storage
- **Deployment**: Docker, Kubernetes (k3s), FluxCD, Envoy Gateway

## Development

### Commands
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

### Code Conventions
- **TypeScript**: Strict mode, no `any` types
- **Database**: Raw SQL with parameterized queries, always filter by `locket_id`
- **Components**: Functional with Tailwind CSS styling
- **Icons**: lucide-react

## Deployment

- **CI/CD**: GitHub Actions → GHCR
- **GitOps**: FluxCD with ImageRepository/ImagePolicy
- **Gateway**: Envoy Gateway + Kubernetes Gateway API
- **Tunneling**: Cloudflare tunnel

## Design System

| Token | Value |
|-------|-------|
| Deep Rose | #BA4A68 |
| Blush Paper | #FDF6F7 |
| Muted Gold | #C8A659 |
| Truffle | #5C5470 |

**Fonts**: Playfair Display (headings), Lato (body)

---

*Built with love for preserving memories together*
