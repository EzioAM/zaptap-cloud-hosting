# NFC App Linking Guide

This guide explains how NFC tags are configured to open in the Zaptap app when installed, or fall back to the browser when not installed.

## Overview

When an NFC tag is scanned, the OS needs to determine whether to open it in an app or browser. This is achieved through:
- **Android**: App Links with auto-verification
- **iOS**: Universal Links with apple-app-site-association

## Implementation Details

### 1. NFC Tag Format

The NFC tags now contain:
- **Primary**: HTTPS URL (e.g., `https://www.zaptap.cloud/share/abc123`)
- **Android AAR**: Android Application Record specifying `com.zaptap.app`
- **Metadata**: Text records with automation title and step count

### 2. Android App Links

**AndroidManifest.xml** configured with:
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW"/>
    <data android:scheme="https" android:host="zaptap.cloud"/>
    <data android:scheme="https" android:host="www.zaptap.cloud"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <category android:name="android.intent.category.DEFAULT"/>
</intent-filter>
```

**assetlinks.json** at `https://www.zaptap.cloud/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.zaptap.app",
    "sha256_cert_fingerprints": ["YOUR_FINGERPRINT_HERE"]
  }
}]
```

### 3. iOS Universal Links

**apple-app-site-association** at `https://www.zaptap.cloud/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "QH729XYMW4.com.zaptap.app",
      "paths": [
        "/automation/*",
        "/share/*",
        "/link/*",
        "/run/*",
        "/emergency/*"
      ]
    }]
  }
}
```

## How It Works

1. **App Installed**: 
   - Android: OS verifies app links, opens directly in Zaptap
   - iOS: Universal Links trigger, opens in Zaptap

2. **App Not Installed**:
   - Opens in default browser
   - Web page displays automation details with two options:
     - **Run in Browser**: Execute the automation immediately without installing the app
     - **Use Zaptap App**: Install the app for full features
   - Shows compatibility information for browser execution
   - Highlights which steps require the app

## Deployment Requirements

1. **Update Android SHA256 Fingerprint**:
   - Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `hosting/.well-known/assetlinks.json`
   - Use production keystore fingerprint

2. **Deploy to Web Server**:
   - Upload `hosting/.well-known/` directory to web server
   - Ensure files are accessible at exact paths
   - Set correct MIME types:
     - `assetlinks.json`: `application/json`
     - `apple-app-site-association`: `application/json`

3. **Verify Configuration**:
   - Android: https://developers.google.com/digital-asset-links/tools/generator
   - iOS: `curl -v https://www.zaptap.cloud/.well-known/apple-app-site-association`

## Testing

1. **Write NFC Tag** with a public automation
2. **Scan with App Installed**: Should open directly in Zaptap
3. **Uninstall App & Scan**: Should open in browser with install prompt

## Troubleshooting

- **Still opens in browser**: Check fingerprint matches production app
- **iOS not working**: Ensure apple-app-site-association is served over HTTPS
- **Android not working**: Check app is signed with correct certificate

## Code Changes Made

1. **NFCService.ts**: Added Android Application Record (AAR) to NFC tags
2. **apple-app-site-association**: Added missing paths (/share/*, /link/*, /run/*)
3. **Created assetlinks.json**: For Android App Links verification
4. **Updated NFC scanning**: Handles public share URLs from web links
5. **Enhanced web-share/index.html**: 
   - Added browser execution capability with WebAutomationEngine
   - Shows two clear options: run in browser or use app
   - Displays compatibility info for each automation step
   - Warns about app-only features

## Browser Execution Features

The web share page now supports executing many automation steps directly in the browser:

### Supported Steps:
- **SMS**: Opens SMS app with pre-filled message
- **Email**: Opens email client with pre-filled content
- **Notifications**: Shows browser notifications (with permission)
- **Open URL**: Opens websites in new tabs
- **Delays**: Waits specified duration
- **Text Operations**: Display or copy text
- **Location**: Get/share current location
- **Variables**: Set and get variables
- **Math**: Basic calculations
- **Clipboard**: Copy/paste operations

### App-Only Features:
- Background execution
- System integrations
- Advanced triggers
- File operations
- Complex automations