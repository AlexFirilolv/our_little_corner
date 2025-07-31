Design & UI/UX 🎨
The design is split into two distinct experiences: a cute, romantic gallery for viewing, and a clean, functional panel for admin tasks.

## Main Gallery (For Her)
### Vibe & Feel
Theme: Romantic, soft, and whimsical.

User Experience: Extremely simple. After a one-time password entry, she is taken directly to the gallery on future visits.

### Color Palette
Primary: #FFC0CB (Pastel Pink)

Secondary: #F5E6E8 (Creamy White)

Accent: #D9AAB7 (Dusty Rose)

Text: #5C5470 (Dark Muted Purple)

### Typography
Headings: A beautiful, romantic script font like "Dancing Script" or "Pacifico".

Body/Notes: A clean, readable sans-serif font like "Lato" or "Quicksand".

### Key Components & Layout
Login Page: A simple, centered page with a single password input field.

Gallery: A masonry grid layout to elegantly handle both vertical and horizontal photos and videos.

Media Card: Shows the image or video. On hover, a semi-transparent overlay appears with a heart icon.

Detail View: Clicking a card opens a full-screen modal (using Shadcn's Dialog component) displaying the full-size media and the beautifully formatted note.

## Admin Panel (For You)
### Vibe & Feel
Theme: Clean, functional, and straightforward.

User Experience: A simple, no-frills dashboard for efficient content management. It is not linked from the main UI and is only accessible by navigating to /admin in the URL.

### Key Components & Layout
Layout: A simple, two-column dashboard. One side for the upload form, the other showing a simple list of already uploaded items.

Components: Utilizes default Shadcn UI components (Card, Button, Input) for a clean and consistent look.

Upload Form: A clear form with:

A file input for selecting photos/videos from your PC.

A Rich Text Editor for writing and formatting the notes and captions. This will allow for bold, italics, and lists to make your notes more expressive.
