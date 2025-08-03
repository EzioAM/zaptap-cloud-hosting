import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Switch,
  Alert,
} from 'react-native';
import { Card, List, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../constants/version';

export default function SettingsScreen() {
  const [settings, setSettings] = React.useState({
    notifications: true,
    analytics: true,
    darkMode: false,
    biometricAuth: false,
    locationServices: true,
    autoRun: false,
  });

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'Cache cleared successfully');
              await loadSettings(); // Reload default settings
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* General Settings */}
          <Text style={styles.sectionTitle}>General</Text>
          <Card style={styles.card}>
            <List.Item
              title="Push Notifications"
              description="Receive notifications for automation events"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={settings.notifications}
                  onValueChange={(value) => saveSetting('notifications', value)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.notifications ? '#6200ee' : '#f4f3f4'}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Analytics"
              description="Help improve the app by sharing usage data"
              left={props => <List.Icon {...props} icon="chart-line" />}
              right={() => (
                <Switch
                  value={settings.analytics}
                  onValueChange={(value) => saveSetting('analytics', value)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.analytics ? '#6200ee' : '#f4f3f4'}
                />
              )}
            />
          </Card>

          {/* Appearance */}
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Card style={styles.card}>
            <List.Item
              title="Dark Mode"
              description="Use dark theme (Coming soon)"
              left={props => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={settings.darkMode}
                  disabled
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.darkMode ? '#6200ee' : '#f4f3f4'}
                />
              )}
            />
          </Card>

          {/* Security */}
          <Text style={styles.sectionTitle}>Security</Text>
          <Card style={styles.card}>
            <List.Item
              title="Biometric Authentication"
              description="Use Face ID or Touch ID"
              left={props => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={settings.biometricAuth}
                  onValueChange={(value) => saveSetting('biometricAuth', value)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.biometricAuth ? '#6200ee' : '#f4f3f4'}
                />
              )}
            />
          </Card>

          {/* Automation Settings */}
          <Text style={styles.sectionTitle}>Automation</Text>
          <Card style={styles.card}>
            <List.Item
              title="Location Services"
              description="Allow location-based automation triggers"
              left={props => <List.Icon {...props} icon="map-marker" />}
              right={() => (
                <Switch
                  value={settings.locationServices}
                  onValueChange={(value) => saveSetting('locationServices', value)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.locationServices ? '#6200ee' : '#f4f3f4'}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Auto-run Automations"
              description="Run automations without confirmation"
              left={props => <List.Icon {...props} icon="play-circle" />}
              right={() => (
                <Switch
                  value={settings.autoRun}
                  onValueChange={(value) => saveSetting('autoRun', value)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.autoRun ? '#6200ee' : '#f4f3f4'}
                />
              )}
            />
          </Card>

          {/* Storage */}
          <Text style={styles.sectionTitle}>Storage</Text>
          <Card style={styles.card}>
            <List.Item
              title="Clear Cache"
              description="Free up storage space"
              left={props => <List.Icon {...props} icon="delete" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleClearCache}
            />
          </Card>

          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>
          <Card style={styles.card}>
            <List.Item
              title="Version"
              description={APP_VERSION}
              left={props => <List.Icon {...props} icon="information" />}
            />
            <Divider />
            <List.Item
              title="Open Source Licenses"
              description="View third-party licenses"
              left={props => <List.Icon {...props} icon="file-document" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Licenses', 'View at zaptap.cloud/licenses')}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: 8,
  },
});