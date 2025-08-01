# Build Locally for iPhone 16 Pro Max

## Prerequisites
1. Make sure Xcode is installed and up to date
2. Your iPhone is connected via USB and trusted

## Build Steps

### Option 1: Using Expo Run (Recommended)
This builds the app locally on your Mac and installs directly to your iPhone:

```bash
# Make sure you're using Node 18
source ~/.nvm/nvm.sh && nvm use 18

# Run the build
npm run run:ios
```

When prompted:
- Select your iPhone 16 Pro Max from the device list
- The first build will take 5-10 minutes
- Subsequent builds will be much faster

### Option 2: Using Xcode Directly
If the above doesn't work:

```bash
# Generate the iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/ShortcutsLike.xcworkspace
```

In Xcode:
1. Select your iPhone 16 Pro Max as the target device
2. Click the "Play" button to build and run
3. Trust the developer certificate on your iPhone when prompted

## What This Gives You

✅ All features working:
- NFC tag reading/writing
- QR code scanning with camera
- Location services
- SMS integration
- Clipboard access
- All other native features

✅ Development benefits:
- Hot reload still works
- No waiting for cloud builds
- Direct USB installation
- Faster iteration

## Troubleshooting

### "Unable to verify app"
On your iPhone:
1. Go to Settings > General > VPN & Device Management
2. Find the Developer App section
3. Trust your developer certificate

### Build fails
1. Make sure your iPhone is unlocked
2. Check that you have enough storage
3. Try: `npm run run:ios:clean`

### Module errors
If you still get module errors:
```bash
# Clean everything
rm -rf node_modules ios
npm install
npm run run:ios
```

## Next Steps

Once the app is running on your iPhone 16 Pro Max:
1. Test NFC functionality
2. Try QR code scanning
3. Test location triggers
4. Verify all native features work

The app will remain installed on your phone and you can continue developing with hot reload!