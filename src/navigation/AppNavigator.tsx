import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
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
  
  useEffect(() => {
    // Initialize linking service when navigation is ready
    if (navigationRef.current) {
      linkingService.initialize(navigationRef.current);
    }
  }, []);
  
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false, // We'll handle headers in sub-navigators
        }}
      >
        <Stack.Screen
          name="Home"
          component={MainNavigator}
          options={{ 
            title: APP_NAME,
            headerShown: true 
          }}
        />
        {!isAuthenticated && (
          <>
            <Stack.Screen
              name="SignIn"
              component={AuthNavigator}
              options={{ 
                title: 'Sign In',
                headerShown: true 
              }}
            />
            <Stack.Screen
              name="SignUp"
              component={AuthNavigator}
              options={{ 
                title: 'Sign Up',
                headerShown: true 
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};