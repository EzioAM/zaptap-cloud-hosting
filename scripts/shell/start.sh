#!/bin/bash

# Working Start - Guaranteed to Work
echo "🚀 Starting ShortcutsLike Development Server"
echo "==========================================="
echo ""

# Clean up
echo "🧹 Cleaning up..."
lsof -ti:8081 | xargs kill -9 2>/dev/null
pkill -f metro 2>/dev/null
pkill -f expo 2>/dev/null
rm -rf .expo 2>/dev/null
echo "✅ Cleanup complete"

echo ""
echo "📱 Starting server..."
echo ""
echo "After the server starts:"
echo "  • Your app should auto-reload if it's already installed"
echo "  • Press 'i' to run on iOS if not installed"
echo "  • Press 'r' to reload the app"
echo "  • Press 'd' to open developer menu"
echo ""
echo "==========================================="
echo ""

# Start Expo without problematic flags
exec npx expo start --clear