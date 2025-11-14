# Complete Setup Guide for Stuchai PM Tool

## Overview
This guide walks you through setting up your custom domain (appportal.stuchai.com) and all environment variables.

---

## Part 1: Custom Domain Setup

### Add DNS CNAME Record

1. **Go to your domain registrar** (where you manage stuchai.com)
   - Examples: GoDaddy, Namecheap, Cloudflare, Google Domains

2. **Navigate to DNS Management**
   - Usually under "DNS Settings" or "Advanced DNS"

3. **Add this CNAME record:**
   ```
   Type: CNAME
   Name: appportal
   Value: c8j4ye6v.up.railway.app
   TTL: Auto (or 3600)
   ```

4. **Save the record**

5. **Wait 1-2 hours** for DNS propagation (Railway will detect it automatically)

---

## Part 2: Environment Variables Setup

### Access Railway Variables

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on **stuchai-pm-tool** project
3. Click on your **main service** (not PostgreSQL)
4. Click **"Variables"** tab
5. Click **"+ New Variable"** for each variable below

---

### Variable 1: DATABASE_URL

**How to get it:**
1. In your Railway project, click the **PostgreSQL** service
2. Go to **"Variables"** tab
3. Find `DATABASE_URL` or `POSTGRES_URL`
4. **Copy the entire connection string**

**Add to main service:**
- **Key:** `DATABASE_URL`
- **Value:** (paste the connection string)
- Click **"Add"**

---

### Variable 2: NEXTAUTH_URL

**Value:**
- Use your custom domain: `https://appportal.stuchai.com`
- (Or use Railway's default domain if custom domain isn't ready yet)

**Add variable:**
- **Key:** `NEXTAUTH_URL`
- **Value:** `https://appportal.stuchai.com`
- Click **"Add"**

**Note:** If your custom domain isn't active yet, use Railway's default domain temporarily, then update it later.

---

### Variable 3: NEXTAUTH_SECRET

**Generate the secret:**

Open your terminal and run:
```bash
openssl rand -base64 32
```

**Add variable:**
- **Key:** `NEXTAUTH_SECRET`
- **Value:** (paste the generated string - it will be long)
- Click **"Add"**

---

### Variable 4: GOOGLE_CLIENT_ID

**How to get it:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new one)
3. Go to **"APIs & Services"** → **"Credentials"**
4. If you don't have OAuth credentials:
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **Web application**
   - Name: Stuchai PM Tool
   - Authorized redirect URIs: 
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
     - `https://appportal.stuchai.com/api/auth/callback/google` (for production)
   - Click **"Create"**
5. **Copy the Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)

**Add variable:**
- **Key:** `GOOGLE_CLIENT_ID`
- **Value:** (paste the Client ID)
- Click **"Add"**

---

### Variable 5: GOOGLE_CLIENT_SECRET

**How to get it:**

1. In the same Google Cloud Console page (OAuth 2.0 Client ID)
2. **Copy the Client Secret**

**Add variable:**
- **Key:** `GOOGLE_CLIENT_SECRET`
- **Value:** (paste the Client Secret)
- Click **"Add"**

**Important:** Make sure you enable these APIs in Google Cloud Console:
- Google+ API
- Gmail API
- Google Drive API

Go to: **APIs & Services** → **Library** → Search and enable each one

---

### Variable 6: CRON_SECRET (Optional but Recommended)

**Generate the secret:**

```bash
openssl rand -base64 32
```

**Add variable:**
- **Key:** `CRON_SECRET`
- **Value:** (paste the generated string)
- Click **"Add"**

---

## Part 3: Verify Everything

### Check Your Variables

In Railway Variables tab, you should see:
- ✅ `DATABASE_URL`
- ✅ `NEXTAUTH_URL`
- ✅ `NEXTAUTH_SECRET`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `CRON_SECRET`

### Check Deployment

1. Go to Railway → Deployments
2. Make sure the latest deployment is **"Active"** and **"Succeeded"**
3. If it failed, check the logs

### Test Your App

1. Visit: `https://appportal.stuchai.com` (or your Railway domain)
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. You should be redirected to the dashboard

---

## Part 4: First User Setup

The **first user** to sign in will automatically be assigned the **ADMIN** role.

To assign roles to other users:
1. Sign in as ADMIN
2. You can manually update user roles in the database (or we can add a UI for this later)

---

## Quick Reference

### Generate Secrets Commands:
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -base64 32
```

### Google OAuth Redirect URIs:
```
http://localhost:3000/api/auth/callback/google
https://appportal.stuchai.com/api/auth/callback/google
```

### Required Google APIs:
- Google+ API
- Gmail API
- Google Drive API

---

## Troubleshooting

### Build Failed
- Check Railway deployment logs
- Verify all 6 variables are set
- Make sure variable names are exact (case-sensitive)

### Google OAuth Not Working
- Verify redirect URI matches exactly
- Check APIs are enabled
- Verify Client ID and Secret are correct

### Database Connection Issues
- Verify DATABASE_URL is from PostgreSQL service
- Check PostgreSQL service is running
- Ensure database is accessible

### Custom Domain Not Working
- Wait 1-2 hours for DNS propagation
- Verify CNAME record is correct
- Check Railway shows "Record detected"

---

## Next Steps After Setup

1. ✅ Custom domain configured
2. ✅ All environment variables set
3. ✅ Google OAuth working
4. ✅ First admin user created
5. ✅ Start creating clients and projects!

---

## Need Help?

If you encounter issues:
1. Check Railway deployment logs
2. Check Railway service logs
3. Verify all variables are set correctly
4. Test Google OAuth in Google Cloud Console

