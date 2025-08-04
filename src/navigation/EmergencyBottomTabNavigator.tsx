import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { ReduxTestComponent } from '../components/test/ReduxTestComponent';
import { SupabaseTestComponent } from '../components/test/SupabaseTestComponent';
import { ThemeTestComponent } from '../components/test/ThemeTestComponent';
import { ScreenLoaderTest } from '../components/test/ScreenLoaderTest';
import { ThemeFallbackWrapper } from '../components/common/ThemeFallbackWrapper';

console.log('🚨 EmergencyBottomTabNavigator loading...');

const Tab = createBottomTabNavigator();

// Try to load the real screens
let ModernHomeScreenSafe: any = null;
let BuildScreenSafe: any = null;
let DiscoverScreenSafe: any = null;
let LibraryScreenSafe: any = null;
let ModernProfileScreenSafe: any = null;

try {
  ModernHomeScreenSafe = require('../screens/modern/ModernHomeScreenSafe').default;
  console.log('✅ ModernHomeScreenSafe loaded successfully');
} catch (error) {
  console.error('❌ Failed to load ModernHomeScreenSafe:', error);
}

try {
  BuildScreenSafe = require('../screens/modern/BuildScreenSafe').default;
  console.log('✅ BuildScreenSafe loaded successfully');
} catch (error) {
  console.error('❌ Failed to load BuildScreenSafe:', error);
}

try {
  DiscoverScreenSafe = require('../screens/modern/DiscoverScreenSafe').default;
  console.log('✅ DiscoverScreenSafe loaded successfully');
} catch (error) {
  console.error('❌ Failed to load DiscoverScreenSafe:', error);
}

try {
  LibraryScreenSafe = require('../screens/modern/LibraryScreenSafe').default;
  console.log('✅ LibraryScreenSafe loaded successfully');
} catch (error) {
  console.error('❌ Failed to load LibraryScreenSafe:', error);
}

try {
  ModernProfileScreenSafe = require('../screens/modern/ModernProfileScreenSafe').default;
  console.log('✅ ModernProfileScreenSafe loaded successfully');
} catch (error) {
  console.error('❌ Failed to load ModernProfileScreenSafe:', error);
}

// Emergency screens
const EmergencyScreen = ({ title }: { title: string }) => (
  <View style={styles.screen}>
    <Text style={styles.title}>🚨 {title}</Text>
    <Text style={styles.subtitle}>Emergency Mode Active</Text>
    <Text style={styles.info}>The app is recovering from a crash.</Text>
  </View>
);

// Test Dashboard Screen (can toggle to real HomeScreen)
const TestDashboard = () => {
  const [showRealHome, setShowRealHome] = useState(false);
  
  if (showRealHome && ModernHomeScreenSafe) {
    return (
      <ThemeFallbackWrapper 
        fallback={
          <View style={styles.screen}>
            <Text style={styles.title}>❌ HomeScreen Error</Text>
            <Text style={styles.subtitle}>Falling back to test dashboard</Text>
          </View>
        }
      >
        <ModernHomeScreenSafe />
      </ThemeFallbackWrapper>
    );
  }
  
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚨 System Recovery Dashboard</Text>
        <Text style={styles.headerSubtitle}>Testing core systems...</Text>
        
        {ModernHomeScreenSafe && (
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Show Real HomeScreen:</Text>
            <Switch 
              value={showRealHome} 
              onValueChange={setShowRealHome}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={showRealHome ? "#f5dd4b" : "#f4f3f4"}
            />
          </View>
        )}
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
};

// Use real HomeScreen with fallback
const HomeScreen = () => {
  if (ModernHomeScreenSafe) {
    return (
      <ThemeFallbackWrapper 
        fallback={
          <View style={styles.screen}>
            <Text style={styles.title}>❌ HomeScreen Error</Text>
            <Text style={styles.subtitle}>Unable to load HomeScreen</Text>
          </View>
        }
      >
        <ModernHomeScreenSafe />
      </ThemeFallbackWrapper>
    );
  }
  return <TestDashboard />;
};

const BuildScreen = () => {
  if (BuildScreenSafe) {
    return (
      <ThemeFallbackWrapper 
        fallback={<EmergencyScreen title="Build" />}
      >
        <BuildScreenSafe />
      </ThemeFallbackWrapper>
    );
  }
  return <EmergencyScreen title="Build" />;
};

const DiscoverScreen = () => {
  if (DiscoverScreenSafe) {
    return (
      <ThemeFallbackWrapper 
        fallback={<EmergencyScreen title="Discover" />}
      >
        <DiscoverScreenSafe />
      </ThemeFallbackWrapper>
    );
  }
  return <EmergencyScreen title="Discover" />;
};

const LibraryScreen = () => {
  if (LibraryScreenSafe) {
    return (
      <ThemeFallbackWrapper 
        fallback={<EmergencyScreen title="Library" />}
      >
        <LibraryScreenSafe />
      </ThemeFallbackWrapper>
    );
  }
  return <EmergencyScreen title="Library" />;
};

const ProfileScreen = () => {
  if (ModernProfileScreenSafe) {
    return (
      <ThemeFallbackWrapper 
        fallback={<EmergencyScreen title="Profile" />}
      >
        <ModernProfileScreenSafe />
      </ThemeFallbackWrapper>
    );
  }
  return <EmergencyScreen title="Profile" />;
};

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
          headerTitle: 'ZapTap'
        }} 
      />
      <Tab.Screen 
        name="BuildTab" 
        component={BuildScreen}
        options={{ 
          title: 'Build',
          headerTitle: 'Build'
        }} 
      />
      <Tab.Screen 
        name="DiscoverTab" 
        component={DiscoverScreen}
        options={{ 
          title: 'Discover',
          headerTitle: 'Discover'
        }} 
      />
      <Tab.Screen 
        name="LibraryTab" 
        component={LibraryScreen}
        options={{ 
          title: 'Library',
          headerTitle: 'My Library'
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerTitle: 'Profile'
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: 'white',
    marginRight: 10,
    fontWeight: '600',
  },
});