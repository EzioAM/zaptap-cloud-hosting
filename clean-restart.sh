#!/bin/bash

# Clean Restart Script for ShortcutsLike App
# Completely clears cache and restarts with fixed navigation

echo "🔄 ShortcutsLike Clean Restart"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Kill any running Metro processes
print_info "Stopping any running Metro bundlers..."
pkill -f "react-native.*metro" 2>/dev/null || true
pkill -f "node.*metro" 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
print_success "Metro processes stopped"

# Step 2: Clear all caches
print_info "Clearing all caches..."

# Clear Metro cache
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true

# Clear React Native cache
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear node modules cache
npm cache clean --force 2>/dev/null || true

# Clear watchman
watchman watch-del-all 2>/dev/null || true

print_success "All caches cleared"

# Step 3: Reset iOS simulator (optional)
read -p "Reset iOS Simulator? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Resetting iOS Simulator..."
    xcrun simctl shutdown all
    xcrun simctl erase all
    print_success "iOS Simulator reset"
fi

# Step 4: Reinstall dependencies (optional)
read -p "Reinstall node_modules? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Reinstalling dependencies..."
    rm -rf node_modules
    npm install
    
    # iOS specific
    cd ios
    rm -rf Pods Podfile.lock
    pod install
    cd ..
    print_success "Dependencies reinstalled"
fi

# Step 5: Start Metro with reset cache
print_info "Starting Metro bundler with clean cache..."
npx react-native start --reset-cache &
METRO_PID=$!

# Wait for Metro to start
sleep 5

# Step 6: Run the app
echo ""
print_info "Select platform to run:"
echo "1) iOS"
echo "2) Android"
echo "3) Both"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        print_info "Starting iOS app..."
        npx react-native run-ios --simulator="iPhone 15"
        ;;
    2)
        print_info "Starting Android app..."
        npx react-native run-android
        ;;
    3)
        print_info "Starting both platforms..."
        npx react-native run-ios --simulator="iPhone 15" &
        npx react-native run-android
        ;;
    *)
        print_warning "Invalid choice, starting iOS by default..."
        npx react-native run-ios --simulator="iPhone 15"
        ;;
esac

echo ""
print_success "App restarted with clean state!"
echo ""
echo "📱 Test Navigation:"
echo "  1. App should load with loading screen"
echo "  2. WelcomeScreen should appear"
echo "  3. 'Get Started' button should work"
echo "  4. 'Skip' button should work"
echo "  5. Navigation should be smooth"
echo ""
echo "Metro PID: $METRO_PID"
echo "To stop Metro: kill $METRO_PID"
echo ""
print_info "If issues persist, check logs above for errors"
