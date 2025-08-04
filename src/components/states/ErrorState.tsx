import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: string;
  showRetry?: boolean;
  type?: 'network' | 'timeout' | 'generic' | 'permission' | 'not-found';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon,
  showRetry = true,
  type = 'generic',
}) => {
  const theme = useSafeTheme();
  const styles = createStyles(theme);

  // Default configurations based on error type
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: icon || 'wifi-off',
          title: title || 'Connection Problem',
          message: message || 'Please check your internet connection and try again.',
          color: theme.colors?.error || '#F44336',
        };
      case 'timeout':
        return {
          icon: icon || 'clock-alert-outline',
          title: title || 'Request Timeout',
          message: message || 'The request is taking longer than expected. Please try again.',
          color: theme.colors?.warning || theme.colors?.error || '#FF9800',
        };
      case 'permission':
        return {
          icon: icon || 'shield-alert-outline',
          title: title || 'Permission Required',
          message: message || 'You need permission to access this feature.',
          color: theme.colors?.warning || theme.colors?.error || '#FF9800',
        };
      case 'not-found':
        return {
          icon: icon || 'file-find-outline',
          title: title || 'Content Not Found',
          message: message || 'The content you are looking for could not be found.',
          color: theme.colors?.textSecondary || '#666',
        };
      default:
        return {
          icon: icon || 'alert-circle-outline',
          title: title || 'Something Went Wrong',
          message: message || 'An unexpected error occurred. Please try again.',
          color: theme.colors?.error || '#F44336',
        };
    }
  };

  const config = getErrorConfig();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={48}
          color={config.color}
        />
      </View>
      
      <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
        {config.title}
      </Text>
      
      <Text style={[styles.message, { color: theme.colors?.textSecondary || '#666' }]}>
        {config.message}
      </Text>

      {showRetry && onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.retryButtonText}>
            {retryLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: any) => {
  // Safe defaults for theme properties
  const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    ...theme?.spacing
  };
  
  const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    round: 24,
    ...theme?.borderRadius
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.xl,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.round,
      gap: spacing.sm,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};