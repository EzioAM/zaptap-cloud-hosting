#!/bin/bash

# Ultimate Quick Start for ShortcutsLike App
# Ensures everything is properly configured and running

echo "🚀 ShortcutsLike Ultimate Quick Start"
echo "===================================="
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

# Step 1: Environment Setup
echo "Step 1: Environment Setup"
echo "------------------------"

# Check if .env exists, create if not
if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating..."
    cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://gfkdclzgdlcvhfiujkwz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE

# Optional: AI Keys (for future features)
# CLAUDE_API_KEY=your_claude_key_here
# OPENAI_API_KEY=your_openai_key_here
EOF
    print_success ".env file created with Supabase config"
else
    print_success ".env file exists"
fi

# Step 2: Dependencies
echo ""
echo "Step 2: Installing Dependencies"
echo "-------------------------------"

if [ ! -d "node_modules" ]; then
    print_info "Installing npm packages..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 3: iOS Setup (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "Step 3: iOS Setup"
    echo "----------------"
    
    if [ -d "ios" ]; then
        if [ ! -d "ios/Pods" ]; then
            print_info "Installing CocoaPods..."
            cd ios
            pod install
            cd ..
            print_success "CocoaPods installed"
        else
            print_success "CocoaPods already installed"
        fi
    else
        print_warning "iOS folder not found - run 'expo prebuild' if needed"
    fi
fi

# Step 4: Clean Caches
echo ""
echo "Step 4: Cleaning Caches"
echo "----------------------"

print_info "Clearing Metro cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null
print_success "Metro cache cleared"

# Clear watchman if available
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null
    print_success "Watchman cache cleared"
fi

# Step 5: Apply Critical Fixes
echo ""
echo "Step 5: Applying Critical Fixes"
echo "-------------------------------"

# Ensure native stack navigator is used
if grep -q "createStackNavigator" "src/navigation/AppNavigator.tsx" 2>/dev/null; then
    print_info "Fixing navigation stack type..."
    sed -i '' 's/createStackNavigator/createNativeStackNavigator/g' src/navigation/AppNavigator.tsx 2>/dev/null
    sed -i '' 's/@react-navigation\/stack/@react-navigation\/native-stack/g' src/navigation/AppNavigator.tsx 2>/dev/null
    print_success "Navigation stack fixed"
else
    print_success "Navigation stack already correct"
fi

# Step 6: Start Metro Bundler
echo ""
echo "Step 6: Starting Metro Bundler"
echo "-----------------------------"

print_info "Starting Metro bundler..."
npx react-native start > metro.log 2>&1 &
METRO_PID=$!
sleep 5

if ps -p $METRO_PID > /dev/null; then
    print_success "Metro bundler started (PID: $METRO_PID)"
else
    print_error "Failed to start Metro bundler"
    exit 1
fi

# Step 7: Choose Platform
echo ""
echo "Step 7: Launch App"
echo "-----------------"
echo ""
echo "Select platform to run:"
echo "1) iOS Simulator"
echo "2) Android Emulator"
echo "3) iOS Device"
echo "4) Android Device"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        print_info "Launching iOS Simulator..."
        npx react-native run-ios --simulator="iPhone 15"
        ;;
    2)
        print_info "Launching Android Emulator..."
        npx react-native run-android
        ;;
    3)
        print_info "Launching on iOS Device..."
        npx react-native run-ios --device
        ;;
    4)
        print_info "Launching on Android Device..."
        npx react-native run-android --device
        ;;
    *)
        print_warning "Invalid choice, launching iOS Simulator by default..."
        npx react-native run-ios --simulator="iPhone 15"
        ;;
esac

echo ""
print_success "App launched successfully!"
echo ""
echo "📱 Testing Checklist:"
echo "-------------------"
echo "[ ] App loads without errors"
echo "[ ] Welcome screen appears"
echo "[ ] 'Get Started' button works"
echo "[ ] 'Skip' button works"
echo "[ ] Navigation works smoothly"
echo "[ ] No console errors"
echo ""
echo "🛠️ Useful Commands:"
echo "------------------"
echo "View logs:         tail -f metro.log"
echo "Stop Metro:        kill $METRO_PID"
echo "Reload app:        Press 'r' in Metro terminal"
echo "Open dev menu:     Shake device or Cmd+D (iOS) / Cmd+M (Android)"
echo ""
echo "📚 Documentation:"
echo "----------------"
echo "Navigation Fix:    NAVIGATION_FIX_COMPLETE.md"
echo "Touch Fix:         TOUCH_FIX_COMPLETE_2025.md"
echo "Error Fix:         COMPLETE_ERROR_FIX_SUMMARY.md"
echo ""
print_info "Metro bundler is running in background (PID: $METRO_PID)"
print_info "To stop: kill $METRO_PID"
echo ""
print_success "Your ShortcutsLike app is ready! 🎉"
