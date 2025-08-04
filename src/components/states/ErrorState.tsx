import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Default configurations based on error type
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: icon || 'wifi-off',
          title: title || 'Connection Problem',
          message: message || 'Please check your internet connection and try again.',
          color: theme.colors.error,
        };
      case 'timeout':
        return {
          icon: icon || 'clock-alert-outline',
          title: title || 'Request Timeout',
          message: message || 'The request is taking longer than expected. Please try again.',
          color: theme.colors.warning || theme.colors.error,
        };
      case 'permission':
        return {
          icon: icon || 'shield-alert-outline',
          title: title || 'Permission Required',
          message: message || 'You need permission to access this feature.',
          color: theme.colors.warning || theme.colors.error,
        };
      case 'not-found':
        return {
          icon: icon || 'file-find-outline',
          title: title || 'Content Not Found',
          message: message || 'The content you are looking for could not be found.',
          color: theme.colors.textSecondary,
        };
      default:
        return {
          icon: icon || 'alert-circle-outline',
          title: title || 'Something Went Wrong',
          message: message || 'An unexpected error occurred. Please try again.',
          color: theme.colors.error,
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
      
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {config.title}
      </Text>
      
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {config.message}
      </Text>

      {showRetry && onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
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

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.xl,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
      gap: theme.spacing.sm,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });