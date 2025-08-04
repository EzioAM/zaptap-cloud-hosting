import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store';
import { linkingService } from '../services/linking/LinkingService';
import { RootStackParamList } from './types';
import { MainNavigator } from './MainNavigator';
import { AuthNavigator } from './AuthNavigator';
import { APP_NAME } from '../constants/version';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false); // Default to false
  
  useEffect(() => {
    // Initialize linking service when navigation is ready
    if (navigationRef.current) {
      linkingService.initialize(navigationRef.current);
    }
    
    // Check onboarding status asynchronously - don't block rendering
    checkOnboardingStatus();
  }, []);
  
  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(hasSeenOnboarding === 'true');
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Keep default false - user will see onboarding
    }
  };
  
  // Always render - don't block on AsyncStorage
  
  return (
    <NavigationContainer ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};