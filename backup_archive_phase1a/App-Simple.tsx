import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

console.log('🚨 App-Simple starting...');

const Tab = createBottomTabNavigator();

// Simple test screens
const HomeScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>✅ App is Working!</Text>
    <Text style={styles.subtitle}>Navigation: OK</Text>
    <Text style={styles.info}>The white screen issue has been fixed.</Text>
  </View>
);

const BuildScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Build Screen</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Profile Screen</Text>
  </View>
);

export default function App() {
  console.log('🚨 App-Simple rendering...');
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color }) => {
              let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home';
              
              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Build') {
                iconName = focused ? 'plus-circle' : 'plus-circle-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'account-circle' : 'account-circle-outline';
              }
              
              return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
            },
            tabBarActiveTintColor: '#6200ee',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Build" component={BuildScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
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
});