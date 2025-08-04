import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
// Temporarily comment out to avoid crashes
// import { linkingService } from '../services/linking/LinkingService';
import { RootStackParamList } from './types';
import { MainNavigator } from './MainNavigator';

console.log('🚨 AppNavigator loading...');

// Emergency fallback screen
const EmergencyScreen = () => (
  <View style={styles.emergency}>
    <Text style={styles.emergencyText}>Navigation Loading...</Text>
  </View>
);

export const AppNavigator = () => {
  console.log('🚨 AppNavigator rendering...');
  
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  
  try {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    console.log('🚨 Auth state:', isAuthenticated);
  } catch (error) {
    console.error('🚨 Redux selector error:', error);
  }
  
  // Initialize linking service when navigation is ready
  const onReady = useCallback(() => {
    console.log('🚨 Navigation ready');
    if (navigationRef.current) {
      // Temporarily disable linking service
      // linkingService.initialize(navigationRef.current);
    }
  }, []);
  
  const onError = useCallback((error: Error) => {
    console.error('🚨 Navigation error:', error);
  }, []);
  
  // Simplified linking config
  const linking = {
    prefixes: ['shortcuts-like://', 'https://shortcutslike.app'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            HomeTab: 'home',
          },
        },
      },
    },
  };

  try {
    return (
      <NavigationContainer 
        ref={navigationRef} 
        onReady={onReady}
        onError={onError}
        linking={linking}
        fallback={<EmergencyScreen />}
      >
        <MainNavigator />
      </NavigationContainer>
    );
  } catch (error) {
    console.error('🚨 NavigationContainer render error:', error);
    return <EmergencyScreen />;
  }
};

const styles = StyleSheet.create({
  emergency: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  emergencyText: {
    fontSize: 18,
    color: '#333',
  },
});