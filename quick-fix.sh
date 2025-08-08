#!/bin/bash

# Quick Fix - One Command Solution for All Issues
# Fixes port conflicts, manifest errors, and starts the app

echo "🔧 ShortcutsLike Quick Fix - Resolving All Issues"
echo "================================================"
echo ""

# Kill everything on port 8081
echo "1️⃣  Clearing port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null

# Kill all Metro/Expo processes
echo "2️⃣  Stopping all Metro/Expo processes..."
pkill -f metro 2>/dev/null
pkill -f expo 2>/dev/null
pkill -f react-native 2>/dev/null

# Clear all caches
echo "3️⃣  Clearing all caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null
watchman watch-del-all 2>/dev/null || true

# Wait a moment
sleep 2

# Start Expo with development client
echo "4️⃣  Starting Expo development server..."
echo ""
echo "✨ Starting fresh Expo server..."
echo ""

# Start with development client support
npx expo start --dev-client --clear

# The above command will keep running and show the QR code/options