#!/bin/bash

# Fix Missing @react-native/metro-config and Start App
# This script fixes the metro config issue and starts the app

echo "🔧 Fixing Metro Config and Starting App"
echo "======================================="
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

# Step 1: Kill existing processes
echo "Step 1: Cleaning up existing processes..."
lsof -ti:8081 | xargs kill -9 2>/dev/null
pkill -f metro 2>/dev/null
pkill -f expo 2>/dev/null
print_success "Processes cleaned"

# Step 2: Clear caches
echo ""
echo "Step 2: Clearing caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null
watchman watch-del-all 2>/dev/null || true
print_success "Caches cleared"

# Step 3: Check if we need to install @react-native/metro-config
echo ""
echo "Step 3: Checking dependencies..."
if [ ! -d "node_modules/@react-native/metro-config" ]; then
    print_warning "@react-native/metro-config not found"
    print_info "Installing missing package..."
    npm install @react-native/metro-config --save-dev
    print_success "Package installed"
else
    print_success "@react-native/metro-config already installed"
fi

# Step 4: Verify metro.config.js
echo ""
echo "Step 4: Verifying Metro configuration..."
if [ -f "metro.config.js" ]; then
    print_success "metro.config.js exists"
else
    print_warning "metro.config.js missing - creating..."
    cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['browser', 'require', 'react-native'],
};

module.exports = config;
EOF
    print_success "metro.config.js created"
fi

# Step 5: Start the server
echo ""
echo "Step 5: Starting Expo server..."
echo ""
echo "========================================="
echo "📱 Expo Development Server Starting"
echo "========================================="
echo ""
echo "Options:"
echo "  • Press 'i' to run on iOS"
echo "  • Press 'a' to run on Android"
echo "  • Press 'r' to reload"
echo "  • Press 'd' for developer menu"
echo "  • Press 'Ctrl+C' to stop"
echo ""
echo "========================================="
echo ""

# Start Expo
npx expo start --dev-client --clear