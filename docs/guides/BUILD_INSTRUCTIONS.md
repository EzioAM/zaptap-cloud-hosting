# Development Build Instructions for iPhone

## Prerequisites Completed ✅
- EAS CLI installed globally
- eas.json configured for physical device
- app.json updated with plugins and permissions

## Next Steps to Create Development Build

### 1. Login to Expo Account
If you don't have an Expo account, create one at https://expo.dev

Run this command and follow the prompts:
```bash
eas login
```

### 2. Configure Apple Developer Account
You have two options:

#### Option A: Use Expo's Managed Credentials (Easiest - No Apple Developer Account Required)
When prompted during the build, select:
- "Let Expo handle the process"
- This creates a development provisioning profile automatically

#### Option B: Use Your Own Apple Developer Account ($99/year)
- Requires an active Apple Developer account
- Provides more control over certificates and provisioning

### 3. Start the Build Process
Run this command in the project directory:
```bash
eas build --platform ios --profile development
```

During the build process, you'll be asked:
1. **Apple ID**: Enter your Apple ID (any Apple ID works for development)
2. **Bundle Identifier**: Keep the default `com.shortcutslike.app`
3. **Provisioning Profile**: Choose "Let Expo handle the process"
4. **Distribution Certificate**: Choose "Let Expo handle the process"

### 4. Wait for Build to Complete
- The build will take 10-30 minutes
- You'll receive an email when it's done
- Or monitor progress at: https://expo.dev/accounts/[your-username]/projects/ShortcutsLike/builds

### 5. Install on Your iPhone

#### Method 1: QR Code (Easiest)
1. When build completes, a QR code will be shown
2. Scan with your iPhone camera
3. Tap the notification to install

#### Method 2: Direct Download
1. Click the build URL in terminal or email
2. On your iPhone, open Safari and go to that URL
3. Tap "Install" when prompted

#### Method 3: Using Apple Configurator 2
1. Download the .ipa file from the build page
2. Connect iPhone to Mac via USB
3. Open Apple Configurator 2
4. Drag the .ipa to your device

### 6. Trust the Developer Certificate
On your iPhone:
1. Go to Settings > General > VPN & Device Management
2. Under "Developer App", tap your certificate
3. Tap "Trust [Your Name]"
4. Tap "Trust" again to confirm

### 7. Run the Development Server
After installation, start the Metro bundler:
```bash
npx expo start --dev-client
```

Then:
1. Open the ShortcutsLike app on your iPhone
2. The app will show a screen to enter the dev server URL
3. Your Mac's URL will be shown in the terminal (usually something like exp://192.168.1.x:8081)
4. Enter this URL on your iPhone

## Troubleshooting

### "Unable to verify app" error
- Make sure you've trusted the developer certificate (Step 6)
- Check that your iPhone has internet connection

### App crashes on launch
- Ensure you're running `npx expo start --dev-client` (not just `expo start`)
- Check that your iPhone and Mac are on the same network

### Build fails
- Run `eas build --clear-cache --platform ios --profile development`
- Check your internet connection
- Verify your Apple ID credentials

### Can't find the build URL
- Visit https://expo.dev and sign in
- Go to your projects and find ShortcutsLike
- Click on "Builds" to see all your builds

## Important Notes
- This development build includes all native modules (NFC, Camera, Location, etc.)
- The build is tied to your device's UDID (automatically handled by Expo)
- Development builds expire after 7 days but can be rebuilt anytime
- You can install on up to 100 devices with the same build

## Quick Reference Commands
```bash
# Check login status
eas whoami

# Start new build
eas build --platform ios --profile development

# Start dev server for development build
npx expo start --dev-client

# Clear build cache if needed
eas build --clear-cache --platform ios --profile development
```