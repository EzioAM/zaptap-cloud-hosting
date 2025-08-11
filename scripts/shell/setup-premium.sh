#!/bin/bash

# Premium Features Quick Setup Script
# Handles React 19 compatibility issues

echo "🚀 Installing Premium Features with React 19 support..."
echo "================================================"
echo ""

# Step 1: Install with legacy peer deps for React 19 compatibility
echo "📦 Installing dependencies (React 19 compatible)..."
npm install --legacy-peer-deps

# Step 2: iOS Setup (if on macOS)
if [ -d "ios" ]; then
    echo ""
    echo "📱 Setting up iOS..."
    cd ios
    
    # Clean build folder to avoid conflicts
    rm -rf build
    
    # Install pods
    echo "Installing CocoaPods..."
    pod install
    
    cd ..
    echo "✅ iOS setup complete!"
fi

# Step 3: Android Setup (if exists)
if [ -d "android" ]; then
    echo ""
    echo "🤖 Cleaning Android build..."
    cd android
    ./gradlew clean
    cd ..
    echo "✅ Android cleaned!"
fi

echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Run the app:"
echo "   iOS:     npm run ios"
echo "   Android: npm run android"
echo ""
echo "2. The premium weather effects are now available!"
echo "3. Check the IoT Dashboard in the app"
echo ""
echo "Note: The pod warnings about 'DEFINES_MODULE' are normal and won't affect functionality."
echo ""
echo "🎉 Enjoy your premium features with React 19!"