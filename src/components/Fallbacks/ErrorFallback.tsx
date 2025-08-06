import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface ErrorFallbackProps {
  title?: string;
  message?: string;
  icon?: string;
  iconSize?: number;
  onRetry?: () => void;
  onReset?: () => void;
  retryText?: string;
  resetText?: string;
  style?: ViewStyle;
  showRetry?: boolean;
  showReset?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  icon = 'alert-circle-outline',
  iconSize = 48,
  onRetry,
  onReset,
  retryText = 'Try Again',
  resetText = 'Reset',
  style,
  showRetry = true,
  showReset = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons 
        name={icon as any} 
        size={iconSize} 
        color="#ff5252" 
        style={styles.icon}
      />
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      <View style={styles.actions}>
        {showRetry && onRetry && (
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={onRetry}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>{retryText}</Text>
          </TouchableOpacity>
        )}
        
        {showReset && onReset && (
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={onReset}
          >
            <MaterialCommunityIcons name="restart" size={16} color="#333" />
            <Text style={styles.secondaryButtonText}>{resetText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ErrorFallback;