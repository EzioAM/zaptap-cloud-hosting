# EAS Build Setup Guide - Zaptap AI Features

## 🚀 First-Time Setup

Since this is your first EAS build, you'll need to set up credentials. Don't worry - it's straightforward!

## 📱 iOS Build Setup

```bash
npm run build:preview:ios
```

When prompted:
1. **Apple ID**: Use your Apple Developer account email
2. **Team**: Select your team (or personal team)
3. **Bundle Identifier**: Keep the default `com.zaptap.app`
4. **Provisioning Profile**: Let EAS create one for you

## 🤖 Android Build Setup

```bash
npm run build:preview:android
```

When prompted:
1. **Keystore**: Choose "Generate new keystore"
2. **Key alias**: Use `zaptap` (or any name you prefer)
3. **Passwords**: Create secure passwords (save them!)

## ✅ After Initial Setup

Once you've completed the initial build setup, future deployments are simple:

### Build New Versions
```bash
npm run deploy:build
```

### Update Existing Builds (OTA)
```bash
npm run deploy:update
```

## 🎯 Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run build:preview:ios` | Build iOS preview |
| `npm run build:preview:android` | Build Android preview |
| `npm run build:preview` | Build both platforms |
| `npm run deploy:update` | Push OTA update |
| `eas build:list` | View all builds |
| `eas credentials` | Manage credentials |

## 📲 Installing Your Build

1. **Check build status**: `eas build:list`
2. **Download**: Click the link in your email or from build list
3. **Install**:
   - iOS: Use Apple Configurator or install OTA
   - Android: Enable "Unknown sources" and install APK

## 🔧 Troubleshooting

### iOS Issues
- **No Apple Developer account?** You can use Expo Go for testing
- **Provisioning errors?** Run `eas credentials` and reset

### Android Issues  
- **Keystore lost?** Generate a new one (only for preview builds)
- **Build failed?** Check `eas build:list --status=errored`

### Environment Variables
Already configured in eas.json:
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ CLAUDE_API_KEY
- ✅ OPENAI_API_KEY

## 💡 Tips

1. **Save credentials**: Store keystore passwords securely
2. **Use preview channel**: Perfect for testing AI features
3. **OTA updates**: Much faster than rebuilding
4. **Check logs**: `eas build:view [BUILD_ID]` for details

---

Ready to deploy your AI-powered app! 🎉