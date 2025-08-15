Project Structure 📂
Multi-tenant romantic digital scrapbook application built with Next.js 14, featuring Firebase authentication, PostgreSQL database, and S3 storage, orchestrated with Docker Compose.

## Directory Layout
our-little-corner/
├── .env.example              # Example environment variables for setup
├── docker-compose.yml        # Defines the app and db services for Docker
├── Dockerfile                # Instructions to build the Next.js app image
├── CLAUDE.md                 # Comprehensive development guide for AI assistants
│
├── app/
│   ├── (gallery)/              # Route group for the main gallery
│   │   ├── components/
│   │   │   ├── EnhancedMediaGallery.tsx  # Main gallery with memory group support
│   │   │   ├── MediaCard.tsx             # Individual media card component
│   │   │   ├── MediaDetailModal.tsx      # Full-screen media viewer with video controls
│   │   │   ├── MemoryGroupCard.tsx       # Memory group display component
│   │   │   ├── MemoryGroupDetailModal.tsx # Memory group viewer
│   │   │   ├── CountdownTimer.tsx        # Timer for locked memories
│   │   │   ├── FilterControls.tsx        # Media filtering UI
│   │   │   ├── SortControls.tsx          # Sorting options
│   │   │   └── ViewControls.tsx          # View mode switcher
│   │   └── page.tsx            # Main gallery page with multi-tenant support
│   │
│   ├── admin/                  # Admin panel with comprehensive management
│   │   ├── components/
│   │   │   ├── EnhancedAdminDashboard.tsx  # Main admin interface
│   │   │   ├── EnhancedUploadForm.tsx      # Multi-file upload with S3
│   │   │   ├── MemoryGroupManagement.tsx   # CRUD for memory groups
│   │   │   ├── MediaManagement.tsx         # Media organization tools
│   │   │   ├── MediaEditor.tsx            # Individual media editing
│   │   │   ├── LockingControls.tsx        # Advanced memory locking features
│   │   │   ├── TaskManagement.tsx         # Task-based unlocking
│   │   │   ├── UserManagement.tsx         # Corner user management
│   │   │   └── RichTextEditor.tsx         # TipTap rich text editor
│   │   └── page.tsx            # Admin dashboard with role-based access
│   │
│   ├── api/                    # RESTful API routes with authentication
│   │   ├── auth/route.ts       # Session management & Firebase integration
│   │   ├── corners/            # Corner (tenant) management
│   │   │   ├── route.ts        # CRUD operations for corners
│   │   │   └── [id]/           # Individual corner operations
│   │   │       ├── route.ts           # Get/update/delete corner
│   │   │       ├── invites/route.ts   # Corner invite management
│   │   │       └── users/             # Corner user management
│   │   │           ├── route.ts              # User operations
│   │   │           └── [userId]/route.ts     # Individual user management
│   │   ├── corner-invites/     # Global invite management
│   │   │   ├── route.ts        # Create/list invites
│   │   │   └── [id]/           # Individual invite operations
│   │   │       ├── route.ts           # Get/update invite
│   │   │       └── accept/route.ts    # Accept invite
│   │   ├── user/               # Current user operations
│   │   │   └── pending-invites/route.ts # User's pending invites
│   │   ├── media/route.ts      # Media CRUD with multi-tenant isolation
│   │   ├── memory-groups/      # Memory group management
│   │   │   ├── route.ts        # CRUD operations for groups
│   │   │   └── [id]/           # Individual group operations
│   │   │       ├── route.ts           # Get/update specific group
│   │   │       └── unlock/route.ts    # Unlock functionality
│   │   ├── upload/route.ts     # S3 presigned URL generation
│   │   ├── run-migrations/route.ts    # Database migration endpoint
│   │   ├── init/route.ts       # Application initialization
│   │   └── health/route.ts     # Health check endpoint
│   │
│   ├── components/
│   │   ├── CornerSelector.tsx  # Multi-tenant corner selection
│   │   ├── ProfileDropdown.tsx # User profile and corner management
│   │   └── ui/                 # Shadcn UI components (button, card, dialog, etc.)
│   │
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # Firebase authentication state
│   │   └── CornerContext.tsx   # Current corner and user role management
│   │
│   ├── lib/
│   │   ├── db.ts               # PostgreSQL connection & multi-tenant queries
│   │   ├── s3.ts               # AWS S3 client and file operations
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── types.ts            # TypeScript interfaces for multi-tenant system
│   │   ├── utils.ts            # General utility functions
│   │   ├── htmlUtils.ts        # HTML parsing and sanitization
│   │   ├── rateLimit.ts        # API rate limiting implementation
│   │   ├── migrations.ts       # Database migration system
│   │   ├── init.ts             # Application initialization logic
│   │   ├── startup.ts          # Startup configuration
│   │   └── firebase/           # Firebase configuration
│   │       ├── config.ts              # Client-side Firebase config
│   │       ├── admin.ts              # Firebase Admin SDK setup
│   │       ├── auth.ts               # Firebase Auth utilities
│   │       └── serverAuth.ts         # Server-side auth validation
│   │
│   ├── corner-selector/        # Corner selection interface
│   │   └── page.tsx            # Corner selection page
│   │
│   ├── invite/                 # Invite acceptance flow
│   │   └── [code]/             # Dynamic invite code handling
│   │       └── page.tsx        # Invite acceptance page
│   │
│   ├── settings/               # User settings management
│   │   └── page.tsx            # Settings interface
│   │
│   ├── login/                  # Authentication pages
│   │   └── page.tsx            # Login page with Firebase & fallback auth
│   │
│   ├── layout.tsx              # Root layout with auth providers
│   ├── page.tsx                # Home page with corner-aware gallery
│   └── globals.css             # Tailwind CSS styles with romantic theme
│
├── database/                   # Database schema and migrations
│   ├── multi-tenant-schema.sql # Complete multi-tenant database schema
│   └── fix-orphaned-media.sql  # Data repair migration scripts
│
├── docs/                       # Project documentation
│   ├── structure.md            # This file - project structure
│   ├── design.md              # UI/UX design specifications
│   ├── project.md             # Project overview and features
│   ├── tech.md                # Technical architecture details
│   └── firebase-google-auth-setup.md # Firebase configuration guide
│
├── qa/                         # Quality assurance and testing
│   └── automated-tests/        # Comprehensive test suite
│       ├── unit/              # Unit tests for utilities and components
│       ├── integration/       # API and database integration tests
│       ├── e2e/              # End-to-end user workflow tests
│       ├── setup/            # Test configuration and mocks
│       ├── package.json      # Test dependencies and scripts
│       └── README.md         # Testing documentation
│
├── middleware.ts               # Route protection & security headers
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration with custom theme
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts

