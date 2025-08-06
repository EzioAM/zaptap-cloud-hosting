import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Pressable,
  Dimensions,
  ViewStyle,
  ModalProps,
  StatusBar,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  State,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { usePlatform } from '../../../hooks/usePlatform';
import { useHaptic } from '../../../hooks/useHaptic';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PlatformModalPresentationStyle = 'sheet' | 'card' | 'fullscreen' | 'popup';
export type PlatformModalAnimationType = 'slide' | 'fade' | 'scale' | 'none';

export interface PlatformModalProps extends Omit<ModalProps, 'animationType' | 'presentationStyle'> {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  presentationStyle?: PlatformModalPresentationStyle;
  animationType?: PlatformModalAnimationType;
  dismissible?: boolean;
  dragToClose?: boolean;
  backgroundColor?: string;
  overlayColor?: string;
  borderRadius?: number;
  maxHeight?: number | string;
  maxWidth?: number | string;
  haptic?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  overlayStyle?: ViewStyle;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PlatformModal: React.FC<PlatformModalProps> = ({
  isVisible,
  onClose,
  children,
  presentationStyle = 'sheet',
  animationType = 'slide',
  dismissible = true,
  dragToClose = true,
  backgroundColor,
  overlayColor,
  borderRadius,
  maxHeight = '90%',
  maxWidth = '100%',
  haptic = true,
  style,
  contentStyle,
  overlayStyle,
  ...modalProps
}) => {
  const theme = useSafeTheme();
  const platform = usePlatform();
  const insets = useSafeAreaInsets();
  const { trigger: triggerHaptic } = useHaptic({ enabled: haptic });
  
  const colors = theme.colors;
  
  // Animation values
  const translateY = useSharedValue(screenHeight);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Platform-specific configurations
  const platformConfig = useMemo(() => {
    return platform.select({
      ios: {
        defaultPresentationStyle: 'sheet' as const,
        defaultAnimationType: 'slide' as const,
        statusBarStyle: 'light-content' as const,
        borderRadius: 20,
        dragThreshold: 100,
      },
      android: {
        defaultPresentationStyle: 'card' as const,
        defaultAnimationType: 'fade' as const,
        statusBarStyle: 'dark-content' as const,
        borderRadius: 16,
        dragThreshold: 80,
      },
      web: {
        defaultPresentationStyle: 'popup' as const,
        defaultAnimationType: 'scale' as const,
        statusBarStyle: undefined,
        borderRadius: 12,
        dragThreshold: 60,
      },
      default: {
        defaultPresentationStyle: 'card' as const,
        defaultAnimationType: 'fade' as const,
        statusBarStyle: 'default' as const,
        borderRadius: 12,
        dragThreshold: 80,
      },
    });
  }, [platform]);

  // Modal styles based on presentation style and platform
  const modalStyles = useMemo(() => {
    const effectivePresentationStyle = presentationStyle || platformConfig.defaultPresentationStyle;
    const effectiveAnimationType = animationType || platformConfig.defaultAnimationType;
    const effectiveBorderRadius = borderRadius ?? platformConfig.borderRadius;
    const effectiveBackgroundColor = backgroundColor || colors.surface.elevated;
    const effectiveOverlayColor = overlayColor || colors.overlay.medium;

    const baseContentStyle: ViewStyle = {
      backgroundColor: effectiveBackgroundColor,
      borderRadius: effectiveBorderRadius,
      maxWidth: typeof maxWidth === 'string' ? maxWidth : maxWidth,
      maxHeight: typeof maxHeight === 'string' ? maxHeight : maxHeight,
    };

    switch (effectivePresentationStyle) {
      case 'sheet':
        return {
          container: {
            flex: 1,
            justifyContent: 'flex-end' as const,
            backgroundColor: 'transparent',
          },
          content: {
            ...baseContentStyle,
            width: '100%',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingBottom: insets.bottom,
            minHeight: 200,
          },
          overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: effectiveOverlayColor,
          },
        };
      
      case 'card':
        return {
          container: {
            flex: 1,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            backgroundColor: 'transparent',
            padding: 20,
          },
          content: {
            ...baseContentStyle,
            width: '100%',
            shadowColor: '#000',
            ...platform.getShadowStyle('high'),
          },
          overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: effectiveOverlayColor,
          },
        };
      
      case 'fullscreen':
        return {
          container: {
            flex: 1,
            backgroundColor: effectiveBackgroundColor,
          },
          content: {
            flex: 1,
            backgroundColor: effectiveBackgroundColor,
            borderRadius: 0,
          },
          overlay: {},
        };
      
      case 'popup':
        return {
          container: {
            flex: 1,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            backgroundColor: 'transparent',
            padding: 40,
          },
          content: {
            ...baseContentStyle,
            minWidth: 280,
            maxWidth: 400,
            ...platform.getShadowStyle('high'),
          },
          overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: effectiveOverlayColor,
          },
        };
      
      default:
        return {
          container: { flex: 1, backgroundColor: 'transparent' },
          content: baseContentStyle,
          overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: effectiveOverlayColor,
          },
        };
    }
  }, [
    presentationStyle,
    animationType,
    borderRadius,
    backgroundColor,
    overlayColor,
    maxWidth,
    maxHeight,
    platformConfig,
    colors,
    insets,
    platform,
  ]);

  // Animation functions
  const showModal = useCallback(() => {
    const effectiveAnimationType = animationType || platformConfig.defaultAnimationType;
    
    switch (effectiveAnimationType) {
      case 'slide':
        if (presentationStyle === 'sheet') {
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
        break;
      case 'fade':
        opacity.value = withTiming(1, { duration: 300 });
        break;
      case 'scale':
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        opacity.value = withTiming(1, { duration: 300 });
        break;
    }
    
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, [animationType, presentationStyle, platformConfig, translateY, translateX, opacity, scale, backdropOpacity]);

  const hideModal = useCallback(() => {
    const effectiveAnimationType = animationType || platformConfig.defaultAnimationType;
    
    const onComplete = () => {
      'worklet';
      runOnJS(onClose)();
    };

    switch (effectiveAnimationType) {
      case 'slide':
        if (presentationStyle === 'sheet') {
          translateY.value = withTiming(screenHeight, { duration: 300 }, onComplete);
        } else {
          translateX.value = withTiming(screenWidth, { duration: 300 }, onComplete);
        }
        break;
      case 'fade':
        opacity.value = withTiming(0, { duration: 200 }, onComplete);
        break;
      case 'scale':
        scale.value = withTiming(0.9, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, onComplete);
        break;
      default:
        onComplete();
    }
    
    backdropOpacity.value = withTiming(0, { duration: 300 });
  }, [animationType, presentationStyle, platformConfig, translateY, translateX, opacity, scale, backdropOpacity, onClose]);

  // Gesture handler for drag to close
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      if (haptic) {
        runOnJS(triggerHaptic)('selection');
      }
    },
    onActive: (event) => {
      if (presentationStyle === 'sheet' && dragToClose) {
        translateY.value = Math.max(0, event.translationY);
      }
    },
    onEnd: (event) => {
      if (presentationStyle === 'sheet' && dragToClose) {
        if (event.translationY > platformConfig.dragThreshold || event.velocityY > 500) {
          if (haptic) {
            runOnJS(triggerHaptic)('light');
          }
          translateY.value = withTiming(screenHeight, { duration: 300 }, () => {
            runOnJS(onClose)();
          });
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
      }
    },
  });

  // Animation styles
  const animatedContentStyle = useAnimatedStyle(() => {
    const effectiveAnimationType = animationType || platformConfig.defaultAnimationType;
    
    switch (effectiveAnimationType) {
      case 'slide':
        if (presentationStyle === 'sheet') {
          return {
            transform: [{ translateY: translateY.value }],
            opacity: interpolate(
              translateY.value,
              [0, screenHeight * 0.5],
              [1, 0.5],
              Extrapolate.CLAMP
            ),
          };
        } else {
          return {
            transform: [{ translateX: translateX.value }],
          };
        }
      case 'fade':
        return {
          opacity: opacity.value,
        };
      case 'scale':
        return {
          transform: [{ scale: scale.value }],
          opacity: opacity.value,
        };
      default:
        return {};
    }
  });

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Effects
  useEffect(() => {
    if (isVisible) {
      // Reset values
      translateY.value = presentationStyle === 'sheet' ? screenHeight : 0;
      translateX.value = presentationStyle === 'sheet' ? 0 : screenWidth;
      scale.value = 0.9;
      opacity.value = 0;
      backdropOpacity.value = 0;
      
      // Show with delay to allow reset
      const timer = setTimeout(showModal, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, showModal, presentationStyle, translateY, translateX, scale, opacity, backdropOpacity]);

  const handleOverlayPress = useCallback(() => {
    if (dismissible) {
      if (haptic) {
        triggerHaptic('light');
      }
      hideModal();
    }
  }, [dismissible, hideModal, haptic, triggerHaptic]);

  if (!isVisible) {
    return null;
  }

  const modalContent = (
    <View style={[modalStyles.container, style]}>
      {/* Backdrop */}
      {modalStyles.overlay.backgroundColor && (
        <AnimatedPressable
          style={[modalStyles.overlay, animatedOverlayStyle, overlayStyle]}
          onPress={handleOverlayPress}
        />
      )}

      {/* Content */}
      <AnimatedView
        style={[
          modalStyles.content,
          animatedContentStyle,
          contentStyle,
        ]}
      >
        {dragToClose && presentationStyle === 'sheet' && platform.supportsGestures && (
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              backgroundColor: colors.border.medium,
              borderRadius: 2,
              marginTop: 8,
              marginBottom: 8,
            }}
          />
        )}
        {children}
      </AnimatedView>
    </View>
  );

  // Wrap with gesture handler if needed
  if (dragToClose && presentationStyle === 'sheet' && platform.supportsGestures) {
    return (
      <Modal
        transparent
        visible={isVisible}
        statusBarTranslucent={platform.isAndroid}
        {...modalProps}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PanGestureHandler onGestureEvent={gestureHandler}>
            {modalContent}
          </PanGestureHandler>
        </GestureHandlerRootView>
      </Modal>
    );
  }

  return (
    <Modal
      transparent
      visible={isVisible}
      statusBarTranslucent={platform.isAndroid}
      {...modalProps}
    >
      {modalContent}
    </Modal>
  );
};

// Pre-configured modal variants
export const BottomSheetModal: React.FC<Omit<PlatformModalProps, 'presentationStyle'>> = (props) => (
  <PlatformModal presentationStyle="sheet" {...props} />
);

export const CardModal: React.FC<Omit<PlatformModalProps, 'presentationStyle'>> = (props) => (
  <PlatformModal presentationStyle="card" {...props} />
);

export const PopupModal: React.FC<Omit<PlatformModalProps, 'presentationStyle'>> = (props) => (
  <PlatformModal presentationStyle="popup" {...props} />
);

export const FullscreenModal: React.FC<Omit<PlatformModalProps, 'presentationStyle'>> = (props) => (
  <PlatformModal presentationStyle="fullscreen" {...props} />
);

