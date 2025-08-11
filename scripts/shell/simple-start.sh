#!/bin/bash

# Simple Start - Just Get It Running
echo "🚀 Simple Start - ShortcutsLike"
echo "==============================="
echo ""

# Step 1: Kill port 8081
echo "Clearing port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null

# Step 2: Clear minimal caches
echo "Clearing caches..."
rm -rf .expo 2>/dev/null

# Step 3: Start Expo
echo ""
echo "Starting Expo..."
echo ""
echo "Commands:"
echo "  • Press 'i' for iOS"
echo "  • Press 'a' for Android"
echo "  • Press 'r' to reload"
echo ""

# Start without dev-client flag to avoid issues
npx expo start --clear