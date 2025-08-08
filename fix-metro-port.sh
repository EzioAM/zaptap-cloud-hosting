#!/bin/bash

# Fix Metro Port Conflict and Start App
# Resolves port 8081 conflicts and manifest loading issues

echo "🔧 Fixing Metro Port Conflict and Starting App"
echo "============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Kill all processes using port 8081
echo "Step 1: Clearing Port 8081"
echo "--------------------------"

# Find and kill processes on port 8081
print_info "Finding processes on port 8081..."
PIDS=$(lsof -ti:8081)
if [ ! -z "$PIDS" ]; then
    print_warning "Found processes on port 8081: $PIDS"
    for PID in $PIDS; do
        kill -9 $PID 2>/dev/null && print_success "Killed process $PID"
    done
else
    print_success "Port 8081 is already free"
fi

# Step 2: Kill any Metro bundler processes
echo ""
echo "Step 2: Stopping Metro Bundlers"
echo "-------------------------------"

# Kill Metro processes
print_info "Stopping any running Metro bundlers..."
pkill -f "react-native.*metro" 2>/dev/null && print_success "Killed react-native metro"
pkill -f "node.*metro" 2>/dev/null && print_success "Killed node metro"
pkill -f "expo start" 2>/dev/null && print_success "Killed expo start"

# Step 3: Clear Metro cache
echo ""
echo "Step 3: Clearing Metro Cache"
echo "----------------------------"

print_info "Clearing Metro cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-map-* 2>/dev/null
rm -rf $TMPDIR/react-* 2>/dev/null
print_success "Metro cache cleared"

# Clear watchman if available
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null
    print_success "Watchman cache cleared"
fi

# Step 4: Clear Expo cache
echo ""
echo "Step 4: Clearing Expo Cache"
echo "---------------------------"

print_info "Clearing Expo cache..."
rm -rf .expo 2>/dev/null
rm -rf ~/.expo 2>/dev/null
npx expo start --clear 2>/dev/null &
sleep 2
pkill -f "expo start" 2>/dev/null
print_success "Expo cache cleared"

# Step 5: Verify port is free
echo ""
echo "Step 5: Verifying Port Status"
echo "-----------------------------"

PIDS=$(lsof -ti:8081)
if [ -z "$PIDS" ]; then
    print_success "Port 8081 is free and ready"
else
    print_error "Port 8081 is still in use by PIDs: $PIDS"
    print_info "Forcing kill..."
    for PID in $PIDS; do
        kill -9 $PID 2>/dev/null
    done
    sleep 2
fi

# Step 6: Start Metro bundler with Expo
echo ""
echo "Step 6: Starting Expo Dev Server"
echo "--------------------------------"

print_info "Starting Expo with cleared cache..."
npx expo start --clear --dev-client &
EXPO_PID=$!

# Wait for Metro to start
print_info "Waiting for Metro to start..."
sleep 8

# Check if Metro started successfully
if ps -p $EXPO_PID > /dev/null; then
    print_success "Expo dev server started (PID: $EXPO_PID)"
    
    # Wait a bit more for the server to be ready
    sleep 5
    
    # Check if the server is responding
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        print_success "Metro bundler is responding on port 8081"
    else
        print_warning "Metro bundler may still be starting..."
    fi
else
    print_error "Failed to start Expo dev server"
    print_info "Trying alternative start method..."
    npm start -- --clear &
    EXPO_PID=$!
    sleep 8
fi

echo ""
echo "Step 7: Launch App Options"
echo "--------------------------"
echo ""
echo "The Expo dev server is now running."
echo ""
echo "Choose how to proceed:"
echo "1) Open app on iOS Simulator (if already installed)"
echo "2) Build and run on iOS Simulator"
echo "3) Open app on Android Emulator (if already installed)"
echo "4) Build and run on Android Emulator"
echo "5) Just keep Metro running"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        print_info "Opening app on iOS Simulator..."
        npx expo run:ios --no-build-cache
        ;;
    2)
        print_info "Building and running on iOS Simulator..."
        npx expo run:ios
        ;;
    3)
        print_info "Opening app on Android Emulator..."
        npx expo run:android --no-build-cache
        ;;
    4)
        print_info "Building and running on Android Emulator..."
        npx expo run:android
        ;;
    5)
        print_info "Metro bundler is running in background"
        ;;
    *)
        print_info "Metro bundler is running in background"
        ;;
esac

echo ""
echo "============================================="
print_success "Setup Complete!"
echo ""
echo "📱 Dev Server Info:"
echo "  URL: http://localhost:8081"
echo "  PID: $EXPO_PID"
echo ""
echo "🛠️ Useful Commands:"
echo "  View logs:       tail -f ~/.expo/packager-info.json"
echo "  Stop server:     kill $EXPO_PID"
echo "  Restart:         ./fix-metro-port.sh"
echo "  Open dev menu:   Shake device or Cmd+D (iOS) / Cmd+M (Android)"
echo ""
echo "📝 If app shows 'Failed to load' error:"
echo "  1. Press 'r' in the terminal to reload"
echo "  2. Or shake device and tap 'Reload'"
echo "  3. Or run: npx expo start --tunnel"
echo ""
print_info "Metro bundler PID: $EXPO_PID"
