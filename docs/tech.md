Tech Stack 👩‍💻
This project uses a modern, containerized tech stack, perfect for running on a local Docker host. It's designed for straightforward development, deployment, and maintenance.

## Frontend
Framework: Next.js (App Router). It's great for building a fast, modern, and interactive user interface.

Styling: Tailwind CSS for creating the cute, custom design without a lot of custom CSS.

Component Library: Shadcn UI for a set of beautifully designed, accessible, and reusable components like modals, buttons, and input fields.

## Backend
Runtime: Node.js with Next.js API Routes. The backend logic will be handled directly within the Next.js application for a simplified, monolithic structure.

Functionality:

API routes to handle database queries (getting and saving media).

An API route to generate a secure, pre-signed URL for uploading files directly to S3.

An API route to handle password verification and session creation.

## Database & Storage
Database: PostgreSQL. A powerful and reliable open-source SQL database. It will run in its own dedicated container.

File Storage: Amazon S3. All images and videos will be uploaded directly to a private S3 bucket.

## Environment & Secrets
Configuration: A .env file will be used at the root of the project to store all environment variables. This keeps sensitive information like AWS credentials, database connection strings, and session secrets out of the source code.

## Containerization
Docker: The entire Next.js application will be built into a single Docker image. The PostgreSQL database will use the official public image.

Docker Compose: A docker-compose.yml file will define and orchestrate the application services (app and db). It will be configured to use the .env file.

## Authentication & Sessions
Method: A simple password protection scheme.

Session Management: Upon successful login, a secure, HTTP-only cookie containing a session token (e.g., a JWT) will be set. This cookie will be used to authenticate subsequent requests, providing persistent sessions without needing to re-enter the password.
