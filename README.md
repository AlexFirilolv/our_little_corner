# Our Little Corner 💖

A beautiful, romantic digital scrapbook web application for celebrating relationships and cherishing special memories together. Built as a surprise gift for International Girlfriends Day!

## ✨ Features

### 🎀 Main Gallery (For Her)
- **Beautiful Masonry Grid Layout** - Elegantly displays photos and videos in a Pinterest-style layout
- **Romantic Design** - Soft pastel pink theme with beautiful Typography (Dancing Script + Quicksand fonts)
- **Full-Screen Modal Viewer** - Click any memory to view in detail with rich notes
- **Search & Filter** - Find memories by title, note content, or date
- **Responsive Design** - Looks perfect on desktop, tablet, and mobile

### 🔐 Security & Access
- **Simple Password Protection** - One shared password for access
- **Persistent Sessions** - Remember login for 7 days, no need to re-enter password
- **Secure Authentication** - JWT sessions with HTTP-only cookies
- **Protected Routes** - Middleware ensures only authenticated users can access content

### 🎨 Admin Panel (For You)
- **Hidden Admin Dashboard** - Accessible only via direct URL `/admin`
- **Easy File Upload** - Drag & drop photos/videos with S3 integration
- **Rich Text Editor** - Beautiful notes with formatting (bold, italic, lists, quotes)
- **Media Management** - Edit titles, notes, and dates for existing memories
- **Analytics Dashboard** - View statistics about your collection

### ☁️ Modern Infrastructure
- **GCP Cloud Storage** - Secure, scalable cloud storage for all media files
- **PostgreSQL Database** - Reliable storage for metadata and notes (designed for K8s StatefulSets)
- **Docker Deployment** - Complete containerized setup for easy hosting
- **Next.js 15** - Latest React framework with App Router

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- GCP project and service account credentials
- Domain name (optional, can run on localhost)

### 1. Clone & Setup
```bash
git clone <your-repo>
cd our-little-corner
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` with your settings:

```env
# Database
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/our_little_corner
POSTGRES_DB=our_little_corner
POSTGRES_PASSWORD=your_secure_password

# Application Security
APP_PASSWORD=your_romantic_password_here
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
NEXTAUTH_SECRET=your_nextauth_secret_minimum_32_characters

# GCP Cloud Storage Configuration
GCP_PROJECT_ID=your_gcp_project_id
GCP_CLIENT_EMAIL=your_gcp_service_account_email
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCS_BUCKET_NAME=your-romantic-bucket-name

# Application URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run with Docker
```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 4. Access Your Gallery
- **Main Gallery**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin

## 🎯 How to Use

### For Her (Main Gallery)
1. Visit the main URL
2. Enter the password (one-time, remembered for 7 days)
3. Browse beautiful memories in the masonry grid
4. Click any photo/video to view full-screen with notes
5. Use search to find specific memories
6. Filter by photos or videos

### For You (Admin)
1. Go to `/admin` in your browser
2. **Upload Tab**: 
   - Drag & drop photos/videos
   - Add romantic titles and rich text notes
   - Set the date when the photo/video was taken
   - Upload multiple files at once
3. **Manage Tab**:
   - Edit existing memories
   - Update titles, notes, and dates
   - Delete unwanted items
4. **Analytics Tab**:
   - View collection statistics
   - Monitor storage usage
   - See recent uploads

## 🏗️ Architecture

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Beautiful, accessible components
- **TipTap** - Rich text editor for notes

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **PostgreSQL** - Primary database for metadata (with exponential backoff retries for K8s stability)
- **GCP Cloud Storage** - Cloud storage for media files
- **JWT Authentication** - Secure session management

### Deployment
- **Docker Compose** - Multi-container orchestration
- **Kubernetes Ready** - Designed to work with K8s StatefulSets and services
- **Nginx** (optional) - Reverse proxy and SSL termination

## 🔧 Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start PostgreSQL with Docker
docker-compose up -d db

# Run development server
npm run dev

# Build for production
npm run build
```

### Project Structure
```
our-little-corner/
├── app/
│   ├── (gallery)/           # Main gallery route group
│   │   └── components/      # MediaGrid, MediaCard, Modal
│   ├── admin/              # Admin dashboard
│   │   └── components/     # UploadForm, MediaManagement
│   ├── api/                # API endpoints
│   │   ├── auth/           # Authentication
│   │   ├── media/          # Media CRUD
│   │   └── upload/         # GCP presigned URLs
│   ├── lib/                # Utilities
│   │   ├── db.ts           # Database functions (retry-enabled)
│   │   ├── gcs.ts           # GCP Cloud Storage operations
│   │   └── auth.ts         # Authentication logic
│   └── components/ui/      # Reusable UI components
├── docker-compose.yml      # Container orchestration
├── Dockerfile              # App container definition
└── init.sql               # Database initialization
```

## 🔒 Security Features

- **Content Security Policy** - Prevents XSS attacks
- **HTTP-only Cookies** - Secure session storage
- **Password Hashing** - Bcrypt for production passwords
- **Rate Limiting** - Built-in Next.js protection
- **HTTPS Enforcement** - Secure connections in production
- **Input Sanitization** - SQL injection prevention

## 📱 Mobile Experience

The app is fully responsive and optimized for mobile:
- Touch-friendly interface
- Optimized image loading
- Swipe gestures for modal navigation
- Mobile keyboard support
- Responsive typography and spacing

## 🎨 Customization

### Color Palette
```css
--primary: #FFC0CB (Pastel Pink)
--secondary: #F5E6E8 (Creamy White)
--accent: #D9AAB7 (Dusty Rose)
--foreground: #5C5470 (Dark Muted Purple)
```

### Typography
- **Headings**: Dancing Script (romantic script font)
- **Body**: Quicksand (clean, readable sans-serif)

### Themes
The romantic theme can be customized in `tailwind.config.js` and `globals.css`.

## 🚀 Production Deployment

### Docker Compose (Recommended)
```bash
# Production environment
NODE_ENV=production docker-compose up -d

# With custom domain
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes (StatefulSet)
The application is designed to handle the dynamic nature of K8s. The database client includes retry logic with exponential backoff to gracefully wait for the database service to become ready.

### Environment Variables for Production
```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### SSL Certificate (Let's Encrypt)
```bash
# Add Nginx reverse proxy with SSL
# See docker-compose.prod.yml for configuration
```

## 📊 Monitoring

### Database Health
```bash
# Check database connection
docker-compose exec db pg_isready -U postgres

# View database logs
docker-compose logs db
```

### Application Logs
```bash
# View application logs
docker-compose logs app

# Follow logs in real-time
docker-compose logs -f app
```

### Storage Usage
Monitor GCP billing and bucket usage through Google Cloud Console.

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
- Ensure `DATABASE_URL` is correct.
- If using K8s, ensure the service name matches the URL.
- The app will automatically retry connection up to 10 times.

**GCP Upload Errors**
- Verify GCP credentials in `.env` (ensure private key has `\n` characters properly escaped).
- Check GCS bucket permissions (Service Account needs Storage Object Admin).
- Ensure bucket exists in the specified project.

**Memory Issues**
```bash
# Increase Docker memory limit
# Update Docker Desktop settings
```

**Port Already in Use**
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

## 💝 Special Features

### Romantic Touches
- Heart animations and romantic icons throughout
- Soft color palette and beautiful typography
- Loving language in UI copy and messages
- Gentle hover effects and transitions

### Surprise Elements
- Hidden admin panel (not linked from main UI)
- Beautiful loading animations
- Romantic placeholder messages
- Special typography for headings

## 📝 License

This is a personal project created with love. Feel free to adapt it for your own romantic projects! 💕

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the beauty of love and memories
- Created as a surprise gift for someone special

---

*Made with 💖 for preserving beautiful memories together*