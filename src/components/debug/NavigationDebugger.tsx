import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useNavigationState } from '@react-navigation/native';
import { NavigationHelper } from '../../services/navigation/NavigationHelper';
import { useNavigationState as useCustomNavState } from '../../hooks/useNavigationState';

export const NavigationDebugger = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  
  const state = useNavigationState(state => state);
  
  // Use our custom navigation state hook for enhanced tracking
  const { 
    currentRoute: customCurrentRoute, 
    currentParams: customCurrentParams,
    previousRoute,
    navigationStack 
  } = useCustomNavState();
  
  useEffect(() => {
    // Get all available routes from navigation state
    const getAvailableRoutes = () => {
      const routes: string[] = [];
      
      // Add main stack routes
      const mainRoutes = [
        'MainTabs', 'EditProfile', 'Settings', 'Privacy', 'Help', 
        'SignIn', 'SignUp', 'ResetPassword', 'ChangePassword',
        'AutomationBuilder', 'AutomationDetails', 'Templates',
        'Scanner', 'LocationTriggers', 'ExecutionHistory', 'Reviews',
        'DeveloperMenu', 'ModernReviews', 'ModernComments',
        'WelcomeScreen', 'OnboardingFlow', 'TutorialScreen',
        'Terms', 'Docs', 'FAQ', 'EmailPreferences', 'PrivacyPolicy'
      ];
      
      routes.push(...mainRoutes);
      
      // Add tab routes
      const tabRoutes = ['HomeTab', 'BuildTab', 'DiscoverTab', 'LibraryTab', 'ProfileTab'];
      routes.push(...tabRoutes);
      
      setAvailableRoutes(routes);
    };
    
    getAvailableRoutes();
  }, [state]);
  
  const testNavigation = (routeName: string) => {
    try {
      NavigationHelper.navigate(routeName);
      console.log(`✅ Navigated to ${routeName}`);
    } catch (error) {
      console.error(`❌ Failed to navigate to ${routeName}:`, error);
    }
  };
  
  if (!__DEV__) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation Debug Info (Enhanced)</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Route:</Text>
        <Text style={styles.info}>React Nav: {route.name}</Text>
        <Text style={styles.info}>Tracker: {customCurrentRoute || 'None'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previous Route:</Text>
        <Text style={styles.info}>{previousRoute || 'None'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Params:</Text>
        <Text style={styles.info}>{JSON.stringify(customCurrentParams || route.params, null, 2)}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigation Stack:</Text>
        <Text style={styles.info}>{navigationStack.join(' → ')}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full State (collapsed):</Text>
        <ScrollView style={styles.stateScroll}>
          <Text style={[styles.info, { fontSize: 10 }]}>{JSON.stringify(state, null, 2)}</Text>
        </ScrollView>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Navigation:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableRoutes.map((routeName) => (
            <TouchableOpacity
              key={routeName}
              style={styles.button}
              onPress={() => testNavigation(routeName)}
            >
              <Text style={styles.buttonText}>{routeName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 10,
    borderRadius: 10,
    maxHeight: 300,
  },
  title: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  info: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  stateScroll: {
    maxHeight: 100,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 5,
    marginRight: 5,
    borderRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});