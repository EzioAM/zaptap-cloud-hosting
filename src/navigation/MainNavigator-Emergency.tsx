import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button } from 'react-native';
import { RootStackParamList } from './types';

console.log('🚨 MainNavigator-Emergency loading...');

const Stack = createNativeStackNavigator<RootStackParamList>();

// Emergency home screen
const EmergencyHomeScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
      🚨 Emergency Navigation
    </Text>
    <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 }}>
      The app is running in emergency mode.
      Navigation is working but simplified.
    </Text>
    <Button title="Test Navigation" onPress={() => console.log('Navigation test')} />
  </View>
);

export const MainNavigator = () => {
  console.log('🚨 MainNavigator-Emergency rendering...');
  
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff6b6b',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={EmergencyHomeScreen}
        options={{ 
          title: 'Emergency Mode',
          headerShown: true 
        }}
      />
    </Stack.Navigator>
  );
};