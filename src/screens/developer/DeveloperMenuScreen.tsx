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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ResearchDashboardEnhanced } from '../../components/research/ResearchDashboardEnhanced';
import { UIRedesignTool } from '../../components/developer/UIRedesignTool';
import { ChangeHistoryView } from '../../components/developer/ChangeHistoryView';
import { RoleService } from '../../services/auth/RoleService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase/client';
import Constants from 'expo-constants';

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
      console.error('Error checking developer access:', error);
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
      id: 'research',
      title: 'AI Research Assistant',
      description: 'Get insights for app improvements',
      icon: 'brain',
      component: ResearchDashboardEnhanced,
    },
    {
      id: 'redesign',
      title: 'UI/UX Redesign Tool',
      description: 'AI-powered interface redesign with mockups',
      icon: 'palette',
      component: UIRedesignTool,
    },
    {
      id: 'history',
      title: 'Change History',
      description: 'Track and undo AI-generated changes',
      icon: 'history',
      component: ChangeHistoryView,
    },
    {
      id: 'database',
      title: 'Database Tools',
      description: 'View and manage app data',
      icon: 'database',
      onPress: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'Not configured';
          
          if (user) {
            Alert.alert(
              'Database Info',
              `User ID: ${user.id}\nEmail: ${user.email}\n\nSupabase URL: ${supabaseUrl.substring(0, 50)}...`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Database Info',
              `Not signed in\n\nSupabase URL: ${supabaseUrl.substring(0, 50)}...`,
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          Alert.alert('Error', 'Unable to fetch database info');
        }
      },
    },
    {
      id: 'performance',
      title: 'Performance Monitor',
      description: 'Check app performance metrics',
      icon: 'speedometer',
      onPress: () => {
        let memoryInfo = 'Not available';
        let jsHeapUsed = 'Not available';
        
        try {
          // Try to get memory info (works in some environments)
          if ((performance as any).memory) {
            const memory = (performance as any).memory;
            jsHeapUsed = `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`;
            memoryInfo = `Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB\nLimit: ${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`;
          }
        } catch (e) {
          // Memory info not available
        }

        Alert.alert(
          'Performance Metrics',
          `Platform: ${Platform.OS} ${Platform.Version}\nJS Heap: ${jsHeapUsed}\nMemory: ${memoryInfo}\nApp Version: ${Constants.expoConfig?.version}\nRuntime: ${Constants.expoConfig?.runtimeVersion}`,
          [{ text: 'OK' }]
        );
      },
    },
    {
      id: 'logs',
      title: 'Debug Logs',
      description: 'View application logs',
      icon: 'file-document-outline',
      onPress: () => {
        Alert.alert(
          'Debug Logs',
          'Console logs are available in:\n\n• Chrome DevTools (Cmd+D → Debug JS)\n• React Native Debugger\n• Xcode Console (iOS)\n• Android Studio Logcat',
          [{ text: 'OK' }]
        );
      },
    },
    {
      id: 'storage',
      title: 'Storage Inspector',
      description: 'Inspect local storage and cache',
      icon: 'harddisk',
      onPress: async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();
          let storageSize = 'Unknown';
          
          try {
            // Try to estimate storage size
            const values = await AsyncStorage.multiGet(keys);
            const totalSize = values.reduce((size, [key, value]) => {
              return size + (key?.length || 0) + (value?.length || 0);
            }, 0);
            storageSize = `~${(totalSize / 1024).toFixed(1)} KB`;
          } catch (e) {
            // Size calculation failed
          }

          const storageInfo = `Total Keys: ${keys.length}\nEstimated Size: ${storageSize}\n\nSample Keys:\n${keys.slice(0, 6).map(key => `• ${key}`).join('\n')}${keys.length > 6 ? '\n• ...' : ''}`;
          Alert.alert('Storage Inspector', storageInfo, [{ text: 'OK' }]);
        } catch (error) {
          Alert.alert('Error', 'Unable to read storage');
        }
      },
    },
    {
      id: 'network',
      title: 'Network Monitor',
      description: 'Monitor API calls and responses',
      icon: 'web',
      onPress: () => {
        const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
        const claudeApiKey = Constants.expoConfig?.extra?.claudeApiKey;
        const openaiApiKey = Constants.expoConfig?.extra?.openaiApiKey;
        const claudeStatus = (claudeApiKey && claudeApiKey.length > 10) ? 'Configured ✅' : 'Not configured ❌';
        const openaiStatus = (openaiApiKey && openaiApiKey.length > 10) ? 'Configured ✅' : 'Not configured ❌';
        
        Alert.alert(
          'Network Monitor',
          `API Endpoints:\n\n• Supabase: ${supabaseUrl ? 'Active ✅' : 'Not configured ❌'}\n• Claude API: ${claudeStatus}\n• OpenAI API: ${openaiStatus}\n\nNetwork: ${Constants.isDevice ? 'Device' : 'Simulator'}`,
          [{ text: 'OK' }]
        );
      },
    },
  ];

  const appInfo = {
    version: '2.3.0',
    buildNumber: '1',
    environment: __DEV__ ? 'Development' : 'Production',
    platform: 'React Native',
    bundleId: 'com.zaptap.app',
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
                    <List.Icon {...props} icon={tool.icon} color="#6200ee" />
                  )}
                  right={(props) => (
                    <List.Icon {...props} icon="chevron-right" />
                  )}
                  onPress={() => {
                    if (tool.component) {
                      setActiveSection(tool.id);
                    } else if (tool.onPress) {
                      tool.onPress();
                    }
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
              title="Clear Cache"
              description="Clear app cache and temporary files"
              left={(props) => <List.Icon {...props} icon="trash-can" />}
              onPress={async () => {
                try {
                  await AsyncStorage.clear();
                  Alert.alert(
                    'Cache Cleared',
                    'All cached data has been cleared. You may need to sign in again.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Auth') }]
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to clear cache');
                }
              }}
            />
            <Divider style={styles.toolDivider} />
            <List.Item
              title="Reset to Defaults"
              description="Reset app settings to default values"
              left={(props) => <List.Icon {...props} icon="restore" />}
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
              title="Export Logs"
              description="Export debug logs for troubleshooting"
              left={(props) => <List.Icon {...props} icon="export" />}
              onPress={() => {
                const logs = {
                  timestamp: new Date().toISOString(),
                  platform: `${Platform.OS} ${Platform.Version}`,
                  version: Constants.expoConfig?.version,
                  runtimeVersion: Constants.expoConfig?.runtimeVersion,
                  environment: __DEV__ ? 'Development' : 'Production',
                  device: Constants.isDevice ? 'Physical Device' : 'Simulator',
                  apis: {
                    supabase: !!Constants.expoConfig?.extra?.supabaseUrl,
                    claude: !!(Constants.expoConfig?.extra?.claudeApiKey && Constants.expoConfig?.extra?.claudeApiKey.length > 10),
                    openai: !!(Constants.expoConfig?.extra?.openaiApiKey && Constants.expoConfig?.extra?.openaiApiKey.length > 10),
                  },
                  expo: {
                    projectId: Constants.expoConfig?.extra?.eas?.projectId,
                    deviceId: Constants.deviceId,
                  }
                };
                Alert.alert(
                  'Debug Logs Export',
                  `Debug Information:\n\n${JSON.stringify(logs, null, 2)}`,
                  [
                    { text: 'Copy to Console', onPress: () => console.log('ZAPTAP_DEBUG_LOGS:', logs) },
                    { text: 'OK' }
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