# Metro Port Conflict & Manifest Error - FIXED ✅

## Issues Resolved

### 1. **Port 8081 Already in Use** ✅
- **Problem:** Metro bundler couldn't start because port 8081 was occupied
- **Solution:** Kill all processes using port 8081 before starting

### 2. **Manifest JSON Parse Error** ✅
- **Problem:** App couldn't load manifest from http://10.1.10.133:8081
- **Solution:** Created missing `app.json` file and fixed Metro configuration

### 3. **Metro Config Warning** ✅
- **Problem:** Metro config needs to extend '@react-native/metro-config'
- **Solution:** Updated `metro.config.js` to properly extend the base config

## Quick Fix - One Command

```bash
./quick-fix.sh
```

This single command will:
1. Kill processes on port 8081
2. Stop all Metro/Expo processes
3. Clear all caches
4. Start Expo with development client support

## Manual Fix Steps

### Step 1: Kill Port 8081
```bash
# Find and kill processes on port 8081
lsof -ti:8081 | xargs kill -9
```

### Step 2: Stop All Metro/Expo
```bash
# Kill all related processes
pkill -f metro
pkill -f expo
pkill -f react-native
```

### Step 3: Clear Caches
```bash
# Clear Metro cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
rm -rf .expo

# Clear Watchman
watchman watch-del-all
```

### Step 4: Start Fresh
```bash
# Start Expo with cleared cache
npx expo start --dev-client --clear
```

## Files Fixed

### 1. **metro.config.js**
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const config = {
  resolver: {
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['browser', 'require', 'react-native'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### 2. **app.json** (Created)
```json
{
  "expo": {
    "name": "Zaptap",
    "slug": "zaptap",
    "version": "2.3.1",
    "scheme": "zaptap",
    "owner": "mce_27",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "platforms": ["ios", "android"]
  }
}
```

## Alternative Solutions

### If Quick Fix Doesn't Work

#### Option 1: Use Tunnel Mode
```bash
npx expo start --tunnel
```
This bypasses local network issues by using Expo's tunnel service.

#### Option 2: Rebuild the App
```bash
# For iOS
npx expo run:ios --clear

# For Android
npx expo run:android --clear
```

#### Option 3: Manual IP Configuration
If the app can't connect to Metro:
1. Shake device to open developer menu
2. Tap "Configure Bundler"
3. Enter your computer's IP address
4. Port: 8081
5. Reload the app

## Connection URLs

After starting the server, you can connect via:
- **Local:** http://localhost:8081
- **Network:** http://[YOUR-IP]:8081
- **Tunnel:** Automatically provided by `--tunnel` flag

## Helper Scripts Created

1. **`quick-fix.sh`** - One-command solution
2. **`fix-metro-port.sh`** - Detailed port fixing with options
3. **`fix-expo-dev-build.sh`** - Complete Expo development build fix

## Testing the Fix

1. Run the quick fix:
   ```bash
   ./quick-fix.sh
   ```

2. When Expo starts, you'll see:
   - QR code for Expo Go
   - Connection URLs
   - Available commands

3. Press:
   - `i` to run on iOS
   - `a` to run on Android
   - `r` to reload
   - `d` to open developer menu

## Verify Everything Works

✅ **Check Metro is running:**
```bash
curl http://localhost:8081
```

✅ **Check app loads:**
- Open the app on simulator/device
- Should connect without errors

✅ **Check logs:**
- No "port in use" errors
- No "manifest parse" errors
- No Metro config warnings

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port still in use | Run `lsof -ti:8081` and manually kill PIDs |
| Manifest error persists | Delete app from simulator and reinstall |
| Can't connect to server | Use `--tunnel` flag or check firewall |
| Build fails | Run `npx expo prebuild --clean` |

## Summary

The main issues were:
1. **Port conflict** - Another process was using port 8081
2. **Missing app.json** - Expo couldn't generate the manifest
3. **Outdated Metro config** - Needed to extend the new base config

All issues have been fixed. Use `./quick-fix.sh` to start the app with a clean slate.

## Next Steps

Your app should now:
1. Start without port conflicts ✅
2. Load without manifest errors ✅
3. Connect to the development server ✅
4. Show no Metro warnings ✅

The development environment is ready for coding! 🎉