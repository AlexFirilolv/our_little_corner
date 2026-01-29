# Project Structure 📂

**Twofold** is built with Next.js, using a multi-tenant architecture where each "Tenant" is called a 'Locket' for a couple.

## Directory Layout

```text
our-little-corner/
├── app/
│   ├── (main)/                 # Authenticated application routes
│   │   ├── timeline/           # The main feed (Home)
│   │   │   ├── components/
│   │   │   │   ├── TimelineFeed.tsx      # Infinite scroll feed with Helix design
│   │   │   │   ├── JournalCard.tsx       # Standard photo/video entry card
│   │   │   │   ├── LoveNoteCard.tsx      # Text-only textured card
│   │   │   └── page.tsx
│   │   │
│   │   ├── journey/            # Map and Milestone views
│   │   │   ├── components/
│   │   │   │   ├── JourneyMap.tsx        # Interactive map with travel paths
│   │   │   │   └── MilestoneList.tsx     # Gold-accented timeline of major events
│   │   │   └── page.tsx
│   │   │
│   │   ├── profile/            # "Us" tab - Settings and Shared Lists
│   │   │   ├── components/
│   │   │   │   ├── BucketList.tsx        # Shared checklist component
│   │   │   │   └── CountdownWidget.tsx   # "Days until" configuration
│   │   │   └── page.tsx
│   │   │
│   │   ├── upload/             # Creation flow
│   │   │   └── components/     # Upload forms for Media, Notes, and Milestones
│   │   │
│   │   └── layout.tsx          # Main app layout with Bottom Navigation
│   │
│   ├── api/                    # Backend Routes
│   │   ├── auth/               # Session handling
│   │   ├── memory/             # CRUD for timeline entries
│   │   ├── milestones/         # CRUD for major events
│   │   ├── map/                # GeoJSON data for the journey map
│   │   └── user/               # Profile management
│   │
│   ├── components/             # Shared UI Components
│   │   ├── ui/                 # Shadcn UI (modified for Deep Rose theme)
│   │   ├── HelixLine.tsx       # SVG component for the background timeline line
│   │   └── Navigation.tsx      # Bottom nav bar (Mobile) / Side nav (Desktop)
│   │
│   ├── lib/
│   │   ├── db.ts               # Database connection
│   │   ├── gcs.ts               # Object storage
│   │   └── theme.ts            # Centralized color/font tokens
│   │
│   └── globals.css             # Tailwind config including Playfair/Lato fonts