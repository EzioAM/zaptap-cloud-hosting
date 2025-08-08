import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { ScannerModal } from '../../scanner/ScannerModal';
// Safe imports with fallbacks
let gradients: any = {};
let glassEffects: any = {};
let subtleGradients: any = {};
let typography: any = {};
let fontWeights: any = {};
let textShadows: any = {};

try {
  const gradientsModule = require('../../../theme/gradients');
  gradients = gradientsModule.gradients || {};
  glassEffects = gradientsModule.glassEffects || {};
  subtleGradients = gradientsModule.subtleGradients || {
    lightGray: {
      colors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    }
  };
} catch (error) {
  console.warn('Gradients theme not found, using defaults');
  // Provide fallback gradients
  gradients = {
    primary: { colors: ['#6366F1', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    success: { colors: ['#10B981', '#34D399'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    ocean: { colors: ['#0EA5E9', '#38BDF8'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  subtleGradients = {
    lightGray: {
      colors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    }
  };
}

try {
  const typographyModule = require('../../../theme/typography');
  typography = typographyModule.typography || {};
  fontWeights = typographyModule.fontWeights || {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  textShadows = typographyModule.textShadows || {
    subtle: {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }
  };
} catch (error) {
  console.warn('Typography theme not found, using defaults');
  typography = {
    overline: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    headlineMedium: { fontSize: 20, fontWeight: '600' },
    labelLarge: { fontSize: 14, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '400' },
  };
  fontWeights = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  textShadows = {
    subtle: {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }
  };
}
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  gradientKey: keyof typeof gradients;
  delay?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ActionButton3D: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  onPress, 
  gradientKey,
  delay = 0 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      delay,
      useNativeDriver: true,
    }).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Button press animation
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Ripple effect
    rippleAnim.setValue(0);
    rippleOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const gradient = gradients[gradientKey];
  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2],
  });

  return (
    <Animated.View
      style={[
        styles.actionButtonContainer,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: floatAnim },
          ],
        },
      ]}
    >
      <AnimatedPressable
        onPress={() => {
          console.log(`DEBUG: ActionButton3D pressed - ${label}`);
          onPress();
        }}
        onPressIn={() => {
          console.log(`DEBUG: ActionButton3D pressIn - ${label}`);
          handlePressIn();
        }}
        onPressOut={handlePressOut}
        style={[
          styles.actionButton3D,
          {
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        {/* Shadow layers for 3D effect */}
        <Animated.View 
          style={[
            styles.shadowLayer1,
            {
              opacity: shadowAnim,
              transform: [
                { translateY: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [2, 4],
                }) },
              ],
            },
          ]} 
        />
        <Animated.View 
          style={[
            styles.shadowLayer2,
            {
              opacity: shadowAnim.interpolate({
                inputRange: [0.5, 1],
                outputRange: [0.3, 0.6],
              }),
              transform: [
                { translateY: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [4, 8],
                }) },
              ],
            },
          ]} 
        />
        <Animated.View 
          style={[
            styles.shadowLayer3,
            {
              opacity: shadowAnim.interpolate({
                inputRange: [0.5, 1],
                outputRange: [0.1, 0.3],
              }),
              transform: [
                { translateY: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [6, 12],
                }) },
              ],
            },
          ]} 
        />

        <LinearGradient
          colors={gradient && gradient.colors && gradient.colors.length >= 2 ? gradient.colors : ['#8B5CF6', '#7C3AED']}
          start={gradient?.start || { x: 0, y: 0 }}
          end={gradient?.end || { x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          {/* Ripple effect */}
          <Animated.View
            style={[
              styles.ripple,
              {
                transform: [{ scale: rippleScale }],
                opacity: rippleOpacity,
              },
            ]}
          />

          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={icon as any} 
              size={32} 
              color="#FFFFFF"
              style={styles.buttonIcon}
            />
          </View>
          <Text style={styles.buttonLabel}>{label}</Text>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
};

interface QuickActionsWidgetEnhancedProps {
  theme?: any;
  onCreateAutomation?: () => void;
  onBrowseAutomations?: () => void;
  onViewLibrary?: () => void;
}

export const QuickActionsWidgetEnhanced: React.FC<QuickActionsWidgetEnhancedProps> = ({
  theme: propTheme,
  onCreateAutomation,
  onBrowseAutomations,
  onViewLibrary,
}) => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const containerScale = useRef(new Animated.Value(0.95)).current;
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    Animated.spring(containerScale, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCreateAutomation = () => {
    console.log('DEBUG: QuickActionsWidget - handleCreateAutomation called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onCreateAutomation) {
      onCreateAutomation();
    } else {
      navigation.navigate('BuildTab' as never);
    }
  };

  const handleScanTag = () => {
    console.log('DEBUG: QuickActionsWidget - handleScanTag called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Open scanner modal instead of navigating to discover
    setShowScanner(true);
  };

  const handleScanResult = async (automationId: string, metadata: any) => {
    try {
      // Here you would fetch the automation data and execute it
      // For now, we'll show a success message
      Alert.alert(
        'Automation Scanned! 🚀',
        `Found: ${metadata.title || 'Unknown automation'}\n\nThis would execute the automation in a real implementation.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to execute scanned automation');
    }
  };

  const handleImportAutomation = () => {
    console.log('DEBUG: QuickActionsWidget - handleImportAutomation called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onViewLibrary) {
      onViewLibrary();
    } else {
      navigation.navigate('DiscoverTab' as never);
    }
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: containerScale }] }}>
        <LinearGradient
          colors={subtleGradients.lightGray.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.container}
        >
          {Platform.OS === 'ios' && (
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
          )}
          
          <View style={[styles.content, styles.glassContent]}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.overline, { color: theme.colors?.primary || '#6366F1' }]}>
                  QUICK ACTIONS
                </Text>
                <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
                  Get Started
                </Text>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              <ActionButton3D
                icon="plus-circle"
                label="Create"
                onPress={handleCreateAutomation}
                gradientKey="primary"
                delay={0}
              />
              <ActionButton3D
                icon="qrcode-scan"
                label="Scan"
                onPress={handleScanTag}
                gradientKey="success"
                delay={100}
              />
              <ActionButton3D
                icon="cloud-download"
                label="Import"
                onPress={handleImportAutomation}
                gradientKey="ocean"
                delay={200}
              />
            </View>

            <View style={styles.footer}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.footerAccent}
              />
              <Text style={[styles.footerText, { color: theme.colors?.textSecondary || '#666' }]}>
                Tap any action to begin
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
      
      <ScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  glassContent: {
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.3)',
      android: 'rgba(255, 255, 255, 0.9)',
    }),
  },
  header: {
    marginBottom: 20,
  },
  overline: {
    ...typography.overline,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: fontWeights.bold,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButtonContainer: {
    flex: 1,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  actionButton3D: {
    width: '100%',
    position: 'relative',
  },
  shadowLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 16,
  },
  shadowLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
  },
  shadowLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
  },
  gradientButton: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
  },
  iconContainer: {
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  buttonIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonLabel: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.5,
    ...textShadows.subtle,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerAccent: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    marginBottom: 8,
  },
  footerText: {
    ...typography.caption,
  },
});

export default QuickActionsWidgetEnhanced;