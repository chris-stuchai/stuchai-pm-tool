# SSL Certificate & Domain Troubleshooting

## Issue: Chrome "Dangerous Site" Warning

This warning appears when Chrome detects security issues with your domain. Here's how to fix it:

---

## Step 1: Verify Domain in Railway

1. Go to Railway Dashboard → Your Project → Your Service
2. Click on **"Settings"** tab
3. Scroll to **"Domains"** section
4. Check if `appportal.stuchai.com` is listed
5. Verify the status shows:
   - ✅ "Active" or "Provisioned"
   - ✅ SSL certificate status

---

## Step 2: Check DNS Record

Verify your DNS CNAME record is correct:

1. **Check DNS propagation:**
   ```bash
   nslookup appportal.stuchai.com
   ```
   
   Should return: `c8j4ye6v.up.railway.app`

2. **Verify CNAME record:**
   - Go to your domain registrar
   - Check DNS settings
   - Ensure CNAME record exists:
     - Name: `appportal`
     - Value: `c8j4ye6v.up.railway.app`
     - TTL: Auto or 3600

---

## Step 3: Force SSL Certificate Provision

1. In Railway, go to your service → **Settings** → **Domains**
2. If domain shows "Pending" or "Failed":
   - Remove the domain
   - Wait 30 seconds
   - Add it again: `appportal.stuchai.com`
3. Railway will automatically provision SSL certificate (can take 5-10 minutes)

---

## Step 4: Check Railway Domain Status

1. In Railway dashboard, check the domain status
2. Look for any error messages
3. Common issues:
   - DNS not detected (wait longer, check DNS)
   - SSL certificate provisioning failed
   - Domain verification failed

---

## Step 5: Verify SSL Certificate

1. Visit: `https://www.ssllabs.com/ssltest/analyze.html?d=appportal.stuchai.com`
2. Check the SSL rating
3. Wait for Railway to provision the certificate (can take up to 10 minutes)

---

## Step 6: Clear Browser Cache

After SSL is provisioned:

1. Clear Chrome cache:
   - Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
   - Select "Cached images and files"
   - Clear data

2. Or use Incognito mode to test

---

## Step 7: Check Environment Variables

Make sure `NEXTAUTH_URL` is set correctly:

1. In Railway → Variables
2. Verify `NEXTAUTH_URL` = `https://appportal.stuchai.com`
3. (Not `http://` - must be `https://`)

---

## Common Causes & Solutions

### Cause 1: SSL Certificate Not Provisioned Yet
**Solution:** Wait 5-10 minutes after adding domain in Railway. SSL certificates are automatically provisioned.

### Cause 2: DNS Not Fully Propagated
**Solution:** 
- Wait 1-2 hours for DNS propagation
- Verify DNS with: `nslookup appportal.stuchai.com`
- Check your domain registrar's DNS settings

### Cause 3: Mixed Content (HTTP/HTTPS)
**Solution:** Ensure all URLs use `https://`, not `http://`

### Cause 4: Domain Verification Failed
**Solution:** 
- Remove domain from Railway
- Re-add it
- Wait for verification

---

## Quick Fix Steps

1. ✅ Verify DNS CNAME record is correct
2. ✅ Check Railway domain status (should show "Active")
3. ✅ Wait 10 minutes for SSL certificate provisioning
4. ✅ Verify `NEXTAUTH_URL` uses `https://`
5. ✅ Clear browser cache
6. ✅ Try in Incognito mode

---

## If Still Not Working

1. **Check Railway Logs:**
   - Go to Railway → Deployments → Latest
   - Check for SSL/domain errors

2. **Try Railway's Default Domain:**
   - Temporarily use Railway's auto-generated domain
   - Test if SSL works there
   - This helps isolate if it's a custom domain issue

3. **Contact Railway Support:**
   - If SSL certificate fails to provision after 30 minutes
   - Include your domain and project details

---

## Testing

Once fixed, test:
1. Visit: `https://appportal.stuchai.com`
2. Should see green lock icon in browser
3. No security warnings
4. Can sign in with Google

