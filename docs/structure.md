Project Structure 📂
The project will be a single, containerized Next.js application using the App Router, orchestrated with Docker Compose for easy local hosting.

## Directory Layout
our-little-corner/
├── .env.example              # Example environment variables for setup
├── docker-compose.yml        # Defines the app and db services for Docker
├── Dockerfile                # Instructions to build the Next.js app image
│
├── app/
│   ├── (gallery)/              # Route group for the main gallery
│   │   ├── components/
│   │   │   ├── MediaGrid.js    # Displays all media items in a masonry grid
│   │   │   └── MediaCard.js    # A single photo/video card for the gallery
│   │   └── page.js             # The main gallery page, protected by middleware
│   │
│   ├── admin/                  # Route group for the admin panel
│   │   ├── components/
│   │   │   ├── UploadForm.js     # Form for uploading new media
│   │   │   └── RichTextEditor.js # Component for notes/captions
│   │   └── page.js             # The admin panel page (at /admin)
│   │
│   ├── api/                    # API routes
│   │   ├── auth/route.js       # Handles password verification & session cookies
│   │   ├── media/route.js      # API route to get/post media
│   │   └── upload/route.js     # API route to get S3 presigned URLs
│   │
│   ├── components/
│   │   └── ui/                 # Shadcn UI components (button, card, etc.)
│   │
│   ├── lib/
│   │   ├── db.js               # Database connection and query helpers
│   │   └── s3.js               # S3 client and presigned URL generator
│   │
│   ├── login/
│   │   └── page.js             # The login page with the password form
│   │
│   ├── layout.js               # Root layout for the entire application
│   └── globals.css             # Global styles for Tailwind
│
├── middleware.js               # Handles session validation for protected routes
├── public/
│   └── fonts/                  # Custom font files
│
└── .gitignore
└── README.md

