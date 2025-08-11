#!/bin/bash

# Touch Testing Phase Switcher
# Usage: ./test-phase.sh [phase_number]

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Usage: ./test-phase.sh [phase_number]"
  echo "Available phases:"
  echo "  5 - Base working version (GestureHandler + Navigation + WelcomeScreen)"
  echo "  6 - Add SafeAreaProvider"
  echo "  7 - Add Redux Provider"
  echo "  8 - Add Paper Provider"
  echo "  9 - Use AppNavigator"
  echo "  full - Full app with all providers"
  exit 1
fi

case $PHASE in
  5)
    echo "🚀 Switching to Phase 5 (confirmed working)"
    cp App-Phase5-Working.tsx App.tsx
    ;;
  6)
    echo "🚀 Switching to Phase 6 (SafeAreaProvider)"
    cat > App.tsx << 'EOF'
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';

// PHASE 6 - ADDING SafeAreaProvider
// Testing if SafeAreaProvider blocks touches

export default function App() {
  console.log('🚀 Phase 6 - Testing SafeAreaProvider');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <WelcomeScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
EOF
    ;;
  7)
    echo "🚀 Switching to Phase 7 (Redux Provider)"
    cp App-Phase7-Redux.tsx App.tsx
    ;;
  8)
    echo "🚀 Switching to Phase 8 (Paper Provider)"
    cp App-Phase8-Paper.tsx App.tsx
    ;;
  9)
    echo "🚀 Switching to Phase 9 (AppNavigator)"
    cp App-Phase9-Navigator.tsx App.tsx
    ;;
  full)
    echo "🚀 Switching to Full App"
    cp App-Full.tsx App.tsx
    ;;
  *)
    echo "Invalid phase: $PHASE"
    exit 1
    ;;
esac

echo "✅ Switched to Phase $PHASE"
echo "📱 Now test if touches work on the device"