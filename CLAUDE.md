# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan & Review

### Before starting work
- Always in plan mode to make a plan
- After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md.
- The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down.
- If the task require external knowledge or certain package, also research to get latest knowledge (Use Task tool for research)
- Don't over plan it, always think MVP.
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### While implementing
- You should update the plan as you work.
- After you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily hand over to other engineers.

## Project Overview

"Our Little Corner" is a personal web application - a romantic digital scrapbook for celebrating relationships. It's a surprise gift project featuring a password-protected gallery for viewing photos/videos with personal notes, and a hidden admin panel for content management.

## Architecture

- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS + Shadcn UI components
- **Backend**: Next.js API routes (monolithic structure)
- **Database**: PostgreSQL (containerized)
- **Storage**: Amazon S3 for media files
- **Authentication**: Simple password + session cookies (JWT)
- **Deployment**: Docker Compose with separate app and database containers

## Key Directory Structure

```
app/
├── (gallery)/           # Main gallery route group (password protected)
│   ├── components/      # MediaGrid.js, MediaCard.js
│   └── page.js         # Main gallery page
├── admin/              # Admin panel (/admin route)
│   ├── components/     # UploadForm.js, RichTextEditor.js
│   └── page.js         # Admin dashboard
├── api/                # API routes
│   ├── auth/route.js   # Password verification & sessions
│   ├── media/route.js  # Media CRUD operations
│   └── upload/route.js # S3 presigned URLs
├── lib/
│   ├── db.js           # Database connection/queries
│   └── s3.js           # S3 client operations
└── middleware.js       # Session validation
```

## Design System

**Main Gallery (Romantic Theme)**:
- Primary: #FFC0CB (Pastel Pink)
- Secondary: #F5E6E8 (Creamy White)  
- Accent: #D9AAB7 (Dusty Rose)
- Text: #5C5470 (Dark Muted Purple)
- Fonts: "Dancing Script"/"Pacifico" for headings, "Lato"/"Quicksand" for body

**Admin Panel**: Clean, functional design using default Shadcn UI components

## Development Setup

This project is designed to run via Docker Compose. The actual implementation will use:
- `.env` file for environment variables (AWS credentials, DB connection, session secrets)
- `docker-compose.yml` to orchestrate app and PostgreSQL services
- `Dockerfile` for the Next.js application

## Key Features to Implement

1. **Gallery View**: Masonry grid layout with media cards, full-screen modal detail view
2. **Admin Upload**: File upload to S3 via presigned URLs, rich text editor for notes
3. **Authentication**: Single password protection with persistent sessions
4. **Media Management**: PostgreSQL storage of metadata, S3 storage of files

## Security Considerations

- Admin panel accessible only via direct URL (/admin)
- Session-based authentication with HTTP-only cookies
- Environment variables for all sensitive configuration
- S3 presigned URLs for secure file uploads
