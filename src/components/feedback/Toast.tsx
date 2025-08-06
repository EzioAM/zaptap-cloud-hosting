import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onHide,
  action,
}) => {
  const theme = useSafeTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  const styles = createStyles(theme);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          backgroundColor: theme.colors?.semantic?.success || '#4CAF50',
          textColor: '#FFFFFF',
        };
      case 'error':
        return {
          icon: 'alert-circle',
          backgroundColor: theme.colors?.semantic?.error || theme.colors?.error || '#F44336',
          textColor: '#FFFFFF',
        };
      case 'warning':
        return {
          icon: 'alert',
          backgroundColor: theme.colors?.semantic?.warning || '#FF9800',
          textColor: '#FFFFFF',
        };
      default:
        return {
          icon: 'information',
          backgroundColor: theme.colors?.primary || '#6200ee',
          textColor: '#FFFFFF',
        };
    }
  };

  const config = getToastConfig();

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      timeoutRef.current = setTimeout(() => {
        handleHide();
      }, duration);
    } else {
      handleHide();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration]);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) {
        onHide();
      }
    });
  };

  if (!visible && slideAnim._value === -100) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={20}
          color={config.textColor}
        />
        <Text style={[styles.message, { color: config.textColor }]}>
          {message}
        </Text>
      </View>
      
      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            action.onPress();
            handleHide();
          }}
        >
          <Text style={[styles.actionText, { color: config.textColor }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.closeButton} onPress={handleHide}>
        <MaterialCommunityIcons
          name="close"
          size={18}
          color={config.textColor}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 60,
      left: theme.spacing?.md || 16,
      right: theme.spacing?.md || 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing?.md || 16,
      paddingVertical: theme.spacing?.sm || 8,
      borderRadius: 12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1000,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    message: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: theme.spacing?.sm || 8,
      flex: 1,
    },
    actionButton: {
      marginLeft: theme.spacing?.md || 16,
      paddingHorizontal: theme.spacing?.sm || 8,
      paddingVertical: theme.spacing?.xs || 4,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    closeButton: {
      marginLeft: theme.spacing?.sm || 8,
      padding: theme.spacing?.xs || 4,
    },
  });