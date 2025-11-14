# Google OAuth Permission Fix

## Problem

The Google OAuth "access_denied" error occurs when:
1. The user clicks "Cancel" on the Google consent screen
2. The redirect URI in Google Cloud Console doesn't match
3. The requested scopes haven't been enabled in Google Cloud Console

## Solution

### Step 1: Verify Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID

### Step 2: Check Authorized Redirect URIs

Ensure the following URIs are listed under **Authorized redirect URIs**:

```
https://appportal.stuchai.com/api/auth/callback/google
http://localhost:3000/api/auth/callback/google  (for local development)
```

**CRITICAL**: The production URL must be **EXACTLY**:
- `https://appportal.stuchai.com/api/auth/callback/google`
- Do NOT use `www.`
- Do NOT use a trailing slash

### Step 3: Enable Required APIs

Make sure these APIs are enabled in **APIs & Services** → **Library**:

1. **Gmail API** - For sending email reminders
2. **Google Calendar API** - For syncing meetings
3. **Google Drive API** - For accessing documents

### Step 4: Verify OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Ensure the following scopes are added:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

### Step 5: Reconnect Your Google Account

1. Go to **Settings** in your app
2. Click **"Reconnect Google Account"**
3. When the Google consent screen appears:
   - **Check ALL permission boxes**
   - Click **"Allow"** or **"Continue"**
4. You will be redirected back to Settings
5. Verify all three services show "Enabled":
   - ✅ Gmail
   - ✅ Google Calendar
   - ✅ Google Drive

## Common Issues

### Issue 1: "access_denied" Error
**Cause**: You clicked "Cancel" or didn't grant all permissions  
**Fix**: Try reconnecting again and make sure to click "Allow" on ALL permissions

### Issue 2: Redirect URI Mismatch
**Cause**: The redirect URI in Google Console doesn't match your app's URL  
**Fix**: Double-check the redirect URI is exactly `https://appportal.stuchai.com/api/auth/callback/google`

### Issue 3: API Not Enabled
**Cause**: Gmail/Calendar/Drive APIs are not enabled in Google Cloud Console  
**Fix**: Enable all three APIs in the Google Cloud Console Library

### Issue 4: Scopes Not Requested
**Cause**: The OAuth consent screen doesn't have all required scopes  
**Fix**: Add all scopes listed in Step 4 above

## Verification

After reconnecting, you should see:
- **Green "Enabled" badges** for Gmail, Calendar, and Drive
- **No warning banner** about missing permissions
- Ability to send email reminders from action items
- Ability to create meetings that sync to Google Calendar

## Need Help?

If you're still experiencing issues:
1. Check the Railway logs for detailed error messages
2. Verify your environment variables are set correctly:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
3. Ensure you're using the correct Google account (the one that owns the Google Cloud project)

