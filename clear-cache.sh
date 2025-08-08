#!/bin/bash

# Clear React Native cache and restart the app
echo "🧹 Clearing React Native cache..."

# Clear watchman watches
watchman watch-del-all 2>/dev/null || echo "Watchman not installed, skipping..."

# Delete node_modules and reinstall
echo "📦 Reinstalling dependencies..."
rm -rf node_modules
npm install

# Clear Metro bundler cache
echo "🚀 Clearing Metro bundler cache..."
npx react-native start --reset-cache &

# Wait for Metro to start
sleep 5

# Kill the Metro process (it's just to clear the cache)
kill %1 2>/dev/null || echo "Metro process already stopped"

echo "✅ Cache cleared successfully!"
echo ""
echo "To start the app, run:"
echo "  npm start"
echo ""
echo "If you still see module resolution errors, try:"
echo "  1. Close the Metro bundler terminal"
echo "  2. Run: npx expo start -c"
echo "  3. Press 'i' for iOS or 'a' for Android"
