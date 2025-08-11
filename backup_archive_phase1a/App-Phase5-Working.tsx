import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';

// PHASE 5 CONFIGURATION - CONFIRMED WORKING BY USER
// This exact configuration was tested and touches work properly

export default function App() {
  console.log('🚀 Phase 5 - CONFIRMED WORKING VERSION');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <WelcomeScreen />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}