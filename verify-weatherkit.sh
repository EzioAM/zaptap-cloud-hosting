#!/bin/bash

echo "🌤️  Verifying WeatherKit Configuration..."
echo "========================================="

# Check if the entitlements file exists and contains WeatherKit
echo "1. Checking entitlements..."
if grep -q "com.apple.developer.weatherkit" ios/Zaptap/Zaptap.entitlements; then
    echo "✅ WeatherKit entitlement found in Zaptap.entitlements"
else
    echo "❌ WeatherKit entitlement NOT found"
fi

# Check the project configuration
echo ""
echo "2. Checking Xcode project configuration..."
cd ios

# Check if WeatherKit capability is in project
if grep -q "com.apple.developer.weatherkit" Zaptap.xcodeproj/project.pbxproj; then
    echo "✅ WeatherKit capability found in Xcode project"
else
    echo "⚠️  WeatherKit capability might not be properly configured in Xcode"
fi

# Check if WeatherKit module files exist
echo ""
echo "3. Checking WeatherKit module files..."
if [ -f "Zaptap/WeatherKitModule.swift" ]; then
    echo "✅ WeatherKitModule.swift exists"
else
    echo "❌ WeatherKitModule.swift NOT found"
fi

if [ -f "Zaptap/WeatherKitModule.m" ]; then
    echo "✅ WeatherKitModule.m (bridge) exists"
else
    echo "❌ WeatherKitModule.m (bridge) NOT found"
fi

# Check bundle identifier
echo ""
echo "4. Checking bundle identifier..."
BUNDLE_ID=$(defaults read "$PWD/Zaptap/Info.plist" CFBundleIdentifier 2>/dev/null || echo "Could not read")
echo "   Bundle ID: $BUNDLE_ID"

# Check signing configuration
echo ""
echo "5. Checking code signing..."
SIGNING_INFO=$(xcodebuild -showBuildSettings -project Zaptap.xcodeproj -scheme Zaptap 2>/dev/null | grep -E "CODE_SIGN_IDENTITY|DEVELOPMENT_TEAM|PROVISIONING_PROFILE" | head -5)
if [ ! -z "$SIGNING_INFO" ]; then
    echo "$SIGNING_INFO"
else
    echo "⚠️  Could not retrieve signing information"
fi

echo ""
echo "========================================="
echo "⚠️  IMPORTANT: For WeatherKit to work properly:"
echo ""
echo "1. Log in to Apple Developer Portal"
echo "2. Go to Certificates, Identifiers & Profiles"
echo "3. Select your App ID (com.zaptap.app)"
echo "4. Enable 'WeatherKit' capability"
echo "5. Save the changes"
echo "6. Regenerate your provisioning profiles"
echo "7. In Xcode: Product > Clean Build Folder"
echo "8. Re-run the app"
echo ""
echo "The 401 error typically means:"
echo "- WeatherKit is not enabled for your App ID"
echo "- Provisioning profile doesn't include WeatherKit"
echo "- Bundle ID mismatch"
echo ""
echo "To test WeatherKit is working:"
echo "1. The app must be signed with YOUR developer account"
echo "2. Run on a real device or simulator with YOUR Apple ID signed in"
echo "3. WeatherKit requires iOS 16.0+"