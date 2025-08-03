# Zaptap Web Share Infrastructure

This directory contains the web infrastructure needed to handle shared automation links from the Zaptap mobile app.

## Problem Solved

When users share automations from the mobile app, they generate links like:
- `https://zaptap.cloud/share/abc123`
- `https://zaptap.cloud/link/automation-id`
- `https://zaptap.cloud/run/automation-id`

These links were returning 404 errors because there was no backend to handle them.

## Solution

This creates a single-page web application that:

1. **Handles shared automation links** - Routes all sharing URLs to a single page
2. **Loads automation data** - Fetches shared automation data from Supabase
3. **Executes automations in web** - Runs compatible automation steps in the browser
4. **Fallback to mobile app** - Provides deep links to open automations in the mobile app

## Files

- `index.html` - Main web application that handles all shared automation links
- `.htaccess` - URL rewriting rules to route sharing URLs to the main page
- `README.md` - This documentation

## Deployment Instructions

### Option 1: Deploy to zaptap.cloud root

1. Upload these files to your `zaptap.cloud` web server root:
   ```
   /var/www/zaptap.cloud/
   ├── index.html (existing)
   ├── share/
   │   ├── index.html (this file)
   │   └── .htaccess (this file)
   ```

2. Update your main `.htaccess` to route share URLs:
   ```apache
   # Add to main .htaccess
   RewriteRule ^share/([a-zA-Z0-9]+)/?$ share/index.html [L,QSA]
   RewriteRule ^link/([a-zA-Z0-9-]+)/?$ share/index.html [L,QSA]
   RewriteRule ^run/([a-zA-Z0-9-]+)/?$ share/index.html [L,QSA]
   ```

### Option 2: Replace existing site (if no current website)

1. Upload `index.html` as the main page for `zaptap.cloud`
2. Upload `.htaccess` to handle URL routing

### Option 3: Use subdomain

1. Create `share.zaptap.cloud` subdomain
2. Upload files to subdomain root
3. Update mobile app to use `https://share.zaptap.cloud/share/{id}` URLs

## Features

### Web Automation Engine

The page includes a lightweight automation engine that can execute these step types in the browser:

- ✅ **SMS** - Opens device SMS app with pre-filled message
- ✅ **Email** - Opens device email app with pre-filled email
- ✅ **Notifications** - Shows browser notifications or alerts
- ✅ **Open URL** - Opens websites in new tabs
- ✅ **Text** - Displays text or copies to clipboard
- ✅ **Delay** - Waits specified time between steps
- ✅ **Location** - Gets current location and can share via SMS
- ✅ **Variables** - Stores and retrieves values during execution

### Incompatible Steps

These step types require the mobile app and will show as "incompatible":
- NFC operations
- File system access
- Camera/photo operations
- Device-specific sensors
- Advanced system integrations

### Analytics

The page automatically:
- Tracks when shared links are accessed
- Increments access counters in the database
- Logs successful executions

## Database Requirements

The web app connects to your existing Supabase database and uses these tables:

- `public_shares` - Stores shared automation data and access analytics
- `sharing_logs` - Logs sharing activity and usage stats

These tables should already exist from your mobile app setup.

## Security Features

- ✅ **Expiration dates** - Shared links automatically expire
- ✅ **Access counting** - Tracks how many times links are used  
- ✅ **Active status** - Links can be revoked/deactivated
- ✅ **HTTPS enforcement** - Redirects HTTP to HTTPS
- ✅ **CORS headers** - Enables cross-origin requests

## Testing

After deployment, test with a shared automation link:

1. Share an automation from the mobile app
2. Copy the generated link
3. Open in a web browser
4. Verify automation loads and can be executed

## Troubleshooting

### 404 Errors Still Occurring

1. Check `.htaccess` file permissions (should be 644)
2. Verify mod_rewrite is enabled on your server
3. Check server error logs for rewrite rule issues

### Automation Data Not Loading

1. Verify Supabase credentials in `index.html`
2. Check that `public_shares` table exists and has correct permissions
3. Test database connection directly

### Steps Not Executing

1. Check browser console for JavaScript errors
2. Verify step types are supported by web engine
3. Test with simple automations first (SMS, notification)

## Customization

To customize the appearance:

1. Edit the CSS styles in the `<style>` section
2. Update colors, fonts, and layout as needed
3. Modify the header logo and branding

To add new step types:

1. Add executor function to `WebAutomationEngine.executors`
2. Update `generateStepHTML()` to display the new step type
3. Test thoroughly in various browsers

## Performance

The page is optimized for:
- ⚡ Fast loading (single HTML file, minimal dependencies)
- 📱 Mobile-first responsive design
- 🔄 Automatic retries for failed operations
- 💾 Minimal bandwidth usage

The only external dependency is the Supabase JavaScript client, loaded from CDN.