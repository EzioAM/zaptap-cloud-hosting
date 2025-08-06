import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../../utils/EventLogger';

export interface OfflineFallbackProps {
  title?: string;
  message?: string;
  style?: ViewStyle;
  onRefresh?: () => void;
  onViewCached?: () => void;
  onGoOnline?: () => void;
  showCachedData?: boolean;
  showRefresh?: boolean;
  cachedItemsCount?: number;
  lastSyncTime?: Date;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
  title = 'You\'re Offline',
  message = 'Some features may not be available without an internet connection.',
  style,
  onRefresh,
  onViewCached,
  onGoOnline,
  showCachedData = true,
  showRefresh = true,
  cachedItemsCount,
  lastSyncTime,
}) => {
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);

  useEffect(() => {
    const handleOnlineChange = () => {
      const online = navigator?.onLine ?? true;
      setIsOnline(online);
      
      EventLogger.info('OfflineFallback', `Connection status changed`, { isOnline: online });
      
      if (online && onGoOnline) {
        onGoOnline();
      }
    };

    window?.addEventListener?.('online', handleOnlineChange);
    window?.addEventListener?.('offline', handleOnlineChange);

    return () => {
      window?.removeEventListener?.('online', handleOnlineChange);
      window?.removeEventListener?.('offline', handleOnlineChange);
    };
  }, [onGoOnline]);

  const handleRefresh = () => {
    if (isOnline) {
      EventLogger.userAction('offline_fallback_refresh', 'OfflineMode');
      onRefresh?.();
    } else {
      Alert.alert(
        'Still Offline',
        'Please check your internet connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleViewCached = () => {
    EventLogger.userAction('offline_fallback_view_cached', 'OfflineMode', {
      cachedItemsCount,
    });
    onViewCached?.();
  };

  const getLastSyncText = () => {
    if (!lastSyncTime) return null;
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Last synced ${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `Last synced ${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `Last synced ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Last synced just now';
  };

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons 
        name={isOnline ? "wifi-strength-2" : "wifi-off"} 
        size={80} 
        color={isOnline ? "#ff9800" : "#ff5252"} 
        style={styles.icon}
      />
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {!isOnline && (
        <View style={styles.statusIndicator}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.statusText}>No Internet Connection</Text>
        </View>
      )}

      {isOnline && (
        <View style={[styles.statusIndicator, styles.onlineIndicator]}>
          <MaterialCommunityIcons name="wifi" size={16} color="#fff" />
          <Text style={styles.statusText}>Connection Restored</Text>
        </View>
      )}
      
      {lastSyncTime && (
        <Text style={styles.syncText}>{getLastSyncText()}</Text>
      )}
      
      <View style={styles.actions}>
        {showRefresh && (
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.primaryButton,
              !isOnline && styles.disabledButton
            ]} 
            onPress={handleRefresh}
            disabled={!isOnline}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {isOnline ? 'Refresh' : 'Waiting for Connection...'}
            </Text>
          </TouchableOpacity>
        )}
        
        {showCachedData && onViewCached && (
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleViewCached}
          >
            <MaterialCommunityIcons name="database-outline" size={16} color="#333" />
            <Text style={styles.secondaryButtonText}>
              View Cached Data
              {cachedItemsCount !== undefined && ` (${cachedItemsCount})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.offlineFeatures}>
        <Text style={styles.featuresTitle}>Available Offline:</Text>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#4caf50" />
            <Text style={styles.featureText}>View cached content</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#4caf50" />
            <Text style={styles.featureText}>Create drafts</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#f44336" />
            <Text style={styles.featureText}>Sync with cloud</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#f44336" />
            <Text style={styles.featureText}>Real-time updates</Text>
          </View>
        </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5252',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  onlineIndicator: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  syncText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 300,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
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
  offlineFeatures: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    maxWidth: 320,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
});

export default OfflineFallback;