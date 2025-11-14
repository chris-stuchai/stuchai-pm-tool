# Custom Domain Setup: appportal.stuchai.com

## Step 1: Add DNS Record

You need to add a CNAME record to your domain `stuchai.com`:

### DNS Record Details:
- **Type:** CNAME
- **Name:** `appportal`
- **Value:** `c8j4ye6v.up.railway.app`

### How to Add the DNS Record:

1. **Log into your domain registrar** (where you manage stuchai.com)
   - Common registrars: GoDaddy, Namecheap, Google Domains, Cloudflare, etc.

2. **Find DNS Management**
   - Look for "DNS Settings", "DNS Management", "DNS Records", or "Advanced DNS"

3. **Add CNAME Record**
   - Click "Add Record" or "+"
   - Select record type: **CNAME**
   - **Name/Host:** `appportal` (or `appportal.stuchai.com` depending on your provider)
   - **Value/Target:** `c8j4ye6v.up.railway.app`
   - **TTL:** Leave default (usually 3600 or Auto)
   - **Save**

4. **Wait for Propagation**
   - DNS changes can take up to 72 hours, but usually work within 1-2 hours
   - Railway will automatically detect when the record is active

### Example by Provider:

**Cloudflare:**
- DNS → Records → Add record
- Type: CNAME
- Name: appportal
- Target: c8j4ye6v.up.railway.app
- Proxy status: DNS only (gray cloud)
- Save

**GoDaddy:**
- DNS Management → Add
- Type: CNAME
- Host: appportal
- Points to: c8j4ye6v.up.railway.app
- TTL: 1 Hour
- Save

**Namecheap:**
- Advanced DNS → Add New Record
- Type: CNAME Record
- Host: appportal
- Value: c8j4ye6v.up.railway.app
- TTL: Automatic
- Save

---

## Step 2: Verify in Railway

1. Go back to Railway dashboard
2. The DNS modal should show "Record detected" once it's active
3. Railway will automatically configure SSL for your domain

---

## Step 3: Update Environment Variables

Once your domain is active, update `NEXTAUTH_URL`:

1. In Railway, go to your service → Variables
2. Find `NEXTAUTH_URL`
3. Update it to: `https://appportal.stuchai.com`
4. Save (Railway will redeploy automatically)

---

## Step 4: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   ```
   https://appportal.stuchai.com/api/auth/callback/google
   ```
5. Click "Save"

---

## Troubleshooting

### DNS Not Detected
- Wait 1-2 hours for propagation
- Verify the CNAME record is correct
- Check with: `nslookup appportal.stuchai.com` (should show c8j4ye6v.up.railway.app)

### SSL Certificate Issues
- Railway automatically provisions SSL certificates
- May take a few minutes after DNS is detected
- Check Railway logs for SSL status

### Still Not Working
- Double-check the CNAME value matches exactly
- Ensure no conflicting A records exist
- Contact your domain registrar support if needed

