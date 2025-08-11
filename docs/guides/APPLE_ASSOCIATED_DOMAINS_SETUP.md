# Apple Associated Domains Setup for Zaptap

## 1. Get Your Team ID
1. Go to [Apple Developer](https://developer.apple.com)
2. Click Account → Membership
3. Copy your **Team ID** (looks like: ABC123DEF4)

## 2. Update the apple-app-site-association File
Replace `YOUR_TEAM_ID` in the file with your actual Team ID.

## 3. Host the File on Your Domains
The `apple-app-site-association` file must be hosted at:
- `https://zaptap.app/.well-known/apple-app-site-association`
- `https://www.zaptap.app/.well-known/apple-app-site-association`
- `https://zap.link/.well-known/apple-app-site-association`

### Requirements:
- ✅ Served over HTTPS
- ✅ Content-Type: `application/json` (no file extension)
- ✅ No redirects allowed
- ✅ Must be accessible without authentication

## 4. Verify Your Setup
Use Apple's validator:
```bash
curl -v https://zaptap.app/.well-known/apple-app-site-association
```

## 5. Example Nginx Configuration
```nginx
location /.well-known/apple-app-site-association {
    alias /path/to/apple-app-site-association;
    default_type application/json;
    add_header Content-Type application/json;
}
```

## 6. Example Vercel/Netlify Setup
Create `public/.well-known/apple-app-site-association` (no extension) with the JSON content.

## 7. Test Deep Links
Once deployed, test with:
```
https://zaptap.app/automation/test123
https://zaptap.app/shared/abc456
```

These should open your app if installed, or show a web fallback if not.