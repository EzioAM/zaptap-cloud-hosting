import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, useNavigationState } from '@react-navigation/native';
import { EventLogger } from '../../utils/EventLogger';

export const NavigationDebug: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const state = useNavigationState(state => state);
  
  useEffect(() => {
    EventLogger.debug('NavigationDebug', 'Current route:', {
      name: route.name,
      params: route.params,
    });
  }, [route]);

  const testNavigation = (screenName: string) => {
    try {
      EventLogger.info('NavigationDebug', `Testing navigation to: ${screenName}`);
      
      // Log the navigation object details
      EventLogger.debug('NavigationDebug', 'Navigation object:', {
        canGoBack: navigation.canGoBack(),
        isFocused: navigation.isFocused(),
        // @ts-ignore
        routeNames: navigation.getState?.()?.routeNames || 'N/A',
      });
      
      // Try different navigation methods
      try {
        // @ts-ignore
        navigation.navigate(screenName);
        EventLogger.info('NavigationDebug', `✅ Navigate successful to ${screenName}`);
      } catch (navError) {
        EventLogger.error('NavigationDebug', `❌ Navigate failed to ${screenName}:`, navError as Error);
        
        // Try push method
        try {
          // @ts-ignore
          navigation.push(screenName);
          EventLogger.info('NavigationDebug', `✅ Push successful to ${screenName}`);
        } catch (pushError) {
          EventLogger.error('NavigationDebug', `❌ Push also failed to ${screenName}:`, pushError as Error);
        }
      }
    } catch (error) {
      EventLogger.error('NavigationDebug', `Failed to test navigation to ${screenName}:`, error as Error);
      Alert.alert('Navigation Error', `Failed to navigate to ${screenName}: ${error}`);
    }
  };

  const getAllRoutes = () => {
    try {
      // @ts-ignore
      const routes = navigation.getState?.()?.routes || [];
      // @ts-ignore
      const routeNames = navigation.getState?.()?.routeNames || [];
      
      return { routes, routeNames };
    } catch (error) {
      return { routes: [], routeNames: [] };
    }
  };

  const { routes, routeNames } = getAllRoutes();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Navigation Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Route:</Text>
        <Text style={styles.info}>{route.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Routes ({routeNames.length}):</Text>
        <ScrollView style={styles.routesList} horizontal>
          {routeNames.map((name: string, index: number) => (
            <Text key={index} style={styles.routeName}>{name} </Text>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Navigation:</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => testNavigation('EditProfile')}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => testNavigation('Settings')}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => testNavigation('Privacy')}
          >
            <Text style={styles.buttonText}>Privacy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => testNavigation('Help')}
          >
            <Text style={styles.buttonText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigation State:</Text>
        <ScrollView style={styles.stateContainer}>
          <Text style={styles.stateText}>
            {JSON.stringify(state, null, 2).substring(0, 500)}...
          </Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFE0B2',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6F00',
    maxHeight: 400,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#E65100',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BF360C',
    marginBottom: 4,
  },
  info: {
    fontSize: 13,
    color: '#424242',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#FF6F00',
    padding: 8,
    borderRadius: 4,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  routesList: {
    maxHeight: 30,
  },
  routeName: {
    fontSize: 12,
    color: '#424242',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    borderRadius: 4,
  },
  stateContainer: {
    maxHeight: 100,
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 10,
    color: '#424242',
    fontFamily: 'monospace',
  },
});
