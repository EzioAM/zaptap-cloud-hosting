import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Switch,
  Button,
  Card,
  ActivityIndicator,
  useTheme,
  Appbar,
  List,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventLogger } from '../../utils/EventLogger';

interface EmailPreferences {
  marketingEmails: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  automationNotifications: boolean;
  weeklyDigest: boolean;
  communityUpdates: boolean;
}

const EmailPreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [preferences, setPreferences] = useState<EmailPreferences>({
    marketingEmails: false,
    productUpdates: true,
    securityAlerts: true,
    automationNotifications: true,
    weeklyDigest: false,
    communityUpdates: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const savedPrefs = await AsyncStorage.getItem('@email_preferences');
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
      EventLogger.debug('Settings', 'Email preferences loaded');
    } catch (error) {
      EventLogger.error('Settings', 'Failed to load email preferences:', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('@email_preferences', JSON.stringify(preferences));
      EventLogger.info('Settings', 'Email preferences saved');
      Alert.alert(
        'Success',
        'Your email preferences have been updated',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      EventLogger.error('Settings', 'Failed to save email preferences:', error as Error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = (key: keyof EmailPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const unsubscribeAll = () => {
    Alert.alert(
      'Unsubscribe from All',
      'Are you sure you want to unsubscribe from all email communications? You will still receive important security alerts.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: () => {
            setPreferences({
              marketingEmails: false,
              productUpdates: false,
              securityAlerts: true, // Keep security alerts
              automationNotifications: false,
              weeklyDigest: false,
              communityUpdates: false,
            });
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Email Preferences" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Email Preferences" />
        <Appbar.Action 
          icon="content-save" 
          onPress={savePreferences}
          disabled={isSaving}
        />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Communication Preferences
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Choose which emails you'd like to receive from us
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="Product Updates"
            description="New features, improvements, and releases"
            left={props => <List.Icon {...props} icon="rocket-launch" />}
            right={() => (
              <Switch
                value={preferences.productUpdates}
                onValueChange={() => togglePreference('productUpdates')}
                disabled={isSaving}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Security Alerts"
            description="Important security and account notifications"
            left={props => <List.Icon {...props} icon="shield-check" />}
            right={() => (
              <Switch
                value={preferences.securityAlerts}
                onValueChange={() => togglePreference('securityAlerts')}
                disabled={isSaving}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Automation Notifications"
            description="Updates about your automations and executions"
            left={props => <List.Icon {...props} icon="robot" />}
            right={() => (
              <Switch
                value={preferences.automationNotifications}
                onValueChange={() => togglePreference('automationNotifications')}
                disabled={isSaving}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Weekly Digest"
            description="Summary of your activity and popular automations"
            left={props => <List.Icon {...props} icon="calendar-week" />}
            right={() => (
              <Switch
                value={preferences.weeklyDigest}
                onValueChange={() => togglePreference('weeklyDigest')}
                disabled={isSaving}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Community Updates"
            description="New automations and tips from the community"
            left={props => <List.Icon {...props} icon="account-group" />}
            right={() => (
              <Switch
                value={preferences.communityUpdates}
                onValueChange={() => togglePreference('communityUpdates')}
                disabled={isSaving}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Marketing Emails"
            description="Promotional offers and special announcements"
            left={props => <List.Icon {...props} icon="tag" />}
            right={() => (
              <Switch
                value={preferences.marketingEmails}
                onValueChange={() => togglePreference('marketingEmails')}
                disabled={isSaving}
              />
            )}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={savePreferences}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
          >
            Save Preferences
          </Button>

          <Button
            mode="outlined"
            onPress={unsubscribeAll}
            disabled={isSaving}
            style={styles.unsubscribeButton}
          >
            Unsubscribe from All
          </Button>
        </View>

        <Text variant="bodySmall" style={styles.note}>
          Note: You cannot unsubscribe from critical security alerts and 
          service announcements required for your account safety.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    marginBottom: 12,
  },
  unsubscribeButton: {
    borderColor: '#666',
  },
  note: {
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});

export default EmailPreferencesScreen;