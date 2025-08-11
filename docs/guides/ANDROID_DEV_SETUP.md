# Android Development Setup Guide

## Prerequisites

### 1. Install Android Studio
Download and install Android Studio from: https://developer.android.com/studio

During installation, make sure to install:
- Android SDK
- Android SDK Platform
- Android Virtual Device (optional, for emulator)

### 2. Install Java Development Kit (JDK)
Android development requires JDK 17. If not already installed:

**macOS with Homebrew:**
```bash
brew install openjdk@17
```

**Or download from:** https://adoptium.net/

### 3. Set Environment Variables
Add these to your `~/.zshrc` or `~/.bash_profile`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Java
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export PATH=$PATH:$JAVA_HOME/bin
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Prepare Your Android Device

### 1. Enable Developer Mode
On your Android phone:
1. Go to **Settings > About phone**
2. Tap **Build number** 7 times
3. You'll see "You are now a developer!"

### 2. Enable USB Debugging
1. Go to **Settings > Developer options**
2. Enable **USB debugging**
3. Enable **Install via USB** (if available)

### 3. Connect Your Device
1. Connect your Android phone to your Mac via USB
2. On your phone, tap "Allow" when prompted about USB debugging
3. Check connection:
   ```bash
   adb devices
   ```
   You should see your device listed

## Build and Run the App

### 1. Install Dependencies
Make sure you're in the project directory:
```bash
cd /Users/marcminott/Documents/DevProject/ShortcutsLike
```

### 2. Start Metro Bundler
In one terminal:
```bash
npm start
```

### 3. Run on Android Device
In another terminal:
```bash
npm run run:android
```

This will:
- Build the Android app
- Install it on your connected device
- Launch the app
- Connect to the Metro bundler for hot reload

### First Build Notes
- The first build will take 5-10 minutes
- Gradle will download dependencies
- The app will be installed as "ShortcutsLike"

## Testing Features

### NFC Testing
1. Ensure your Android device has NFC
2. Enable NFC in Settings
3. The app will request NFC permissions
4. Test reading/writing NFC tags

### Camera/QR Testing
1. Grant camera permissions when prompted
2. Test QR code scanning functionality

### Location Testing
1. Grant location permissions
2. Test location-based triggers

## Troubleshooting

### "SDK location not found"
Create a file `android/local.properties` with:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### Build Fails with Java Error
Ensure you're using JDK 17:
```bash
java -version
```

### Device Not Found
1. Check USB connection
2. Ensure USB debugging is enabled
3. Try different USB cable/port
4. Run `adb kill-server && adb start-server`

### App Crashes on Launch
1. Check logcat for errors:
   ```bash
   adb logcat | grep -i error
   ```
2. Clear app data and reinstall

## Development Workflow

### Hot Reload
- Save changes in your editor
- App automatically reloads
- Shake device for developer menu

### Debug Mode
- Shake device or press Cmd+M in emulator
- Select "Debug" for Chrome DevTools
- Use console.log for debugging

### Building APK
For sharing with others:
```bash
cd android
./gradlew assembleRelease
```
APK will be in `android/app/build/outputs/apk/release/`

## Next Steps
1. Test all automation features
2. Verify NFC functionality
3. Test QR code scanning
4. Check location services
5. Test SMS integration

Your Android development environment is ready! 🚀