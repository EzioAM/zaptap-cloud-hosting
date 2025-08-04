import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();
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
          color: theme.colors.textSecondary,
        };
      case 'getting-started':
        return {
          icon: icon || 'rocket-launch-outline',
          title: title || 'Get Started',
          message: message || 'Create your first automation to begin your journey.',
          actionLabel: actionLabel || 'Create Automation',
          color: theme.colors.primary,
        };
      case 'offline':
        return {
          icon: icon || 'cloud-off-outline',
          title: title || 'You\'re Offline',
          message: message || 'Check your connection to see the latest content.',
          actionLabel: actionLabel || 'Retry',
          color: theme.colors.textSecondary,
        };
      case 'maintenance':
        return {
          icon: icon || 'tools',
          title: title || 'Under Maintenance',
          message: message || 'We\'re making improvements. Please check back later.',
          actionLabel: actionLabel || 'Refresh',
          color: theme.colors.warning || theme.colors.primary,
        };
      default:
        return {
          icon: icon || 'inbox-outline',
          title: title || 'Nothing Here Yet',
          message: message || 'Content will appear here when available.',
          actionLabel: actionLabel || 'Refresh',
          color: theme.colors.textSecondary,
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
      
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {config.title}
      </Text>
      
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {config.message}
      </Text>

      {showAction && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
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
          <Text style={[styles.tip, { color: theme.colors.textSecondary }]}>
            • Start with simple automations like notifications
          </Text>
          <Text style={[styles.tip, { color: theme.colors.textSecondary }]}>
            • Explore the gallery for inspiration
          </Text>
          <Text style={[styles.tip, { color: theme.colors.textSecondary }]}>
            • Test your automations before deploying
          </Text>
        </View>
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
      width: 96,
      height: 96,
      borderRadius: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    actionButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
      marginBottom: theme.spacing.lg,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    tipsContainer: {
      alignSelf: 'stretch',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    tip: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: theme.spacing.xs,
    },
  });