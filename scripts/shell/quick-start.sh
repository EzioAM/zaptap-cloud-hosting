#!/bin/bash

# Quick Start Script for ShortcutsLike App with Touch Fixes
# This script helps you quickly build and run the app with all touch fixes applied

echo "🚀 ShortcutsLike Quick Start with Touch Fixes"
echo "============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in the ShortcutsLike project directory!"
    exit 1
fi

# Parse command line arguments
PLATFORM=""
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        ios|iOS|IOS)
            PLATFORM="ios"
            shift
            ;;
        android|Android|ANDROID)
            PLATFORM="android"
            shift
            ;;
        --clean|-c)
            CLEAN=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./quick-start.sh [platform] [options]"
            echo ""
            echo "Platforms:"
            echo "  ios      - Build and run on iOS"
            echo "  android  - Build and run on Android"
            echo ""
            echo "Options:"
            echo "  --clean  - Clean build before running"
            echo "  --help   - Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./quick-start.sh ios"
            echo "  ./quick-start.sh android --clean"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If no platform specified, ask
if [ -z "$PLATFORM" ]; then
    echo "Which platform would you like to run?"
    echo "1) iOS"
    echo "2) Android"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            PLATFORM="ios"
            ;;
        2)
            PLATFORM="android"
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo ""
print_info "Platform: $PLATFORM"
print_info "Clean build: $CLEAN"
echo ""

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 2: Clean if requested
if [ "$CLEAN" = true ]; then
    print_info "Cleaning build artifacts..."
    
    # Clean Metro cache
    npx react-native start --reset-cache &
    METRO_PID=$!
    sleep 3
    kill $METRO_PID 2>/dev/null
    
    if [ "$PLATFORM" = "ios" ]; then
        # Clean iOS build
        print_info "Cleaning iOS build..."
        cd ios
        rm -rf build
        rm -rf ~/Library/Developer/Xcode/DerivedData/*
        pod deintegrate
        pod install
        cd ..
        print_success "iOS build cleaned"
    else
        # Clean Android build
        print_info "Cleaning Android build..."
        cd android
        ./gradlew clean
        cd ..
        print_success "Android build cleaned"
    fi
fi

# Step 3: Apply critical touch fixes verification
print_info "Verifying touch fixes are applied..."

# Check for native stack navigator
if grep -q "createNativeStackNavigator" "src/navigation/AppNavigator.tsx"; then
    print_success "Native stack navigator is configured"
else
    print_warning "AppNavigator may not have the touch fix applied!"
    echo "  Applying fix now..."
    sed -i '' 's/createStackNavigator/createNativeStackNavigator/g' src/navigation/AppNavigator.tsx
    sed -i '' 's/@react-navigation\/stack/@react-navigation\/native-stack/g' src/navigation/AppNavigator.tsx
    print_success "Touch fix applied to AppNavigator"
fi

# Step 4: Start Metro bundler in background
print_info "Starting Metro bundler..."
npx react-native start --reset-cache > metro.log 2>&1 &
METRO_PID=$!
sleep 5

# Step 5: Run the app
echo ""
print_info "Building and running the app..."
echo ""

if [ "$PLATFORM" = "ios" ]; then
    # iOS specific setup
    print_info "Checking iOS setup..."
    
    # Check if pods are installed
    if [ ! -d "ios/Pods" ]; then
        print_info "Installing CocoaPods..."
        cd ios
        pod install
        cd ..
    fi
    
    # Run iOS app
    print_info "Launching iOS app..."
    npx react-native run-ios --simulator="iPhone 15"
    
    echo ""
    print_success "iOS app launched!"
    echo ""
    echo "📱 Test these touch interactions:"
    echo "  1. Tap 'Get Started' button on welcome screen"
    echo "  2. Tap 'Skip' button"
    echo "  3. Try scrolling the screen"
    echo "  4. Test all tab bar icons"
    echo ""
else
    # Android specific setup
    print_info "Checking Android setup..."
    
    # Check if Android emulator is running
    if ! adb devices | grep -q "emulator\|device$"; then
        print_warning "No Android device/emulator detected"
        echo "Please start an Android emulator or connect a device"
        echo ""
        echo "To start an emulator:"
        echo "  emulator -avd <AVD_NAME>"
        echo ""
        read -p "Press Enter when device is ready..."
    fi
    
    # Run Android app
    print_info "Launching Android app..."
    npx react-native run-android
    
    echo ""
    print_success "Android app launched!"
    echo ""
    echo "📱 Test these touch interactions:"
    echo "  1. Tap 'Get Started' button on welcome screen"
    echo "  2. Tap 'Skip' button"
    echo "  3. Try scrolling the screen"
    echo "  4. Test all tab bar icons"
    echo "  5. Test Android back button"
    echo ""
fi

# Step 6: Monitor logs
echo "--------------------------------------------"
echo "Metro bundler is running (PID: $METRO_PID)"
echo "Logs are being saved to: metro.log"
echo ""
echo "Useful commands:"
echo "  View logs:        tail -f metro.log"
echo "  Stop Metro:       kill $METRO_PID"
echo "  Reload app:       Press 'r' in Metro terminal"
echo "  Open dev menu:    Shake device or Cmd+D (iOS) / Cmd+M (Android)"
echo ""
echo "If touches don't work, run: ./test-touch-functionality.sh"
echo ""
print_success "App is running! Test the touch functionality now."
