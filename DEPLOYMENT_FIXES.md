# Railway Deployment Fixes - Complete Summary

## Problem
Railway deployments were failing repeatedly. The app would build successfully but fail to start or would start and then be terminated by Railway.

## Root Causes Identified

### 1. **Missing Health Check Endpoint**
Railway couldn't verify the app was running properly.

### 2. **PORT Configuration Missing**
Next.js wasn't binding to Railway's dynamically assigned PORT.

### 3. **Database Push on Every Start**
Running `prisma db push` on startup was causing delays and potential issues.

### 4. **No Nixpacks Configuration**
Railway's build process needed explicit configuration.

## All Fixes Applied

### Fix 1: Health Check Endpoint
**File:** `app/api/health/route.ts` (NEW)
```typescript
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "stuchai-pm-tool",
    },
    { status: 200 }
  )
}
```

### Fix 2: Railway Configuration
**File:** `railway.json` (UPDATED)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

### Fix 3: Nixpacks Configuration
**File:** `nixpacks.toml` (NEW)
```toml
[phases.setup]
nixPkgs = ["nodejs_18", "npm-9_x", "openssl"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### Fix 4: Package.json Scripts
**File:** `package.json` (UPDATED)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma db push --accept-data-loss && next build",
    "start": "next start -p ${PORT:-3000}",
    "lint": "next lint",
    "postinstall": "prisma generate"
  }
}
```

**Key Changes:**
- Moved `prisma db push` from `start` to `build` script
- Added PORT configuration: `-p ${PORT:-3000}`
- Database migrations now run during build, not startup

## What Each Fix Does

1. **Health Check** (`/api/health`):
   - Railway pings this endpoint to verify the app is running
   - Returns 200 OK with status information
   - Prevents Railway from killing the container

2. **PORT Configuration**:
   - Railway assigns a random PORT (e.g., 8080, 3001)
   - Next.js now reads `$PORT` environment variable
   - Falls back to 3000 for local development

3. **Database Push in Build**:
   - Migrations run once during build, not on every start
   - Faster startup time
   - More reliable deployments

4. **Nixpacks Config**:
   - Explicit build instructions for Railway
   - Ensures correct Node.js version (18)
   - Proper dependency installation

## Expected Behavior After Fixes

1. ✅ Build completes successfully
2. ✅ Database migrations run during build
3. ✅ Container starts with correct PORT
4. ✅ Health check endpoint responds
5. ✅ Railway keeps container running
6. ✅ App accessible at `https://appportal.stuchai.com`

## Deployment Timeline

- **Build Time:** ~90 seconds
- **Startup Time:** ~5-10 seconds
- **Health Check:** Within 100 seconds
- **Total:** ~2 minutes from push to live

## Testing the Deployment

1. **Check Deployment Status:**
   ```bash
   railway status
   ```

2. **View Logs:**
   ```bash
   railway logs
   ```

3. **Test Health Endpoint:**
   ```bash
   curl https://appportal.stuchai.com/api/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-11-14T...",
     "service": "stuchai-pm-tool"
   }
   ```

4. **Test Main App:**
   - Visit: `https://appportal.stuchai.com`
   - Should redirect to `/auth/signin`
   - Sign in with Google or email/password

## Known Non-Issues

### Gmail API Errors in Logs
**These are EXPECTED and do NOT cause deployment failures:**

```
Error: Insufficient Permission
Error: No refresh token is set
```

**Why:** Users need to reconnect their Google account in Settings to grant Gmail/Calendar permissions. This doesn't affect the app's ability to run.

**Solution:** After logging in, go to Settings → Reconnect Google Account

## Commits Applied

1. `11e5b64` - Add health check endpoint and configure Railway health check
2. `ccc70a8` - Fix Railway deployment: add PORT configuration and nixpacks.toml
3. `8738360` - Move database push to build step to fix deployment

## Verification Checklist

- [x] Health check endpoint created
- [x] Railway configuration updated
- [x] Nixpacks configuration added
- [x] PORT variable configured
- [x] Database migrations moved to build
- [x] All changes committed and pushed
- [ ] Deployment successful (check Railway dashboard)
- [ ] App accessible at production URL
- [ ] Health check responding
- [ ] Login working

## Next Steps

1. Monitor the current deployment in Railway dashboard
2. Once deployment shows "ACTIVE", test the application
3. If still failing, check Railway logs for specific errors
4. Verify all environment variables are set correctly

## Environment Variables Required

Make sure these are set in Railway:

- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `NEXTAUTH_URL` - `https://appportal.stuchai.com`
- `NEXTAUTH_SECRET` - Random secret (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

## Support

If deployment still fails after these fixes:
1. Check Railway dashboard for specific error messages
2. Review deployment logs for startup errors
3. Verify all environment variables are set
4. Ensure PostgreSQL service is running
5. Check domain DNS configuration (if using custom domain)

