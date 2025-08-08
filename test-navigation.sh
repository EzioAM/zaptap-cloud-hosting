#!/bin/bash

# Navigation Test Script for ShortcutsLike App
# Tests that navigation is properly initialized and working

echo "🧭 Navigation Test for ShortcutsLike"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

echo "📝 Checking Navigation Setup..."
echo ""

# Check App.tsx has proper structure
if grep -q "AppNavigator" "App.tsx"; then
    print_status "success" "App.tsx uses AppNavigator"
else
    print_status "error" "App.tsx not using AppNavigator!"
fi

# Check for Redux Provider
if grep -q "ReduxProvider" "App.tsx"; then
    print_status "success" "Redux Provider configured"
else
    print_status "error" "Redux Provider missing!"
fi

# Check for GestureHandlerRootView
if grep -q "GestureHandlerRootView" "App.tsx"; then
    print_status "success" "GestureHandlerRootView present"
else
    print_status "error" "GestureHandlerRootView missing!"
fi

# Check AppNavigator uses native stack
if grep -q "createNativeStackNavigator" "src/navigation/AppNavigator.tsx"; then
    print_status "success" "AppNavigator uses native stack"
else
    print_status "error" "AppNavigator not using native stack!"
fi

# Check OnboardingFlow exists
if [ -f "src/screens/onboarding/OnboardingFlow.tsx" ]; then
    print_status "success" "OnboardingFlow component exists"
else
    print_status "error" "OnboardingFlow component missing!"
fi

# Check WelcomeScreen exists
if [ -f "src/screens/onboarding/WelcomeScreen.tsx" ]; then
    print_status "success" "WelcomeScreen component exists"
else
    print_status "error" "WelcomeScreen component missing!"
fi

echo ""
echo "🔧 Quick Fixes Applied:"
echo ""

# Apply critical navigation fixes
echo "1. Ensuring native stack navigator is used..."
if grep -q "createStackNavigator" "src/navigation/AppNavigator.tsx"; then
    sed -i '' 's/createStackNavigator/createNativeStackNavigator/g' src/navigation/AppNavigator.tsx
    sed -i '' 's/@react-navigation\/stack/@react-navigation\/native-stack/g' src/navigation/AppNavigator.tsx
    print_status "success" "Fixed stack navigator type"
else
    print_status "success" "Stack navigator already correct"
fi

echo ""
echo "📱 Testing Instructions:"
echo "------------------------"
echo ""
echo "1. Clear Metro cache and restart:"
echo "   npx react-native start --reset-cache"
echo ""
echo "2. Run on iOS:"
echo "   npm run ios"
echo ""
echo "3. Test these navigation flows:"
echo "   ✓ Tap 'Get Started' → Should open OnboardingFlow"
echo "   ✓ Tap 'Skip' → Should complete onboarding"
echo "   ✓ Complete onboarding → Should show main tabs"
echo ""
echo "4. Check console for these logs:"
echo "   ✓ '🚀 App initialized with full navigation'"
echo "   ✓ '📱 OnboardingNavigator rendering'"
echo "   ✓ No navigation errors"
echo ""

echo "🎯 Expected Behavior:"
echo "--------------------"
echo "• App loads with loading screen briefly"
echo "• Shows WelcomeScreen if first time"
echo "• Navigation to OnboardingFlow works"
echo "• Skip button completes onboarding"
echo "• Main tabs appear after onboarding"
echo ""

print_status "success" "Navigation test complete!"
echo ""
echo "If navigation still fails, run:"
echo "  ./quick-start.sh ios --clean"
