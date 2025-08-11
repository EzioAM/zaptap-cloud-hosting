#!/bin/bash

echo "Setting up iOS Development Build for iPhone 16 Pro Max"
echo "======================================================"

# Ensure we're using Node 18
source ~/.nvm/nvm.sh
nvm use 18

# First, let's check if you're logged in
echo "Checking EAS login status..."
eas whoami

# Create the project configuration
echo "Creating EAS project configuration..."
cat > eas.json << 'EOF'
{
  "cli": {
    "version": ">= 5.4.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
EOF

# Update app.json with all plugins for iOS
echo "Updating app.json for iOS features..."
cat > app.json << 'EOF'
{
  "expo": {
    "name": "ShortcutsLike",
    "slug": "ShortcutsLike",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "shortcuts-like",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [
      "expo-dev-client",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow ShortcutsLike to access your camera for QR code scanning"
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow ShortcutsLike to use your location for automation triggers"
        }
      ],
      "expo-sms",
      "expo-clipboard",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow ShortcutsLike to access your photos for automations"
        }
      ],
      "expo-av",
      "expo-task-manager"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.shortcutslike.app",
      "associatedDomains": ["applinks:shortcutslike.app", "applinks:www.shortcutslike.app"],
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to scan QR codes for automations.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app uses location services to trigger location-based automations.",
        "NSLocationWhenInUseUsageDescription": "This app uses location services to trigger location-based automations.",
        "NSPhotoLibraryUsageDescription": "This app needs access to your photos to select images for automations.",
        "NFCReaderUsageDescription": "This app uses NFC to read and write automation tags.",
        "NSFaceIDUsageDescription": "This app uses Face ID for secure automation access.",
        "com.apple.developer.nfc.readersession.iso7816.select-identifiers": ["*"],
        "com.apple.developer.nfc.readersession.iso14443.select-identifiers": ["*"]
      },
      "entitlements": {
        "com.apple.developer.nfc.readersession.formats": ["NDEF", "TAG"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.shortcutslike.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
EOF

echo ""
echo "✅ Configuration files updated!"
echo ""
echo "Next steps:"
echo "1. Run: eas build --platform ios --profile development"
echo "2. When prompted about creating an EAS project, type 'y' and press Enter"
echo "3. Follow the prompts to set up your Apple ID"
echo "4. The build will take 15-30 minutes"
echo ""
echo "Your iPhone 16 Pro Max will support ALL features including:"
echo "- NFC reading/writing"
echo "- QR code scanning with camera"
echo "- Location-based triggers" 
echo "- Face ID authentication"
echo "- All iOS 17+ features"