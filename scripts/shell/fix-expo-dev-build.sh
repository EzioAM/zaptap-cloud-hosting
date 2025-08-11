#!/bin/bash

# Complete Fix for Expo Development Build Issues
# Fixes port conflicts, manifest loading, and development client issues

echo "🚀 Complete Expo Development Build Fix"
echo "======================================"
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

# Step 1: Kill ALL conflicting processes
echo "Step 1: Clearing All Conflicting Processes"
echo "------------------------------------------"

print_info "Stopping all Metro/Expo processes..."

# Kill processes on port 8081
lsof -ti:8081 | xargs kill -9 2>/dev/null
print_success "Cleared port 8081"

# Kill all Metro related processes
pkill -f metro 2>/dev/null
pkill -f "react-native" 2>/dev/null
pkill -f expo 2>/dev/null
pkill -f packager 2>/dev/null
print_success "Stopped all Metro/Expo processes"

# Step 2: Clear ALL caches
echo ""
echo "Step 2: Clearing All Caches"
echo "---------------------------"

print_info "Clearing caches..."

# Metro cache
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf $TMPDIR/react-* 2>/dev/null

# Expo cache
rm -rf .expo 2>/dev/null
rm -rf ~/.expo 2>/dev/null

# Watchman
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null
fi

# Node modules cache
npm cache clean --force 2>/dev/null

print_success "All caches cleared"

# Step 3: Fix app.json for development builds
echo ""
echo "Step 3: Verifying App Configuration"
echo "-----------------------------------"

# Check if app.json exists
if [ ! -f "app.json" ]; then
    print_info "Creating app.json..."
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
    print_success "Created app.json"
else
    print_success "app.json exists"
fi

# Step 4: Start Expo with proper configuration
echo ""
echo "Step 4: Starting Expo Development Server"
echo "----------------------------------------"

print_info "Starting Expo with development client support..."

# Start Expo in development client mode
EXPO_NO_TELEMETRY=1 npx expo start --dev-client --clear &
EXPO_PID=$!

print_info "Waiting for server to start (PID: $EXPO_PID)..."
sleep 10

# Check if server is running
if ps -p $EXPO_PID > /dev/null; then
    print_success "Expo dev server is running"
    
    # Check if responding
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        print_success "Server is responding on http://localhost:8081"
    else
        print_warning "Server may still be initializing..."
    fi
else
    print_error "Failed to start Expo dev server"
    exit 1
fi

# Step 5: Get connection options
echo ""
echo "Step 5: Connection Options"
echo "--------------------------"

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

echo ""
print_success "Development server is running!"
echo ""
echo "📱 Connection URLs:"
echo "  Local:    http://localhost:8081"
echo "  Network:  http://$LOCAL_IP:8081"
echo ""
echo "📲 In your app (if it shows connection error):"
echo "  1. Shake the device to open developer menu"
echo "  2. Tap 'Configure Bundler'"
echo "  3. Enter: $LOCAL_IP"
echo "  4. Port: 8081"
echo "  5. Tap 'Reload'"
echo ""
echo "🔧 Alternative fixes if still not working:"
echo "  1. Try tunnel mode: npx expo start --tunnel"
echo "  2. Rebuild the app: npx expo run:ios"
echo "  3. Clear app data and reinstall"
echo ""
echo "📝 Commands:"
echo "  Press 'r' to reload"
echo "  Press 'd' to open developer menu"
echo "  Press 'i' to run on iOS"
echo "  Press 'a' to run on Android"
echo ""
print_info "Server PID: $EXPO_PID (kill $EXPO_PID to stop)"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""

# Keep the script running to show logs
wait $EXPO_PID
