# Building Zaptap for iOS

## Prerequisites
1. ✅ Apple Developer Account ($99/year)
2. ✅ App ID registered (com.zaptap.app)
3. ✅ EAS CLI installed (`npm install -g eas-cli`)
4. ✅ Logged in to Expo (`eas login`)

## Quick Start Build Commands

### 1. Development Build (for testing on device)
```bash
eas build --platform ios --profile development
```

### 2. Preview Build (for internal testing)
```bash
eas build --platform ios --profile preview
```

### 3. Production Build (for TestFlight/App Store)
```bash
eas build --platform ios --profile production
```

## First Time Setup

1. **Configure credentials** (EAS will guide you):
```bash
eas credentials
```

2. **Select or create**:
   - Distribution Certificate
   - Provisioning Profile
   - Push Notification Key (if using push)

## Build Process

1. **Start the build**:
```bash
eas build --platform ios --profile production
```

2. **EAS will**:
   - Ask for Apple ID credentials (first time only)
   - Create/select certificates
   - Upload to EAS servers
   - Build in the cloud
   - Automatically submit to App Store Connect

3. **Monitor progress**:
   - Watch in terminal
   - Or check https://expo.dev (your builds dashboard)

## After Build Completes

1. **For Development/Preview builds**:
   - Download .ipa file
   - Install via Apple Configurator or Xcode

2. **For Production builds**:
   - Automatically uploaded to App Store Connect
   - Available in TestFlight within 10-30 minutes
   - Add internal/external testers
   - Submit for App Store review when ready

## Troubleshooting

### "No bundle identifier" error
- Run: `expo prebuild --clean`

### "Certificate not found" error
- Run: `eas credentials` and reset certificates

### Build fails
- Check build logs at https://expo.dev
- Ensure all capabilities match your provisioning profile

## TestFlight Distribution

1. Go to App Store Connect
2. Select your app → TestFlight
3. iOS build will appear after processing
4. Add testers by email
5. They'll receive TestFlight invite

## Important Notes

- First build takes 20-40 minutes
- Subsequent builds are faster (cached)
- Keep your certificates safe
- Update version/build numbers for each submission