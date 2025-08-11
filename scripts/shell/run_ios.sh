#!/usr/bin/env bash

# Clean script to run iOS app with proper setup

echo "🧹 Cleaning build artifacts..."
cd ios
xcodebuild clean -workspace Zaptap.xcworkspace -scheme Zaptap -configuration Debug -quiet

echo "📦 Installing pods..."
pod install --repo-update

echo "🚀 Opening Xcode..."
open Zaptap.xcworkspace

echo "
✅ Build preparation complete!

To run the app:
1. In Xcode, select 'iPhone 16 Pro' simulator
2. Press Cmd+R to build and run
3. Metro bundler is already running

If you see a runtime error:
- Check the Xcode console for detailed error messages
- Make sure Metro bundler is running (it should be)
- Try 'Product > Clean Build Folder' in Xcode if issues persist
"