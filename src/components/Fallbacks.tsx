/**
 * Fallback Components - UI components for error and loading states
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Error Fallback Component
 */
interface ErrorFallbackProps {
  title?: string;
  message?: string;
  icon?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  icon = 'alert-circle-outline',
  onRetry,
  showRetry = true,
}) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={64}
        color="#B00020"
        style={styles.icon}
      />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {showRetry && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Loading Fallback Component
 */
interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'Loading...',
  size = 'large',
  color = '#6200ee',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={[styles.loadingText, { color }]}>{message}</Text>}
    </View>
  );
};

/**
 * Empty State Fallback Component
 */
interface EmptyFallbackProps {
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyFallback: React.FC<EmptyFallbackProps> = ({
  title = 'No Data',
  message = 'There is no data to display.',
  icon = 'inbox-outline',
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={64}
        color="#999"
        style={styles.icon}
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Offline Fallback Component
 */
interface OfflineFallbackProps {
  onRetry?: () => void;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({ onRetry }) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="wifi-off"
        size={64}
        color="#FF9800"
        style={styles.icon}
      />
      <Text style={styles.offlineTitle}>You're Offline</Text>
      <Text style={styles.offlineMessage}>
        Please check your internet connection and try again.
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  // Error styles
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B00020',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading styles
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  // Empty state styles
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Offline styles
  offlineTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 10,
    textAlign: 'center',
  },
  offlineMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
});