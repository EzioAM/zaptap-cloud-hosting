# Zaptap.cloud Hosting Setup

This directory contains the files needed to host your domain at `zaptap.cloud`.

## Files:
- `index.html` - Landing page with app download links
- `.well-known/apple-app-site-association` - iOS Universal Links configuration
- `.well-known/assetlinks.json` - Android App Links configuration
- `vercel.json` - Vercel hosting configuration

## Setup Steps:

### 1. Get Android SHA256 Fingerprint
Run this command to get your debug fingerprint:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

### 2. Update assetlinks.json
Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `.well-known/assetlinks.json` with your actual fingerprint.

### 3. Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in this directory
3. Follow the prompts
4. Add your custom domain `zaptap.cloud` in Vercel dashboard

### 4. Test Setup
After deployment, test these URLs:
- https://zaptap.cloud/.well-known/apple-app-site-association
- https://zaptap.cloud/.well-known/assetlinks.json

### 5. Test Deep Links
Try these URLs to test deep linking:
- https://zaptap.cloud/automation/test-automation-id
- https://zaptap.cloud/share/test-share-id

## Alternative Hosting
You can also deploy this to:
- Netlify
- GitHub Pages  
- Firebase Hosting
- Any static hosting service