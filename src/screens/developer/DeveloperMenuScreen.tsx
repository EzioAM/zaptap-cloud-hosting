import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Divider,
  Appbar,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { ResearchDashboardEnhanced } from '../../components/research/ResearchDashboardEnhanced';
import { UIRedesignTool } from '../../components/developer/UIRedesignTool';
import { ChangeHistoryView } from '../../components/developer/ChangeHistoryView';
import { DatabaseInspector } from '../../components/developer/DatabaseInspector';
import { PerformanceMonitor } from '../../components/developer/PerformanceMonitor';
import { NetworkMonitor } from '../../components/developer/NetworkMonitor';
import { TestRunner } from '../../components/developer/TestRunner';
import { StorageInspector } from '../../components/developer/StorageInspector';
import { AppHealthMonitor } from '../../components/developer/AppHealthMonitor';
import { FeatureFlagsManager } from '../../components/developer/FeatureFlagsManager';
import { RoleService } from '../../services/auth/RoleService';
import { DeveloperService } from '../../services/developer/DeveloperService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase/client';
import Constants from 'expo-constants';
import { onboardingManager } from '../../utils/OnboardingManager';

interface DeveloperMenuScreenProps {
  navigation: any;
}

export const DeveloperMenuScreen: React.FC<DeveloperMenuScreenProps> = ({ navigation }) => {
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkDeveloperAccess();
  }, []);

  const checkDeveloperAccess = async () => {
    try {
      const access = await RoleService.hasDeveloperAccess();
      setHasAccess(access);
      
      if (!access) {
        Alert.alert(
          'Access Denied',
          'You do not have permission to access developer tools.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
    console.error('DeveloperMenu - Error checking developer access:', error);
    setHasAccess(false);
    Alert.alert(
    'Error',
    'Unable to verify access permissions.',
    [
    {
    text: 'OK',
    onPress: () => navigation.goBack()
    }
    ]
    );
    }
  };

  const developerTools = [
    {
      id: 'health',
      title: 'App Health Monitor',
      description: 'Real-time app health, automation insights, and performance analysis',
      icon: 'heart-pulse',
      component: AppHealthMonitor,
      color: '#e91e63',
    },
    {
      id: 'database',
      title: 'Database Inspector',
      description: 'Browse tables, query data, and monitor database operations',
      icon: 'database',
      component: DatabaseInspector,
      color: '#4caf50',
    },
    {
      id: 'performance',
      title: 'Performance Monitor',
      description: 'Real-time memory, API, and performance metrics',
      icon: 'speedometer',
      component: PerformanceMonitor,
      color: '#ff9800',
    },
    {
      id: 'network',
      title: 'Network Monitor',
      description: 'Monitor API calls, responses, and errors',
      icon: 'web',
      component: NetworkMonitor,
      color: '#2196f3',
    },
    {
      id: 'storage',
      title: 'Storage Inspector',
      description: 'View, edit, and manage AsyncStorage data',
      icon: 'harddisk',
      component: StorageInspector,
      color: '#9c27b0',
    },
    {
      id: 'testing',
      title: 'Test Runner',
      description: 'Run automated tests and simulate automations',
      icon: 'test-tube',
      component: TestRunner,
      color: '#00bcd4',
    },
    {
      id: 'flags',
      title: 'Feature Flags',
      description: 'Toggle experimental features and debugging options',
      icon: 'flag',
      component: FeatureFlagsManager,
      color: '#795548',
    },
    {
      id: 'research',
      title: 'AI Research Assistant',
      description: 'Get AI-powered insights and feedback on app improvements',
      icon: 'brain',
      component: ResearchDashboardEnhanced,
      color: '#e91e63',
    },
    {
      id: 'redesign',
      title: 'UI/UX Redesign Tool',
      description: 'Generate interface mockups and design suggestions using AI',
      icon: 'palette',
      component: UIRedesignTool,
      color: '#ff5722',
    },
    {
      id: 'history',
      title: 'Change History & Rollback',
      description: 'Review, track, and revert AI-generated code modifications',
      icon: 'history',
      component: ChangeHistoryView,
      color: '#607d8b',
    },
  ];

  const appInfo = {
    version: Constants.expoConfig?.version || '2.3.0',
    buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
    environment: __DEV__ ? 'Development' : 'Production',
    platform: `${Platform.OS} ${Platform.Version}`,
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'com.zaptap.app',
    expoVersion: Constants.expoVersion,
  };

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Verifying access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Don't render anything if access is denied (user will be redirected)
  if (!hasAccess) {
    return null;
  }

  if (activeSection) {
    const tool = developerTools.find(t => t.id === activeSection);
    if (tool?.component) {
      const Component = tool.component;
      return (
        <SafeAreaView style={styles.container}>
          <Appbar.Header>
            <Appbar.BackAction onPress={() => setActiveSection(null)} />
            <Appbar.Content title={tool.title} />
          </Appbar.Header>
          <Component />
        </SafeAreaView>
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Developer Menu" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* App Information */}
        <Card style={styles.infoCard}>
          <Card.Title title="App Information" />
          <Card.Content>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>{appInfo.version}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Build</Text>
                <Text style={styles.infoValue}>{appInfo.buildNumber}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Environment</Text>
                <Text style={styles.infoValue}>{appInfo.environment}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Platform</Text>
                <Text style={styles.infoValue}>{appInfo.platform}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Expo SDK</Text>
                <Text style={styles.infoValue}>{appInfo.expoVersion}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Developer Tools */}
        <Card style={styles.toolsCard}>
          <Card.Title title="Developer Tools" />
          <Card.Content>
            {developerTools.map((tool, index) => (
              <View key={tool.id}>
                <List.Item
                  title={tool.title}
                  description={tool.description}
                  left={(props) => (
                    <List.Icon {...props} icon={tool.icon} color={tool.color || '#6200ee'} />
                  )}
                  right={(props) => (
                    <List.Icon {...props} icon="chevron-right" />
                  )}
                  onPress={() => {
                    setActiveSection(tool.id);
                  }}
                  style={styles.toolItem}
                />
                {index < developerTools.length - 1 && (
                  <Divider style={styles.toolDivider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <List.Item
              title="Clear App Cache"
              description="Remove cached data and temporary files (keeps user login)"
              left={(props) => <List.Icon {...props} icon="trash-can" color="#ff9800" />}
              onPress={async () => {
                Alert.alert(
                  'Clear Cache',
                  'This will clear all cached data but preserve authentication. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear Cache',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const keys = await AsyncStorage.getAllKeys();
                          const cacheKeys = keys.filter(key => 
                            !key.includes('supabase') && 
                            !key.includes('auth') &&
                            !key.includes('user')
                          );
                          await AsyncStorage.multiRemove(cacheKeys);
                          Alert.alert('Success', 'Cache cleared successfully');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to clear cache');
                        }
                      },
                    },
                  ]
                );
              }}
            />
            <Divider style={styles.toolDivider} />
            <List.Item
              title="Reset App Settings"
              description="Restore all preferences to factory defaults (keeps user data)"
              left={(props) => <List.Icon {...props} icon="restore" color="#f44336" />}
              onPress={() => {
                Alert.alert(
                  'Reset Settings',
                  'This will reset all app settings to their default values. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          // Remove only settings-related keys, not auth
                          const keys = await AsyncStorage.getAllKeys();
                          const settingsKeys = keys.filter(key => key.includes('settings') || key.includes('preferences'));
                          await AsyncStorage.multiRemove(settingsKeys);
                          Alert.alert('Success', 'Settings have been reset to defaults');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to reset settings');
                        }
                      }
                    }
                  ]
                );
              }}
            />
            <Divider style={styles.toolDivider} />
            <List.Item
              title="Export Debug Data"
              description="Generate diagnostic report for technical support"
              left={(props) => <List.Icon {...props} icon="export" color="#4caf50" />}
              onPress={async () => {
                try {
                  const debugBundle = await DeveloperService.exportDebugBundle();
                  console.log('DEVELOPER_DEBUG_BUNDLE:', debugBundle);
                  Alert.alert(
                    'Debug Bundle Exported',
                    'Complete debug bundle has been exported to console logs. Check console for DEVELOPER_DEBUG_BUNDLE.',
                    [{ text: 'OK' }]
                  );
                } catch (error) {
                  console.error('Failed to export debug bundle:', error);
                  Alert.alert('Error', 'Failed to export debug bundle');
                }
              }}
            />
            <Divider style={styles.toolDivider} />
            <List.Item
              title="Reset Onboarding"
              description="Show onboarding screens again (requires app restart)"
              left={(props) => <List.Icon {...props} icon="restart" color="#9c27b0" />}
              onPress={async () => {
                Alert.alert(
                  'Reset Onboarding',
                  'This will reset the onboarding state and show the welcome screens on next app launch. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await onboardingManager.resetOnboarding();
                          Alert.alert(
                            'Success', 
                            'Onboarding has been reset. Please restart the app to see the welcome screens.',
                            [{ text: 'OK' }]
                          );
                        } catch (error) {
                          Alert.alert('Error', 'Failed to reset onboarding');
                        }
                      }
                    }
                  ]
                );
              }}
            />
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toolsCard: {
    marginBottom: 16,
  },
  toolItem: {
    paddingVertical: 8,
  },
  toolDivider: {
    marginLeft: 56,
  },
  actionsCard: {
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});