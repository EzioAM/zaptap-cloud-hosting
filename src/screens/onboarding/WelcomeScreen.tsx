import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Utils and theme
import { onboardingManager } from '../../utils/OnboardingManager';
import { typography } from '../../theme/typography';
import { APP_NAME, APP_TAGLINE } from '../../constants/version';
import { ANIMATION_CONFIG } from '../../constants/animations';
import { EventLogger } from '../../utils/EventLogger';

// Custom hook to safely use navigation (returns null if not available yet)
const useNavigationSafe = () => {
  try {
    return useNavigation();
  } catch (error) {
    // Navigation context not available yet
    return null;
  }
};

export function WelcomeScreen() {
  const navigation = useNavigationSafe();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const slideAnim = useSharedValue(50);

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    scaleAnim.value = withSpring(1, { 
      damping: 15, 
      stiffness: 150,
      duration: 1000 
    });
    slideAnim.value = withSpring(0, {
      damping: 20,
      stiffness: 100,
      duration: 800
    });
  }, []);

  const handleGetStarted = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (navigation) {
      navigation.navigate('OnboardingFlow' as never);
    } else {
      EventLogger.warn('Welcome', '[WelcomeScreen] Navigation not available - showing onboarding will require app restart');
      // Since navigation isn't available, just mark onboarding as complete
      // and the app will restart with the main flow
      await onboardingManager.completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onboardingManager.skipOnboarding();
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    } else {
      EventLogger.warn('Welcome', '[WelcomeScreen] Navigation not available - app will restart with main flow');
      // Navigation will be handled on next app launch
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  return (
    <LinearGradient
      colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Skip Button */}
        <View style={styles.skipContainer}>
          <TouchableOpacity
            style={styles.skipButtonNew}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <BlurView intensity={10} style={styles.skipBlur}>
              <Text style={styles.skipText}>Skip</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons name="lightning-bolt" size={80} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          </Animated.View>

          {/* Features Section */}
          <Animated.View style={[styles.featuresContainer, contentAnimatedStyle]}>
            <View style={styles.feature}>
              <BlurView intensity={15} style={styles.featureBlur}>
                <View style={[styles.featureIcon, { backgroundColor: '#FF6B6B' }]}>
                  <MaterialCommunityIcons name="robot" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Build Automations</Text>
                  <Text style={styles.featureDescription}>
                    Create powerful workflows with our intuitive builder
                  </Text>
                </View>
              </BlurView>
            </View>

            <View style={styles.feature}>
              <BlurView intensity={15} style={styles.featureBlur}>
                <View style={[styles.featureIcon, { backgroundColor: '#4ECDC4' }]}>
                  <MaterialCommunityIcons name="share-variant" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Share Instantly</Text>
                  <Text style={styles.featureDescription}>
                    Share via QR codes, NFC tags, or simple links
                  </Text>
                </View>
              </BlurView>
            </View>

            <View style={styles.feature}>
              <BlurView intensity={15} style={styles.featureBlur}>
                <View style={[styles.featureIcon, { backgroundColor: '#45B7D1' }]}>
                  <MaterialCommunityIcons name="view-gallery" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Discover Templates</Text>
                  <Text style={styles.featureDescription}>
                    Browse community automations and templates
                  </Text>
                </View>
              </BlurView>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={[styles.buttonContainer, contentAnimatedStyle]}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <BlurView intensity={20} style={styles.buttonBlur}>
                <Text style={styles.getStartedButtonText}>Get Started</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip Tutorial</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 100,
  },
  skipButtonNew: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  skipBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  featuresContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 40,
  },
  feature: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureBlur: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  getStartedButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonBlur: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
});