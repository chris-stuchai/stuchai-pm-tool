# Stuchai PM Tool

A comprehensive client project management tool with Google integration, built with Next.js, TypeScript, and Prisma.

## Features

- **Google OAuth Authentication** - Sign in with your Google account
- **Client Management** - Create and manage client profiles
- **Project Tracking** - Track projects with progress visualization
- **Action Items** - Create and assign tasks (project-specific or global)
- **Notifications** - In-app notifications with real-time updates
- **Email Reminders** - Gmail integration for sending reminders
- **Google Drive Integration** - Link and manage documents from Google Drive
- **Role-Based Access** - Admin, Manager, and Client roles with appropriate permissions
- **Progress Tracking** - Visual progress bars and milestone tracking

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **UI**: TailwindCSS + shadcn/ui components
- **Deployment**: Railway

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google OAuth credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Fill in the required values:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for local)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

4. Set up the database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API and Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy the Client ID and Client Secret to your `.env` file

## Google Drive & Gmail Scopes

Make sure your Google OAuth app requests the following scopes:
- `https://www.googleapis.com/auth/drive.readonly` - For Drive access
- `https://www.googleapis.com/auth/gmail.send` - For sending emails

## Deployment to Railway

1. Push your code to a Git repository
2. Create a new Railway project
3. Add a PostgreSQL service
4. Connect your repository
5. Set environment variables in Railway dashboard
6. Deploy!

The app will automatically:
- Run database migrations
- Build and start the Next.js server

## Scheduled Reminders

Set up a cron job to call `/api/cron/reminders` periodically (e.g., every hour) to check for overdue items and send reminders. You can use Railway's cron jobs or an external service like cron-job.org.

## License

MIT

