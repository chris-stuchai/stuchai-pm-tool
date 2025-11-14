# Setup Guide for Stuchai PM Tool

## GitHub Repository ✅

Your GitHub repository has been created:
**https://github.com/chris-stuchai/stuchai-pm-tool**

## Railway Setup

### Option 1: Create Railway Project via Web Interface (Recommended)

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `chris-stuchai/stuchai-pm-tool`
5. Railway will automatically detect it's a Next.js project

### Option 2: Create Railway Project via CLI

Run this command in your terminal:
```bash
railway init
```

Then follow the prompts to create a new project.

## Environment Variables Setup

Once your Railway project is created, you need to set these environment variables in the Railway dashboard:

### Required Variables:

1. **DATABASE_URL**
   - Railway will automatically create a PostgreSQL database
   - Go to your project → Add PostgreSQL service
   - Copy the `DATABASE_URL` from the PostgreSQL service variables
   - Add it to your main service environment variables

2. **NEXTAUTH_URL**
   - Set this to your Railway app URL (e.g., `https://your-app.railway.app`)
   - Railway will provide this after first deployment

3. **NEXTAUTH_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Or use: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

4. **GOOGLE_CLIENT_ID**
   - From Google Cloud Console
   - Make sure to add Railway URL to authorized redirect URIs:
     - `https://your-app.railway.app/api/auth/callback/google`

5. **GOOGLE_CLIENT_SECRET**
   - From Google Cloud Console

6. **CRON_SECRET** (Optional)
   - For scheduled reminders
   - Generate a random string

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Enable these APIs:
   - Google+ API
   - Gmail API
   - Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-app.railway.app/api/auth/callback/google` (for production)
7. Copy the Client ID and Client Secret

## Database Migration

After setting up the database URL, Railway will automatically run:
- `npx prisma generate` (during build)
- You may need to run `npx prisma db push` manually or set up a build script

Add this to your `package.json` scripts if needed:
```json
"postinstall": "prisma generate"
```

## First User

The first user to sign in with Google will automatically be assigned the **ADMIN** role.
Subsequent users will be assigned the **CLIENT** role by default.

## Scheduled Reminders (Optional)

To enable automatic reminders for overdue items:

1. Set up a cron job to call: `https://your-app.railway.app/api/cron/reminders`
2. Use Railway's cron service or an external service like cron-job.org
3. Set the `CRON_SECRET` environment variable
4. Configure the cron to run every hour (or as needed)

## Deployment Checklist

- [ ] Railway project created
- [ ] PostgreSQL service added
- [ ] Environment variables set
- [ ] Google OAuth configured
- [ ] Railway URL added to Google OAuth redirect URIs
- [ ] First deployment successful
- [ ] Database migrations run
- [ ] Test Google sign-in
- [ ] Test creating a client
- [ ] Test creating a project
- [ ] Test action items

## Local Development

To run locally:

```bash
# Install dependencies
npm install

# Set up .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your values

# Set up database
npx prisma db push
npx prisma generate

# Run development server
npm run dev
```

Visit http://localhost:3000

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL service is running in Railway
- Ensure database is accessible

### Google OAuth Issues
- Verify redirect URI matches exactly
- Check Client ID and Secret are correct
- Ensure APIs are enabled in Google Cloud Console

### Build Failures
- Check Railway build logs
- Verify all environment variables are set
- Ensure Prisma schema is valid

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Check Railway service logs
3. Verify all environment variables
4. Review Google Cloud Console for OAuth issues

