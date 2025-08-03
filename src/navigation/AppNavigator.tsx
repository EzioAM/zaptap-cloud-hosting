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
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user has seen onboarding
    checkOnboardingStatus();
    
    // Initialize linking service when navigation is ready
    if (navigationRef.current) {
      linkingService.initialize(navigationRef.current);
    }
  }, []);
  
  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(hasSeenOnboarding === 'true');
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };
  
  // Don't render until we know onboarding status
  if (hasSeenOnboarding === null) {
    return null; // Or a loading screen
  }
  
  return (
    <NavigationContainer ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};