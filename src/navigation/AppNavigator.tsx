import React, { useRef, useEffect, useCallback } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { linkingService } from '../services/linking/LinkingService';
import { RootStackParamList } from './types';
import { MainNavigator } from './MainNavigator';

export const AppNavigator = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Initialize linking service when navigation is ready
  const onReady = useCallback(() => {
    if (navigationRef.current) {
      linkingService.initialize(navigationRef.current);
    }
  }, []);
  
  const linking = {
    prefixes: ['shortcuts-like://', 'https://shortcutslike.app'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            HomeTab: 'home',
            BuildTab: 'build',
            DiscoverTab: 'discover',
            LibraryTab: 'library',
            ProfileTab: 'profile',
          },
        },
        AutomationDetails: 'automation/:automationId',
        AutomationBuilder: 'build/:automationId?',
        WelcomeScreen: 'welcome',
        SignIn: 'signin',
        SignUp: 'signup',
      },
    },
  };

  return (
    <NavigationContainer 
      ref={navigationRef} 
      onReady={onReady}
      linking={linking}
    >
      <MainNavigator />
    </NavigationContainer>
  );
};