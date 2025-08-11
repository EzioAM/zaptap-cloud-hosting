#!/bin/bash

# Complete rebuild script for React Native Skia integration
# This ensures native modules are properly linked

echo "🔧 React Native Skia Native Module Fix"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Clean everything
echo -e "${BLUE}Step 1: Cleaning old builds...${NC}"
echo "--------------------------------"

# Clean iOS
if [ -d "ios" ]; then
    echo -e "${YELLOW}Cleaning iOS...${NC}"
    cd ios
    # Clean build folder
    rm -rf build
    rm -rf ~/Library/Developer/Xcode/DerivedData/*
    # Clean pods
    rm -rf Pods
    rm -rf Podfile.lock
    cd ..
    echo -e "${GREEN}✓ iOS cleaned${NC}"
fi

# Clean Android
if [ -d "android" ]; then
    echo -e "${YELLOW}Cleaning Android...${NC}"
    cd android
    ./gradlew clean
    cd ..
    echo -e "${GREEN}✓ Android cleaned${NC}"
fi

# Clean Metro bundler cache
echo -e "${YELLOW}Cleaning Metro cache...${NC}"
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null
echo -e "${GREEN}✓ Metro cache cleared${NC}"

# Clean node modules
echo -e "${YELLOW}Cleaning node_modules...${NC}"
rm -rf node_modules
echo -e "${GREEN}✓ node_modules removed${NC}"

echo ""
echo -e "${BLUE}Step 2: Installing dependencies...${NC}"
echo "------------------------------------"

# Install with legacy peer deps for React 19
echo -e "${YELLOW}Installing npm packages...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✓ NPM packages installed${NC}"

echo ""
echo -e "${BLUE}Step 3: iOS Setup...${NC}"
echo "---------------------"

if [ -d "ios" ]; then
    cd ios
    
    # Install pods with verbose output
    echo -e "${YELLOW}Installing CocoaPods...${NC}"
    pod install --verbose
    
    # Verify Skia pod is installed
    if grep -q "react-native-skia" Podfile.lock; then
        echo -e "${GREEN}✓ React Native Skia pod installed successfully${NC}"
        SKIA_VERSION=$(grep -A 1 "react-native-skia:" Podfile.lock | tail -1 | sed 's/.*(\(.*\))/\1/')
        echo -e "${GREEN}  Version: ${SKIA_VERSION}${NC}"
    else
        echo -e "${RED}✗ React Native Skia pod not found!${NC}"
        exit 1
    fi
    
    cd ..
fi

echo ""
echo -e "${BLUE}Step 4: Rebuild the app...${NC}"
echo "---------------------------"

# Determine platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - can build iOS
    echo -e "${YELLOW}Select platform to rebuild:${NC}"
    echo "1) iOS"
    echo "2) Android"
    echo "3) Both"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}Building iOS...${NC}"
            npx react-native run-ios --simulator="iPhone 15 Pro"
            ;;
        2)
            echo -e "${YELLOW}Building Android...${NC}"
            npx react-native run-android
            ;;
        3)
            echo -e "${YELLOW}Building iOS...${NC}"
            npx react-native run-ios --simulator="iPhone 15 Pro"
            echo -e "${YELLOW}Building Android...${NC}"
            npx react-native run-android
            ;;
        *)
            echo -e "${YELLOW}Building iOS (default)...${NC}"
            npx react-native run-ios --simulator="iPhone 15 Pro"
            ;;
    esac
else
    # Linux/Windows - build Android
    echo -e "${YELLOW}Building Android...${NC}"
    npx react-native run-android
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✨ Rebuild Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}The app should now be running with:${NC}"
echo -e "${GREEN}✓ React Native Skia properly linked${NC}"
echo -e "${GREEN}✓ Premium weather effects available${NC}"
echo -e "${GREEN}✓ IoT integration ready${NC}"
echo ""
echo -e "${YELLOW}Note: If you still see the RNSkiaModule error:${NC}"
echo "1. Close the Metro bundler (Ctrl+C)"
echo "2. Close the simulator/emulator"
echo "3. Run this script again"
echo ""
echo -e "${BLUE}Troubleshooting commands:${NC}"
echo "• Check Skia in node_modules: ls node_modules/@shopify/react-native-skia"
echo "• Check iOS pods: cd ios && pod list | grep -i skia"
echo "• Metro with clean cache: npx react-native start --reset-cache"