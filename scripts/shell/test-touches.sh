#!/bin/bash

# Touch Testing Suite for ShortcutsLike
# This script helps systematically test which component breaks touches

echo ""
echo "=================================="
echo "   TOUCH TESTING SUITE"
echo "=================================="
echo ""
echo "Current test sequence:"
echo "  0. Super Minimal (baseline - confirmed working)"
echo "  1. + GestureHandlerRootView"
echo "  2. + SafeAppWrapper"
echo "  3. + Redux Provider"
echo "  4. + Navigation Container"
echo "  5. + All Providers"
echo "  6. + WelcomeScreen (actual component)"
echo "  7. Full Original App"
echo ""
echo "Select which test to run:"
echo ""
echo "  [0] Super Minimal (working baseline)"
echo "  [1] Test 1: GestureHandlerRootView"
echo "  [2] Test 2: + SafeAppWrapper"
echo "  [3] Test 3: + Redux"
echo "  [4] Test 4: + Navigation"
echo "  [5] Test 5: All Providers"
echo "  [6] Test 6: WelcomeScreen"
echo "  [7] Original Full App"
echo "  [8] Diagnostic Test App"
echo ""
read -p "Select test (0-8): " choice

case $choice in
  0) 
    cp App-SuperMinimal.tsx App.tsx
    echo "✅ Switched to Super Minimal (baseline)"
    ;;
  1) 
    cp App-Test1-GestureHandler.tsx App.tsx
    echo "✅ Switched to Test 1: GestureHandlerRootView"
    ;;
  2) 
    cp App-Test2-SafeWrapper.tsx App.tsx
    echo "✅ Switched to Test 2: SafeAppWrapper"
    ;;
  3) 
    cp App-Test3-Redux.tsx App.tsx
    echo "✅ Switched to Test 3: Redux"
    ;;
  4) 
    cp App-Test4-Navigation.tsx App.tsx
    echo "✅ Switched to Test 4: Navigation"
    ;;
  5) 
    cp App-Test5-AllProviders.tsx App.tsx
    echo "✅ Switched to Test 5: All Providers"
    ;;
  6) 
    cp App-Test6-WelcomeScreen.tsx App.tsx
    echo "✅ Switched to Test 6: WelcomeScreen"
    ;;
  7) 
    cp App-Original-Backup.tsx App.tsx
    echo "✅ Restored Original Full App"
    ;;
  8) 
    cp App-DiagnosticTest.tsx App.tsx
    echo "✅ Switched to Diagnostic Test App"
    ;;
  *) 
    echo "❌ Invalid selection"
    exit 1
    ;;
esac

echo ""
echo "📱 Now reload the app in the iOS simulator:"
echo "   - Press 'r' in the Metro terminal"
echo "   - Or press Cmd+R in the simulator"
echo ""
echo "🧪 After testing, note if touches work or not"
echo "   Working = tap counter increases"
echo "   Not working = no response to taps"
echo ""