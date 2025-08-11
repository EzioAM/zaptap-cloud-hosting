#!/bin/bash

# Ultimate Restart - Complete Fresh Start
# This script ensures everything is properly reset and started

echo "🚀 ShortcutsLike Ultimate Restart"
echo "================================="
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Killing all processes...${NC}"
# Kill everything
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null
pkill -f metro 2>/dev/null
pkill -f expo 2>/dev/null
pkill -f react-native 2>/dev/null
pkill -f watchman 2>/dev/null
echo -e "${GREEN}✅ All processes stopped${NC}"

echo ""
echo -e "${BLUE}Step 2: Clearing all caches...${NC}"
# Clear everything
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf $TMPDIR/react-* 2>/dev/null
rm -rf .expo 2>/dev/null
rm -rf ~/.expo 2>/dev/null
rm -rf ios/build 2>/dev/null
rm -rf ios/Pods/build 2>/dev/null
watchman watch-del-all 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✅ All caches cleared${NC}"

echo ""
echo -e "${BLUE}Step 3: Verifying configuration...${NC}"
# Check critical files
if [ -f "app.json" ]; then
    echo -e "${GREEN}✅ app.json exists${NC}"
else
    echo "⚠️  app.json missing - creating..."
    cat > app.json << 'EOF'
{
  "expo": {
    "name": "Zaptap",
    "slug": "zaptap",
    "version": "2.3.1",
    "scheme": "zaptap"
  }
}
EOF
    echo -e "${GREEN}✅ app.json created${NC}"
fi

if [ -f "metro.config.js" ]; then
    echo -e "${GREEN}✅ metro.config.js exists${NC}"
else
    echo "⚠️  metro.config.js missing"
fi

echo ""
echo -e "${BLUE}Step 4: Starting fresh Expo server...${NC}"
echo ""
echo "========================================="
echo "📱 Starting Expo Development Server"
echo "========================================="
echo ""
echo "The server will start now. Use these commands:"
echo "  • Press 'i' to run on iOS"
echo "  • Press 'a' to run on Android"
echo "  • Press 'r' to reload"
echo "  • Press 'd' for developer menu"
echo "  • Press 'Ctrl+C' to stop"
echo ""
echo "========================================="
echo ""

# Start Expo with all the right flags
EXPO_NO_TELEMETRY=1 npx expo start --dev-client --clear

# Script ends when you stop Expo with Ctrl+C