# Tech Stack 👩‍💻

**Twofold** leverages a modern, containerized stack designed for intimacy and performance.

## Frontend
* **Framework:** Next.js (App Router).
* **Styling:** Tailwind CSS with a custom config for the **Twofold** theme.
    * **Fonts:** *Playfair Display* (Headings) and *Lato* (Body), imported via `next/font`.
    * **Colors:** Custom utility classes for `bg-blush`, `text-truffle`, `bg-deep-rose`.
* **Components:** Shadcn UI, customized to replace default slate/zinc grays with warm rose and truffle tones.
* **Maps:** Leaflet for the "Our Journey" visualization.

## Backend
* **Runtime:** Node.js (via Next.js API Routes).
* **Database & Storage:**
    * **Database:** PostgreSQL. Stores users, memories (metadata), milestones, and shared lists. Run in a dedicated container.
    * **Object Storage:** **Google Cloud Storage (GCS)**. All photos and videos are uploaded directly to a private GCS bucket using Signed URLs for secure, direct-to-cloud uploads.

## Authentication & Security
* **Identity:** Firebase Authentication.
* **Model:** Invite-only system. One partner creates the "Locket" and generates an invite code for the second partner, or send invitation via email.
* **Authorization:** Strict Row-Level Security (RLS) or middleware logic ensures data is only accessible to the two users in that specific Locket.

## Deployment & Infrastructure
* **Docker:** The entire application is built into a single Docker image.
* **Orchestration:** Docker Compose for local development (App + Postgres).
* **Environment:** All secrets (GCS Credentials, DB strings, Firebase keys) are managed via a `.env` file at the root.