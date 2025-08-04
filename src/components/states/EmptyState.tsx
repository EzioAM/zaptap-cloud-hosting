import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface EmptyStateProps {
  title?: string;
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
  icon?: string;
  showAction?: boolean;
  type?: 'no-content' | 'no-results' | 'getting-started' | 'offline' | 'maintenance';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  onAction,
  actionLabel = 'Get Started',
  icon,
  showAction = true,
  type = 'no-content',
}) => {
  const theme = useSafeTheme();
  const styles = createStyles(theme);

  // Default configurations based on empty state type
  const getEmptyConfig = () => {
    switch (type) {
      case 'no-results':
        return {
          icon: icon || 'magnify-remove-outline',
          title: title || 'No Results Found',
          message: message || 'Try adjusting your search criteria or filters.',
          actionLabel: actionLabel || 'Clear Filters',
          color: theme.colors?.textSecondary || '#666',
        };
      case 'getting-started':
        return {
          icon: icon || 'rocket-launch-outline',
          title: title || 'Get Started',
          message: message || 'Create your first automation to begin your journey.',
          actionLabel: actionLabel || 'Create Automation',
          color: theme.colors?.primary || '#2196F3',
        };
      case 'offline':
        return {
          icon: icon || 'cloud-off-outline',
          title: title || 'You\'re Offline',
          message: message || 'Check your connection to see the latest content.',
          actionLabel: actionLabel || 'Retry',
          color: theme.colors?.textSecondary || '#666',
        };
      case 'maintenance':
        return {
          icon: icon || 'tools',
          title: title || 'Under Maintenance',
          message: message || 'We\'re making improvements. Please check back later.',
          actionLabel: actionLabel || 'Refresh',
          color: theme.colors?.warning || theme.colors?.primary || '#FF9800',
        };
      default:
        return {
          icon: icon || 'inbox-outline',
          title: title || 'Nothing Here Yet',
          message: message || 'Content will appear here when available.',
          actionLabel: actionLabel || 'Refresh',
          color: theme.colors?.textSecondary || '#666',
        };
    }
  };

  const config = getEmptyConfig();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={56}
          color={config.color}
        />
      </View>
      
      <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
        {config.title}
      </Text>
      
      <Text style={[styles.message, { color: theme.colors?.textSecondary || '#666' }]}>
        {config.message}
      </Text>

      {showAction && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>
            {config.actionLabel}
          </Text>
        </TouchableOpacity>
      )}

      {/* Additional contextual tips */}
      {type === 'getting-started' && (
        <View style={styles.tipsContainer}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
            Pro Tips:
          </Text>
          <Text style={[styles.tip, { color: theme.colors?.textSecondary || '#666' }]}>
            • Start with simple automations like notifications
          </Text>
          <Text style={[styles.tip, { color: theme.colors?.textSecondary || '#666' }]}>
            • Explore the gallery for inspiration
          </Text>
          <Text style={[styles.tip, { color: theme.colors?.textSecondary || '#666' }]}>
            • Test your automations before deploying
          </Text>
        </View>
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
  
  const colors = {
    surface: '#f5f5f5',
    ...theme?.colors
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
      width: 96,
      height: 96,
      borderRadius: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    actionButton: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.round,
      marginBottom: spacing.lg,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    tipsContainer: {
      alignSelf: 'stretch',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    tip: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.xs,
    },
  });
};