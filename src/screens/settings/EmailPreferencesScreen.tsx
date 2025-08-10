import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  Text,
  Switch,
  Button,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { EventLogger } from '../../utils/EventLogger';

interface EmailPreferences {
  marketingEmails: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  automationNotifications: boolean;
  weeklyDigest: boolean;
  communityUpdates: boolean;
}

const { width } = Dimensions.get('window');

const EmailPreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useSafeTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  
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

  // Start animations when loading is complete
  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, fadeAnim, slideAnim]);

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
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const unsubscribeAll = () => {
    // Add haptic feedback for destructive action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

  // Email preference categories with icons and descriptions
  const emailCategories = [
    {
      key: 'productUpdates' as keyof EmailPreferences,
      title: 'Product Updates',
      description: 'New features, improvements, and releases',
      icon: 'rocket-launch',
      color: theme.colors.brand?.primary || '#6200ee',
    },
    {
      key: 'securityAlerts' as keyof EmailPreferences,
      title: 'Security Alerts',
      description: 'Important security and account notifications',
      icon: 'shield-check',
      color: theme.colors.semantic?.warning || '#FF9800',
    },
    {
      key: 'automationNotifications' as keyof EmailPreferences,
      title: 'Automation Notifications',
      description: 'Updates about your automations and executions',
      icon: 'robot',
      color: theme.colors.brand?.secondary || '#03DAC6',
    },
    {
      key: 'weeklyDigest' as keyof EmailPreferences,
      title: 'Weekly Digest',
      description: 'Summary of your activity and popular automations',
      icon: 'calendar-week',
      color: theme.colors.semantic?.info || '#2196F3',
    },
    {
      key: 'communityUpdates' as keyof EmailPreferences,
      title: 'Community Updates',
      description: 'New automations and tips from the community',
      icon: 'account-group',
      color: theme.colors.brand?.accent || '#BB86FC',
    },
    {
      key: 'marketingEmails' as keyof EmailPreferences,
      title: 'Marketing Emails',
      description: 'Promotional offers and special announcements',
      icon: 'tag',
      color: theme.colors.semantic?.success || '#4CAF50',
    },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Loading Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientHeader, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Email Preferences</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand?.primary || '#6200ee'} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading your preferences...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Icon name="email" size={24} color="#FFFFFF" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Email Preferences</Text>
            <Text style={styles.headerSubtitle}>
              Manage your communication settings
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              savePreferences();
            }}
            style={[styles.saveHeaderButton, { opacity: isSaving ? 0.6 : 1 }]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Icon name="content-save" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[styles.scrollContainer, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction Card */}
        <View style={[styles.introCard, { backgroundColor: theme.colors.surface.primary }]}>
          <View style={styles.introContent}>
            <Icon name="email-outline" size={32} color={theme.colors.brand?.primary || '#6200ee'} />
            <Text style={[styles.introTitle, { color: theme.colors.text.primary }]}>
              Communication Preferences
            </Text>
            <Text style={[styles.introSubtitle, { color: theme.colors.text.secondary }]}>
              Choose which emails you'd like to receive from us. We respect your preferences and will only send you relevant content.
            </Text>
          </View>
        </View>

        {/* Email Preference Cards */}
        {emailCategories.map((category, index) => (
          <Animated.View
            key={category.key}
            style={[
              styles.preferenceCard,
              { 
                backgroundColor: theme.colors.surface.primary,
                opacity: fadeAnim,
                transform: [{ 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 50 + index * 10],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.preferenceContent}
              onPress={() => togglePreference(category.key)}
              disabled={isSaving}
            >
              <View style={styles.preferenceLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}>
                  <Icon name={category.icon} size={24} color={category.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.preferenceTitle, { color: theme.colors.text.primary }]}>
                    {category.title}
                  </Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.text.secondary }]}>
                    {category.description}
                  </Text>
                </View>
              </View>

              <View style={styles.switchContainer}>
                <Switch
                  value={preferences[category.key]}
                  onValueChange={() => togglePreference(category.key)}
                  disabled={isSaving}
                  trackColor={{ 
                    false: theme.colors.border.light, 
                    true: `${category.color}40` 
                  }}
                  thumbColor={preferences[category.key] ? category.color : theme.colors.text?.tertiary || '#999999'}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.buttonSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { 
                backgroundColor: theme.colors.brand?.primary || '#6200ee',
                opacity: isSaving ? 0.7 : 1 
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              savePreferences();
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Icon name="content-save" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { 
                borderColor: theme.colors.semantic?.error || '#F44336',
                opacity: isSaving ? 0.7 : 1 
              }
            ]}
            onPress={unsubscribeAll}
            disabled={isSaving}
          >
            <Icon name="email-remove" size={20} color={theme.colors.semantic?.error || '#F44336'} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.semantic?.error || '#F44336' }]}>
              Unsubscribe from All
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer Note */}
        <Animated.View
          style={[
            styles.footerNote,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Icon name="information" size={16} color={theme.colors.text?.tertiary || '#999999'} />
          <Text style={[styles.noteText, { color: theme.colors.text?.tertiary || '#999999' }]}>
            Note: You cannot unsubscribe from critical security alerts and service announcements required for your account safety.
          </Text>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header Styles
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerIcon: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  saveHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Content Styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  
  // Introduction Card
  introCard: {
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  introContent: {
    padding: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Preference Cards
  preferenceCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  preferenceLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  switchContainer: {
    marginLeft: 16,
  },
  
  // Button Section
  buttonSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
});

export default EmailPreferencesScreen;