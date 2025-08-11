# 🚨 FIX: RNSkiaModule Not Found Error

## The Error
```
Invariant Violation: TurboModuleRegistry.getEnforcing(...): 
'RNSkiaModule' could not be found. Verify that a module by 
this name is registered in the native binary.
```

## Why This Happens
This error occurs because the React Native Skia native module is not properly linked in your app's native binary. This typically happens when:
1. The app was already running when you added the dependency
2. The native module wasn't properly linked during pod install
3. The app needs to be rebuilt (not just reloaded)

## ✅ Quick Fix (Recommended)

Run this command to automatically fix the issue:

```bash
npm run fix:skia
```

Then rebuild your app:

```bash
# For iOS
npm run rebuild:ios

# For Android
npm run rebuild:android
```

## 🔧 Manual Fix Steps

If the automatic fix doesn't work, follow these manual steps:

### Step 1: Stop Everything
```bash
# Kill Metro bundler
npx kill-port 8081

# Stop any running simulators
# iOS: Cmd+Q in Simulator
# Android: Close emulator
```

### Step 2: Clean Everything
```bash
# Clear Metro cache
npx react-native start --reset-cache
# Press Ctrl+C after it starts

# Clear watchman (if you have it)
watchman watch-del-all

# Clean iOS build
cd ios
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/*
cd ..

# Clean Android build
cd android
./gradlew clean
cd ..
```

### Step 3: Reinstall Dependencies
```bash
# Remove node_modules
rm -rf node_modules

# Install with React 19 compatibility
npm install --legacy-peer-deps

# Reinstall iOS pods
cd ios
pod deintegrate
pod install
cd ..
```

### Step 4: Rebuild the App

#### Option A: Command Line
```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

#### Option B: Xcode (More Reliable for iOS)
1. Open `ios/Zaptap.xcworkspace` in Xcode (NOT .xcodeproj)
2. Select your target device/simulator
3. Press `Cmd+Shift+K` to clean build
4. Press `Cmd+R` to build and run

### Step 5: Verify It's Working
Once the app is running, you should see in the console:
```
[PremiumConfig] React Native Skia is available
```

## 🎯 Workaround (If Rebuild Fails)

The app has been configured to automatically fall back to standard weather effects if Skia is not available. This means your app will still work even without the premium effects.

To verify fallback mode is working:
1. Check the console for: `[PremiumConfig] React Native Skia not available - using fallback effects`
2. The weather widget will use standard effects instead of premium ones
3. All other features will work normally

## 📱 Platform-Specific Issues

### iOS Issues
If you're still having issues on iOS:

1. **Ensure you're using the workspace**:
   - Open `ios/Zaptap.xcworkspace` NOT `Zaptap.xcodeproj`

2. **Check pod installation**:
   ```bash
   cd ios
   pod list | grep -i skia
   # Should show: react-native-skia (2.2.2)
   ```

3. **Reset iOS Simulator**:
   - In Simulator: Device → Erase All Content and Settings

### Android Issues
If you're having issues on Android:

1. **Ensure you have the right JDK**:
   ```bash
   java -version
   # Should be JDK 17 or higher
   ```

2. **Clean Gradle cache**:
   ```bash
   cd android
   ./gradlew cleanBuildCache
   cd ..
   ```

3. **Increase memory for Gradle**:
   Add to `android/gradle.properties`:
   ```
   org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=4096m
   ```

## 🔍 Debugging

To check if Skia is properly installed:

```bash
# Check node_modules
ls node_modules/@shopify/react-native-skia
# Should list the package files

# Check iOS pods
cd ios && pod list | grep skia
# Should show: react-native-skia (2.2.2)

# Check package.json
grep skia package.json
# Should show: "@shopify/react-native-skia": "^2.2.2"
```

## 💡 Tips

1. **Always rebuild after adding native dependencies**: Hot reload/Fast Refresh won't link native modules
2. **Use the workspace file for iOS**: Always open `.xcworkspace` not `.xcodeproj`
3. **Clear caches when in doubt**: Metro and build caches can cause strange issues
4. **Check the console**: Look for `[PremiumConfig]` messages to see if Skia is detected

## 🆘 Still Having Issues?

If none of the above works:

1. **Check React Native version compatibility**:
   ```bash
   npm list react react-native @shopify/react-native-skia
   ```
   Ensure versions are compatible.

2. **Try the complete rebuild script**:
   ```bash
   chmod +x rebuild-with-skia.sh
   ./rebuild-with-skia.sh
   ```

3. **Use standard effects as fallback**:
   The app will automatically use standard weather effects if Skia isn't available. This ensures your app remains functional.

4. **File an issue** with:
   - Your React Native version
   - Your React version  
   - The exact error message
   - Output of `npm list @shopify/react-native-skia`

## ✨ Expected Result

After successful setup:
- No more RNSkiaModule error
- Console shows: `[PremiumConfig] React Native Skia is available`
- Weather widget shows premium rain-on-glass effects
- Touch interactions work on the weather widget
- Smooth 60+ FPS animations

## 🎉 Success!

Once fixed, you'll have:
- **Premium Weather Effects**: GPU-accelerated rain, snow, and condensation
- **Interactive Touch**: Wipe away condensation on the weather widget
- **Smooth Performance**: 50% faster rendering on iOS
- **Automatic Fallback**: Standard effects if Skia unavailable

---

Remember: **You must rebuild the app** after adding native modules. Hot reload alone won't work!