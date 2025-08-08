#!/bin/bash

# Touch Functionality Test Script for ShortcutsLike App
# This script helps verify that all touch interactions are working properly

echo "🔧 ShortcutsLike Touch Functionality Test"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    else
        echo "$2"
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "error" "Not in the ShortcutsLike project directory!"
    echo "Please run this script from the project root."
    exit 1
fi

echo "📱 Touch Test Checklist"
echo "----------------------"
echo ""

# Step 1: Clear cache
echo "Step 1: Clearing Metro cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 5
kill $METRO_PID 2>/dev/null
print_status "success" "Metro cache cleared"
echo ""

# Step 2: Check critical files
echo "Step 2: Verifying critical files..."

# Check App.tsx has GestureHandlerRootView
if grep -q "GestureHandlerRootView" "App.tsx"; then
    print_status "success" "App.tsx has GestureHandlerRootView"
else
    print_status "error" "App.tsx missing GestureHandlerRootView!"
fi

# Check index.js imports gesture handler
if grep -q "react-native-gesture-handler" "index.js"; then
    print_status "success" "index.js imports gesture handler"
else
    print_status "error" "index.js missing gesture handler import!"
fi

# Check AppNavigator uses native stack
if grep -q "createNativeStackNavigator" "src/navigation/AppNavigator.tsx"; then
    print_status "success" "AppNavigator uses createNativeStackNavigator"
else
    print_status "error" "AppNavigator not using createNativeStackNavigator!"
fi

# Check SafeAppWrapper has pointerEvents
if grep -q 'pointerEvents="box-none"' "src/utils/SafeAppWrapper.tsx"; then
    print_status "success" "SafeAppWrapper has proper pointerEvents"
else
    print_status "warning" "SafeAppWrapper may be blocking touches"
fi

echo ""

# Step 3: Build and run instructions
echo "Step 3: Build and Test Instructions"
echo "-----------------------------------"
echo ""
echo "For iOS:"
echo "  1. Run: npm run ios"
echo "  2. Once the app opens, test these interactions:"
echo "     - Tap 'Get Started' button"
echo "     - Tap 'Skip' button"
echo "     - Try scrolling up and down"
echo "     - Test all tab bar icons"
echo ""
echo "For Android:"
echo "  1. Run: npm run android"
echo "  2. Test the same interactions as iOS"
echo ""

# Step 4: Manual test checklist
echo "Step 4: Manual Test Checklist"
echo "-----------------------------"
echo ""
echo "Please verify each of these work correctly:"
echo ""
echo "[ ] Welcome Screen"
echo "    [ ] 'Get Started' button responds to tap"
echo "    [ ] 'Skip' button responds to tap"
echo "    [ ] Feature cards show visual feedback on tap"
echo "    [ ] Screen scrolls smoothly"
echo ""
echo "[ ] Navigation"
echo "    [ ] Transitions between screens are smooth"
echo "    [ ] Back gesture works (iOS)"
echo "    [ ] Back button works (Android)"
echo ""
echo "[ ] Tab Bar"
echo "    [ ] Home tab is tappable"
echo "    [ ] Build tab is tappable"
echo "    [ ] Discover tab is tappable"
echo "    [ ] Library tab is tappable"
echo "    [ ] Profile tab is tappable"
echo "    [ ] Active indicator appears on selected tab"
echo ""
echo "[ ] General Touch Responsiveness"
echo "    [ ] No delay between tap and response"
echo "    [ ] No ghost clicks or double taps"
echo "    [ ] Touch feedback (opacity/scale) works"
echo "    [ ] Haptic feedback works (if device supports)"
echo ""

# Step 5: Troubleshooting
echo "Step 5: Troubleshooting"
echo "-----------------------"
echo ""
echo "If touches still don't work:"
echo ""
echo "1. Clean build:"
echo "   iOS: rm -rf ios/build && cd ios && pod install"
echo "   Android: cd android && ./gradlew clean"
echo ""
echo "2. Reset everything:"
echo "   npx react-native-clean-project"
echo ""
echo "3. Check for conflicting gesture handlers:"
echo "   grep -r 'GestureHandlerRootView' src/"
echo "   (Should only be in App.tsx)"
echo ""
echo "4. Verify React Native version compatibility:"
echo "   npm ls react-native-gesture-handler"
echo "   npm ls @react-navigation/native-stack"
echo ""

# Step 6: Quick diagnostic
echo "Step 6: Running Quick Diagnostic"
echo "--------------------------------"
echo ""

# Check for multiple GestureHandlerRootView instances
GESTURE_COUNT=$(grep -r "GestureHandlerRootView" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
if [ "$GESTURE_COUNT" -eq 1 ]; then
    print_status "success" "Single GestureHandlerRootView found (correct)"
elif [ "$GESTURE_COUNT" -gt 1 ]; then
    print_status "warning" "Multiple GestureHandlerRootView instances found ($GESTURE_COUNT)"
    echo "  This might cause touch issues. Check:"
    grep -r "GestureHandlerRootView" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".git"
else
    print_status "error" "No GestureHandlerRootView found!"
fi

# Check package.json for correct dependencies
if grep -q '"react-native-gesture-handler"' "package.json"; then
    print_status "success" "react-native-gesture-handler is installed"
else
    print_status "error" "react-native-gesture-handler not found in package.json"
fi

if grep -q '"@react-navigation/native-stack"' "package.json"; then
    print_status "success" "@react-navigation/native-stack is installed"
else
    print_status "error" "@react-navigation/native-stack not found in package.json"
fi

echo ""
echo "========================================="
print_status "success" "Diagnostic complete!"
echo ""
echo "Next steps:"
echo "1. Run the app: npm start"
echo "2. Test on device/simulator"
echo "3. Use the manual checklist above"
echo ""
echo "If all tests pass, your touch functionality is working correctly! 🎉"
