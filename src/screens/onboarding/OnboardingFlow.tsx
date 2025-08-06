import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';

// Utils and services
import { onboardingManager, OnboardingStep } from '../../utils/OnboardingManager';
import { sampleAutomations, getFeaturedAutomations } from '../../data/sampleAutomations';

// Theme and styling
import { ANIMATION_CONFIG } from '../../constants/animations';
import { getExtendedColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { EventLogger } from '../../utils/EventLogger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const colors = getExtendedColors('light');

interface OnboardingScreenProps {
  step: OnboardingStep;
  index: number;
  currentIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onPermissionRequest?: (permission: string) => Promise<boolean>;
}

// Individual onboarding screen components
const WelcomeOnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext }) => {
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <LinearGradient
      colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
      style={styles.screenContainer}
    >
      <Animated.View style={[styles.contentContainer, animatedStyle]}>
        <View style={styles.logoContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={80} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>ShortcutsLike</Text>
          <Text style={styles.tagline}>Automate Your World</Text>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Create powerful automations, share them instantly via NFC tags, QR codes, 
            or simple links. Join a community of automation enthusiasts!
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <BlurView intensity={20} style={styles.buttonBlur}>
            <Text style={styles.buttonText}>Let's Get Started</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const FeaturesOnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext }) => {
  const features = [
    {
      icon: 'robot',
      title: 'Build Automations',
      description: 'Create workflows with our intuitive visual builder',
      color: '#FF6B6B',
    },
    {
      icon: 'share-variant',
      title: 'Deploy Anywhere',
      description: 'Share via NFC tags, QR codes, or instant links',
      color: '#4ECDC4',
    },
    {
      icon: 'view-gallery',
      title: 'Community Library',
      description: 'Discover and import community automations',
      color: '#45B7D1',
    },
  ];

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.screenContainer}
    >
      <View style={styles.contentContainer}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons name="feature-search" size={60} color="#FFFFFF" />
          <Text style={styles.screenTitle}>Powerful Features</Text>
          <Text style={styles.screenSubtitle}>Everything you need to automate your digital life</Text>
        </View>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInUp.delay(index * 200).duration(600)}
              style={styles.featureCard}
            >
              <BlurView intensity={15} style={styles.featureBlur}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <MaterialCommunityIcons name={feature.icon as any} size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </BlurView>
            </Animated.View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.8}>
          <BlurView intensity={20} style={styles.buttonBlur}>
            <Text style={styles.buttonText}>Continue</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const PermissionsOnboardingScreen: React.FC<OnboardingScreenProps> = ({ 
  onNext, 
  onPermissionRequest 
}) => {
  const [permissions, setPermissions] = useState({
    notifications: false,
    nfc: false,
    camera: false,
  });

  const requestPermission = async (type: keyof typeof permissions) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (onPermissionRequest) {
        const granted = await onPermissionRequest(type);
        setPermissions(prev => ({ ...prev, [type]: granted }));
      }
    } catch (error) {
      EventLogger.error('OnboardingFlow', 'Error requesting ${type} permission:', error as Error);
    }
  };

  const permissionItems = [
    {
      key: 'notifications' as keyof typeof permissions,
      icon: 'bell',
      title: 'Notifications',
      description: 'Get feedback from your automations',
      required: true,
    },
    {
      key: 'nfc' as keyof typeof permissions,
      icon: 'nfc-tap',
      title: 'NFC Access',
      description: 'Write automations to NFC tags',
      required: false,
    },
    {
      key: 'camera' as keyof typeof permissions,
      icon: 'camera',
      title: 'Camera',
      description: 'Scan QR codes for automations',
      required: false,
    },
  ];

  return (
    <LinearGradient
      colors={['#11998e', '#38ef7d']}
      style={styles.screenContainer}
    >
      <View style={styles.contentContainer}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons name="shield-check" size={60} color="#FFFFFF" />
          <Text style={styles.screenTitle}>Setup Permissions</Text>
          <Text style={styles.screenSubtitle}>
            Enable features for the best automation experience
          </Text>
        </View>

        <View style={styles.permissionsContainer}>
          {permissionItems.map((item, index) => (
            <Animated.View
              key={item.key}
              entering={SlideInRight.delay(index * 150).duration(500)}
            >
              <TouchableOpacity
                style={styles.permissionCard}
                onPress={() => requestPermission(item.key)}
                activeOpacity={0.8}
              >
                <BlurView intensity={15} style={styles.permissionBlur}>
                  <View style={styles.permissionContent}>
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={32} 
                      color="#FFFFFF" 
                    />
                    <View style={styles.permissionText}>
                      <Text style={styles.permissionTitle}>
                        {item.title}
                        {item.required && <Text style={styles.requiredIndicator}> *</Text>}
                      </Text>
                      <Text style={styles.permissionDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.permissionStatus}>
                      <MaterialCommunityIcons
                        name={permissions[item.key] ? 'check-circle' : 'circle-outline'}
                        size={24}
                        color={permissions[item.key] ? '#4CAF50' : 'rgba(255,255,255,0.6)'}
                      />
                    </View>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.8}>
          <BlurView intensity={20} style={styles.buttonBlur}>
            <Text style={styles.buttonText}>Continue</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const TutorialOnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext }) => {
  const featuredAutomations = getFeaturedAutomations().slice(0, 3);

  return (
    <LinearGradient
      colors={['#ff7e5f', '#feb47b']}
      style={styles.screenContainer}
    >
      <View style={styles.contentContainer}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons name="school" size={60} color="#FFFFFF" />
          <Text style={styles.screenTitle}>Quick Tutorial</Text>
          <Text style={styles.screenSubtitle}>
            Check out these sample automations to get inspired
          </Text>
        </View>

        <View style={styles.tutorialContainer}>
          {featuredAutomations.map((automation, index) => (
            <Animated.View
              key={automation.id}
              entering={FadeInUp.delay(index * 200).duration(600)}
              style={styles.automationPreview}
            >
              <BlurView intensity={15} style={styles.automationBlur}>
                <LinearGradient
                  colors={automation.gradient}
                  style={styles.automationGradient}
                >
                  <MaterialCommunityIcons 
                    name={automation.icon as any} 
                    size={32} 
                    color="#FFFFFF" 
                  />
                  <View style={styles.automationInfo}>
                    <Text style={styles.automationName}>{automation.name}</Text>
                    <Text style={styles.automationDescription}>
                      {automation.description}
                    </Text>
                    <View style={styles.automationMeta}>
                      <Text style={styles.automationSteps}>
                        {automation.steps.length} steps
                      </Text>
                      <Text style={styles.automationTime}>
                        {automation.estimatedTime}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.8}>
          <BlurView intensity={20} style={styles.buttonBlur}>
            <Text style={styles.buttonText}>Explore More</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const ReadyOnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext }) => {
  const scaleAnim = useSharedValue(0.8);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <LinearGradient
      colors={['#834d9b', '#d04ed6']}
      style={styles.screenContainer}
    >
      <Animated.View style={[styles.contentContainer, animatedStyle]}>
        <View style={styles.celebrationContainer}>
          <View style={styles.celebrationIcon}>
            <MaterialCommunityIcons name="rocket-launch" size={80} color="#FFFFFF" />
          </View>
          <Text style={styles.celebrationTitle}>You're All Set!</Text>
          <Text style={styles.celebrationSubtitle}>
            Welcome to the ShortcutsLike community! 
            Start creating amazing automations today.
          </Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <BlurView intensity={15} style={styles.actionBlur}>
              <MaterialCommunityIcons name="plus-circle" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Create First Automation</Text>
            </BlurView>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <BlurView intensity={15} style={styles.actionBlur}>
              <MaterialCommunityIcons name="view-gallery" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Explore Templates</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.8}>
          <BlurView intensity={20} style={styles.buttonBlur}>
            <Text style={styles.buttonText}>Start Automating!</Text>
            <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

// Main OnboardingFlow component
export const OnboardingFlow: React.FC = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const progressAnim = useSharedValue(0);

  const steps = onboardingManager.getOnboardingSteps();

  useEffect(() => {
    progressAnim.value = withSpring(currentIndex / (steps.length - 1), {
      damping: 15,
      stiffness: 150,
    });
  }, [currentIndex, steps.length]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressAnim.value, [0, 1], [20, 100])}%`,
  }));

  const handleNext = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (currentIndex < steps.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
      
      // Update progress
      const step = steps[currentIndex];
      if (step.type === 'welcome') {
        await onboardingManager.markStepCompleted('hasSeenWelcome');
      } else if (step.type === 'features') {
        await onboardingManager.markStepCompleted('hasSeenFeatures');
      } else if (step.type === 'permissions') {
        await onboardingManager.markStepCompleted('hasSeenPermissions');
      } else if (step.type === 'tutorial') {
        await onboardingManager.markStepCompleted('hasSeenTutorial');
      }
    } else {
      handleComplete();
    }
  }, [currentIndex, steps]);

  const handleSkip = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Skip Onboarding?',
      'You can always access the tutorial later in settings.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'default', 
          onPress: async () => {
            await onboardingManager.skipOnboarding();
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' as never }],
            });
          }
        },
      ]
    );
  }, [navigation]);

  const handleComplete = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onboardingManager.markOnboardingCompleted();
    
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' as never }],
    });
  }, [navigation]);

  const handlePermissionRequest = async (permission: string): Promise<boolean> => {
    // Mock permission request - in real app, use expo-permissions or similar
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 1000);
    });
  };

  const renderScreen = useCallback(({ item: step, index }: { item: OnboardingStep; index: number }) => {
    const commonProps = {
      step,
      index,
      currentIndex,
      onNext: handleNext,
      onSkip: handleSkip,
      onPermissionRequest: handlePermissionRequest,
    };

    switch (step.type) {
      case 'welcome':
        return <WelcomeOnboardingScreen {...commonProps} />;
      case 'features':
        return <FeaturesOnboardingScreen {...commonProps} />;
      case 'permissions':
        return <PermissionsOnboardingScreen {...commonProps} />;
      case 'tutorial':
        return <TutorialOnboardingScreen {...commonProps} />;
      case 'ready':
        return <ReadyOnboardingScreen {...commonProps} />;
      default:
        return <WelcomeOnboardingScreen {...commonProps} />;
    }
  }, [currentIndex, handleNext, handleSkip]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Skip Button */}
      <View style={styles.skipContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <BlurView intensity={10} style={styles.skipBlur}>
            <Text style={styles.skipText}>Skip</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderScreen}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {steps.length}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flatList: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 100,
  },
  skipButton: {
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
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  appTitle: {
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
  descriptionContainer: {
    paddingHorizontal: 20,
  },
  description: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  screenSubtitle: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  featureCard: {
    width: screenWidth - 48,
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
    flex: 1,
  },
  permissionsContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  permissionCard: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  permissionBlur: {
    padding: 20,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionText: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  requiredIndicator: {
    color: '#FF6B6B',
  },
  permissionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  permissionStatus: {
    width: 32,
    alignItems: 'center',
  },
  tutorialContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  automationPreview: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  automationBlur: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  automationGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  automationInfo: {
    flex: 1,
    marginLeft: 16,
  },
  automationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  automationDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  automationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  automationSteps: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  automationTime: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  celebrationIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 32,
  },
  actionCard: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionBlur: {
    padding: 20,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  buttonBlur: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
});

export default OnboardingFlow;