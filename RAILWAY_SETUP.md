# Railway Environment Variables Setup Guide

## Step-by-Step Instructions

### 1. Access Your Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your **stuchai-pm-tool** project
3. Click on your **service** (the main app service, not the database)

### 2. Navigate to Variables

1. In your service, click on the **"Variables"** tab (or look for a "Variables" button in the sidebar)
2. You'll see a list of existing variables (if any) and an **"+ New Variable"** button

### 3. Add Each Variable

Click **"+ New Variable"** for each variable below and enter the key-value pairs:

---

## Required Environment Variables

### 1. DATABASE_URL

**How to get it:**
1. In your Railway project, you should have a **PostgreSQL** service
2. Click on the PostgreSQL service
3. Go to the **"Variables"** tab
4. Find `DATABASE_URL` or `POSTGRES_URL`
5. Copy the entire connection string

**In your main service:**
- **Key:** `DATABASE_URL`
- **Value:** Paste the connection string (should look like: `postgresql://postgres:password@hostname:5432/railway`)

---

### 2. NEXTAUTH_URL

**Value:**
- First, get your Railway app URL:
  1. In your main service, go to **"Settings"**
  2. Look for **"Generate Domain"** or check the **"Domains"** section
  3. Your app URL will be something like: `https://stuchai-pm-tool-production.up.railway.app`
  4. Copy this URL

**In Variables:**
- **Key:** `NEXTAUTH_URL`
- **Value:** `https://your-app-url.railway.app` (use the exact URL from Railway)

**Note:** If you haven't generated a domain yet, you can:
- Go to Settings → Generate Domain
- Or use the default Railway domain provided

---

### 3. NEXTAUTH_SECRET

**Generate the secret:**

Open your terminal and run one of these commands:

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**In Variables:**
- **Key:** `NEXTAUTH_SECRET`
- **Value:** Paste the generated string (it will be a long random string)

---

### 4. GOOGLE_CLIENT_ID

**How to get it:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **"APIs & Services"** → **"Credentials"**
4. Click on your OAuth 2.0 Client ID (or create one if you don't have it)
5. Copy the **Client ID**

**In Variables:**
- **Key:** `GOOGLE_CLIENT_ID`
- **Value:** Paste your Google Client ID (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

---

### 5. GOOGLE_CLIENT_SECRET

**How to get it:**

1. In the same Google Cloud Console page (OAuth 2.0 Client ID details)
2. Copy the **Client Secret**

**In Variables:**
- **Key:** `GOOGLE_CLIENT_SECRET`
- **Value:** Paste your Google Client Secret

---

### 6. CRON_SECRET (Optional but Recommended)

**Generate the secret:**

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**In Variables:**
- **Key:** `CRON_SECRET`
- **Value:** Paste the generated string

**Note:** This is used to secure your cron endpoint for scheduled reminders.

---

## Quick Setup Checklist

- [ ] PostgreSQL service created in Railway
- [ ] `DATABASE_URL` copied from PostgreSQL service
- [ ] Railway app domain generated
- [ ] `NEXTAUTH_URL` set to your Railway app URL
- [ ] `NEXTAUTH_SECRET` generated and added
- [ ] Google OAuth credentials created
- [ ] `GOOGLE_CLIENT_ID` added
- [ ] `GOOGLE_CLIENT_SECRET` added
- [ ] `CRON_SECRET` generated and added (optional)
- [ ] All variables saved

---

## Important: Update Google OAuth Redirect URI

After you have your Railway app URL, you **must** update Google OAuth:

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **"APIs & Services"** → **"Credentials"**
3. Click on your OAuth 2.0 Client ID
4. Under **"Authorized redirect URIs"**, add:
   ```
   https://your-app-url.railway.app/api/auth/callback/google
   ```
   (Replace `your-app-url` with your actual Railway domain)

5. Click **"Save"**

---

## Verify Variables Are Set

1. In Railway, go to your service → Variables tab
2. You should see all 6 variables listed:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `CRON_SECRET` (optional)

---

## After Adding Variables

1. Railway will automatically redeploy when you save variables
2. Check the deployment logs to ensure the build succeeds
3. Once deployed, visit your Railway app URL
4. Try signing in with Google to test

---

## Troubleshooting

### Variable Not Appearing
- Make sure you clicked "Save" after adding each variable
- Refresh the Railway dashboard

### Build Still Failing
- Double-check all variable names are exact (case-sensitive)
- Ensure no extra spaces in values
- Check Railway deployment logs for specific errors

### Google OAuth Not Working
- Verify redirect URI matches exactly (including https://)
- Check that Google APIs are enabled (Google+ API, Gmail API, Drive API)
- Ensure Client ID and Secret are correct

---

## Need Help?

If you encounter issues:
1. Check Railway deployment logs
2. Verify all variables are set correctly
3. Test Google OAuth in Google Cloud Console first

