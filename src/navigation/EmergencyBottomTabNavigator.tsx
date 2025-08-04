import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ReduxTestComponent } from '../components/test/ReduxTestComponent';
import { SupabaseTestComponent } from '../components/test/SupabaseTestComponent';
import { ThemeTestComponent } from '../components/test/ThemeTestComponent';
import { ScreenLoaderTest } from '../components/test/ScreenLoaderTest';

console.log('🚨 EmergencyBottomTabNavigator loading...');

const Tab = createBottomTabNavigator();

// Emergency screens
const EmergencyScreen = ({ title }: { title: string }) => (
  <View style={styles.screen}>
    <Text style={styles.title}>🚨 {title}</Text>
    <Text style={styles.subtitle}>Emergency Mode Active</Text>
    <Text style={styles.info}>The app is recovering from a crash.</Text>
  </View>
);

// Enhanced Home Screen with System Tests
const HomeScreen = () => (
  <ScrollView style={styles.scrollView}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>🚨 System Recovery Dashboard</Text>
      <Text style={styles.headerSubtitle}>Testing core systems...</Text>
    </View>
    
    <ReduxTestComponent />
    <SupabaseTestComponent />
    <ThemeTestComponent />
    <ScreenLoaderTest />
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Check console logs for detailed debugging information
      </Text>
    </View>
  </ScrollView>
);
const BuildScreen = () => <EmergencyScreen title="Build" />;
const DiscoverScreen = () => <EmergencyScreen title="Discover" />;
const LibraryScreen = () => <EmergencyScreen title="Library" />;
const ProfileScreen = () => <EmergencyScreen title="Profile" />;

export const ModernBottomTabNavigator = () => {
  console.log('🚨 EmergencyBottomTabNavigator rendering...');
  
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'BuildTab':
              iconName = focused ? 'plus-circle' : 'plus-circle-outline';
              break;
            case 'DiscoverTab':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'LibraryTab':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'account-circle' : 'account-circle-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#ff6b6b',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        headerStyle: {
          backgroundColor: '#ff6b6b',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ 
          title: 'Home',
          headerTitle: 'Emergency Home'
        }} 
      />
      <Tab.Screen 
        name="BuildTab" 
        component={BuildScreen}
        options={{ 
          title: 'Build',
          headerTitle: 'Emergency Build'
        }} 
      />
      <Tab.Screen 
        name="DiscoverTab" 
        component={DiscoverScreen}
        options={{ 
          title: 'Discover',
          headerTitle: 'Emergency Discover'
        }} 
      />
      <Tab.Screen 
        name="LibraryTab" 
        component={LibraryScreen}
        options={{ 
          title: 'Library',
          headerTitle: 'Emergency Library'
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerTitle: 'Emergency Profile'
        }} 
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ff6b6b',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});