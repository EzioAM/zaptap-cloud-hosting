import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../../utils/EventLogger';

export interface NetworkErrorFallbackProps {
  onRetry?: () => void;
  onGoOffline?: () => void;
  style?: ViewStyle;
  title?: string;
  message?: string;
  showOfflineMode?: boolean;
  enableAutoRetry?: boolean;
  retryInterval?: number;
  maxAutoRetries?: number;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({
  onRetry,
  onGoOffline,
  style,
  title = 'Connection Problem',
  message = 'Unable to connect to the server. Please check your internet connection.',
  showOfflineMode = true,
  enableAutoRetry = true,
  retryInterval = 5000,
  maxAutoRetries = 3,
}) => {
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  useEffect(() => {
    const handleOnlineChange = () => {
      const online = navigator?.onLine ?? true;
      setIsOnline(online);
      
      if (online && onRetry) {
        EventLogger.info('NetworkError', 'Connection restored, auto-retrying');
        onRetry();
      }
    };

    window?.addEventListener?.('online', handleOnlineChange);
    window?.addEventListener?.('offline', handleOnlineChange);

    return () => {
      window?.removeEventListener?.('online', handleOnlineChange);
      window?.removeEventListener?.('offline', handleOnlineChange);
    };
  }, [onRetry]);

  useEffect(() => {
    if (!enableAutoRetry || autoRetryCount >= maxAutoRetries || !onRetry) {
      return;
    }

    const interval = setInterval(() => {
      setNextRetryIn(prev => {
        if (prev <= 1) {
          EventLogger.info(
            'NetworkError', 
            'Auto-retry attempt',
            { attempt: autoRetryCount + 1, maxAttempts: maxAutoRetries }
          );
          
          setAutoRetryCount(count => count + 1);
          onRetry();
          return retryInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    // Initial countdown
    setNextRetryIn(retryInterval / 1000);

    return () => clearInterval(interval);
  }, [enableAutoRetry, autoRetryCount, maxAutoRetries, onRetry, retryInterval]);

  const handleManualRetry = () => {
    EventLogger.info('NetworkError', 'Manual retry triggered');
    setAutoRetryCount(0);
    setNextRetryIn(0);
    onRetry?.();
  };

  const handleGoOffline = () => {
    EventLogger.info('NetworkError', 'User chose offline mode');
    onGoOffline?.();
  };

  const getConnectionIcon = () => {
    if (!isOnline) return 'wifi-off';
    return 'wifi-strength-outline';
  };

  const getConnectionMessage = () => {
    if (!isOnline) {
      return 'You appear to be offline. Please check your internet connection.';
    }
    return message;
  };

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons 
        name={getConnectionIcon() as any}
        size={64} 
        color={isOnline ? "#ff9800" : "#ff5252"} 
        style={styles.icon}
      />
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{getConnectionMessage()}</Text>
      
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
      
      {enableAutoRetry && autoRetryCount < maxAutoRetries && nextRetryIn > 0 && (
        <Text style={styles.autoRetryText}>
          Auto-retry in {nextRetryIn}s... ({autoRetryCount + 1}/{maxAutoRetries})
        </Text>
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleManualRetry}
        >
          <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Retry Now</Text>
        </TouchableOpacity>
        
        {showOfflineMode && onGoOffline && (
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleGoOffline}
          >
            <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#333" />
            <Text style={styles.secondaryButtonText}>Continue Offline</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.troubleshootingContainer}>
        <Text style={styles.troubleshootingTitle}>Troubleshooting:</Text>
        <Text style={styles.troubleshootingItem}>• Check your WiFi or mobile data</Text>
        <Text style={styles.troubleshootingItem}>• Try switching networks</Text>
        <Text style={styles.troubleshootingItem}>• Restart your device if needed</Text>
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  autoRetryText: {
    fontSize: 14,
    color: '#ff9800',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  troubleshootingContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    maxWidth: 300,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  troubleshootingItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default NetworkErrorFallback;