import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNetwork,
  useNetworkIndicator,
  useSyncStatus,
  useOfflineQueue,
} from '../../contexts/NetworkContext';
import { logger } from '../../services/analytics/AnalyticsService';

/**
 * Props for OfflineIndicator component
 */
interface OfflineIndicatorProps {
  style?: any;
  showDetails?: boolean;
  position?: 'top' | 'bottom';
  autoHide?: boolean;
  autoHideDuration?: number;
}

/**
 * Network quality indicator colors
 */
const getQualityColor = (quality: string): string => {
  switch (quality) {
    case 'excellent':
      return '#4CAF50'; // Green
    case 'good':
      return '#8BC34A'; // Light Green
    case 'fair':
      return '#FF9800'; // Orange
    case 'poor':
      return '#F44336'; // Red
    case 'offline':
      return '#9E9E9E'; // Gray
    default:
      return '#9E9E9E';
  }
};

/**
 * Get network quality icon
 */
const getQualityIcon = (quality: string): string => {
  switch (quality) {
    case 'excellent':
      return 'wifi';
    case 'good':
      return 'cellular';
    case 'fair':
      return 'cellular-outline';
    case 'poor':
      return 'warning';
    case 'offline':
      return 'cloud-offline';
    default:
      return 'help';
  }
};

/**
 * Comprehensive offline indicator component
 * Shows connection status, sync progress, and pending operations
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  style,
  showDetails = true,
  position = 'top',
  autoHide = false,
  autoHideDuration = 3000,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [slideAnim] = useState(new Animated.Value(1));
  
  const { isOnline, connectionType } = useNetwork();
  const { quality, showOfflineIndicator } = useNetworkIndicator();
  const { isSyncing, syncProgress, forceSync } = useSyncStatus();
  const { pendingOperations, failedOperations, retryFailedOperations } = useOfflineQueue();

  /**
   * Auto hide functionality
   */
  useEffect(() => {
    if (autoHide && isOnline && !isSyncing) {
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, autoHideDuration);

      return () => clearTimeout(timer);
    } else if (!visible && (showOfflineIndicator || isSyncing)) {
      setVisible(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [autoHide, isOnline, isSyncing, showOfflineIndicator, autoHideDuration, slideAnim, visible]);

  /**
   * Handle retry button press
   */
  const handleRetry = async () => {
    try {
      logger.info('OfflineIndicator: User requested retry');
      
      if (failedOperations > 0) {
        await retryFailedOperations();
      } else {
        await forceSync();
      }
    } catch (error) {
      logger.error('OfflineIndicator: Retry failed', { error });
    }
  };

  /**
   * Handle force sync
   */
  const handleForceSync = async () => {
    try {
      logger.info('OfflineIndicator: User requested force sync');
      await forceSync();
    } catch (error) {
      logger.error('OfflineIndicator: Force sync failed', { error });
    }
  };

  /**
   * Toggle expanded view
   */
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  /**
   * Get status message
   */
  const getStatusMessage = (): string => {
    if (isSyncing) {
      if (syncProgress.total > 0) {
        return `Syncing... ${syncProgress.completed}/${syncProgress.total}`;
      }
      return 'Syncing...';
    }

    if (!isOnline) {
      return 'No internet connection';
    }

    if (pendingOperations > 0) {
      return `${pendingOperations} operation${pendingOperations === 1 ? '' : 's'} pending`;
    }

    if (failedOperations > 0) {
      return `${failedOperations} operation${failedOperations === 1 ? '' : 's'} failed`;
    }

    switch (quality) {
      case 'excellent':
        return 'Excellent connection';
      case 'good':
        return 'Good connection';
      case 'fair':
        return 'Fair connection';
      case 'poor':
        return 'Poor connection';
      default:
        return 'Connected';
    }
  };

  /**
   * Get connection type display text
   */
  const getConnectionTypeText = (): string => {
    switch (connectionType) {
      case 'wifi':
        return 'Wi-Fi';
      case 'cellular':
        return 'Cellular';
      case 'ethernet':
        return 'Ethernet';
      case 'bluetooth':
        return 'Bluetooth';
      case 'vpn':
        return 'VPN';
      case 'other':
        return 'Other';
      default:
        return 'Unknown';
    }
  };

  // Don't render if not visible and auto-hide is enabled
  if (autoHide && !visible) {
    return null;
  }

  // Don't render if online and no pending operations (unless details requested)
  if (!showDetails && isOnline && pendingOperations === 0 && failedOperations === 0 && !isSyncing) {
    return null;
  }

  const qualityColor = getQualityColor(quality);
  const qualityIcon = getQualityIcon(quality);
  const statusMessage = getStatusMessage();

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'bottom' && styles.bottomPosition,
        { backgroundColor: qualityColor },
        { transform: [{ translateY: slideAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={showDetails ? toggleExpanded : undefined}
        activeOpacity={showDetails ? 0.7 : 1}
      >
        <View style={styles.statusRow}>
          <Ionicons
            name={qualityIcon}
            size={16}
            color="white"
            style={styles.icon}
          />
          <Text style={styles.statusText} numberOfLines={1}>
            {statusMessage}
          </Text>
          
          {/* Sync progress indicator */}
          {isSyncing && syncProgress.total > 0 && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${(syncProgress.completed / syncProgress.total) * 100}%`,
                  },
                ]}
              />
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            {(failedOperations > 0 || (!isOnline && pendingOperations > 0)) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRetry}
                disabled={isSyncing}
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color="white"
                  style={isSyncing && styles.spinning}
                />
              </TouchableOpacity>
            )}

            {isOnline && !isSyncing && pendingOperations === 0 && failedOperations === 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleForceSync}
              >
                <Ionicons name="sync" size={14} color="white" />
              </TouchableOpacity>
            )}

            {showDetails && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={toggleExpanded}
              >
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Connection:</Text>
            <Text style={styles.detailValue}>
              {isOnline ? getConnectionTypeText() : 'Offline'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quality:</Text>
            <Text style={styles.detailValue}>
              {quality.charAt(0).toUpperCase() + quality.slice(1)}
            </Text>
          </View>

          {pendingOperations > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pending:</Text>
              <Text style={styles.detailValue}>{pendingOperations} operations</Text>
            </View>
          )}

          {failedOperations > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Failed:</Text>
              <Text style={styles.detailValue}>{failedOperations} operations</Text>
            </View>
          )}

          {isSyncing && syncProgress.total > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Progress:</Text>
              <Text style={styles.detailValue}>
                {syncProgress.completed}/{syncProgress.total}
                {syncProgress.failed > 0 && ` (${syncProgress.failed} failed)`}
              </Text>
            </View>
          )}

          {syncProgress.currentOperation && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current:</Text>
              <Text style={[styles.detailValue, styles.currentOperation]} numberOfLines={1}>
                {syncProgress.currentOperation}
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

/**
 * Simple connection status badge
 */
export const ConnectionStatusBadge: React.FC<{ style?: any }> = ({ style }) => {
  const { isOnline } = useNetwork();
  const { quality } = useNetworkIndicator();
  const { isSyncing } = useSyncStatus();

  if (isOnline && !isSyncing) {
    return null;
  }

  const qualityColor = getQualityColor(quality);
  const qualityIcon = getQualityIcon(quality);

  return (
    <View style={[styles.badge, { backgroundColor: qualityColor }, style]}>
      <Ionicons
        name={isSyncing ? 'sync' : qualityIcon}
        size={12}
        color="white"
        style={isSyncing && styles.spinning}
      />
    </View>
  );
};

/**
 * Sync progress bar component
 */
export const SyncProgressBar: React.FC<{ style?: any }> = ({ style }) => {
  const { isSyncing, syncProgress } = useSyncStatus();

  if (!isSyncing || syncProgress.total === 0) {
    return null;
  }

  const progress = syncProgress.completed / syncProgress.total;

  return (
    <View style={[styles.progressBarContainer, style]}>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {syncProgress.completed}/{syncProgress.total}
      </Text>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderRadius: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bottomPosition: {
    top: 'auto',
    bottom: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  spinning: {
    // Add spinning animation if needed
  },
  details: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    color: 'white',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  currentOperation: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    minWidth: 40,
    textAlign: 'right',
  },
});

export default OfflineIndicator;