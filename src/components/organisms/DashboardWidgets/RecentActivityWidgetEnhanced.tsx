import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetRecentActivityQuery } from '../../../store/api/dashboardApi';
import EnhancedLoadingSkeleton from '../../common/EnhancedLoadingSkeleton';
// Safe imports with fallbacks
let gradients: any = {};
let subtleGradients: any = {};
let typography: any = {};
let fontWeights: any = {};

try {
  const gradientsModule = require('../../../theme/gradients');
  gradients = gradientsModule.gradients || {
    success: { colors: ['#10B981', '#34D399'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    error: { colors: ['#EF4444', '#F87171'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    ocean: { colors: ['#0EA5E9', '#38BDF8'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    primary: { colors: ['#6366F1', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  subtleGradients = gradientsModule.subtleGradients || {
    lightGray: { colors: ['#f8f9fa', '#e9ecef', '#dee2e6'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
    lightBlue: { colors: ['#EFF6FF', '#DBEAFE', '#BFDBFE'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  };
} catch (error) {
  console.warn('Gradients theme not found, using defaults');
  gradients = {
    success: { colors: ['#10B981', '#34D399'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    error: { colors: ['#EF4444', '#F87171'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    ocean: { colors: ['#0EA5E9', '#38BDF8'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    primary: { colors: ['#6366F1', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  subtleGradients = {
    lightGray: { colors: ['#f8f9fa', '#e9ecef', '#dee2e6'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
    lightBlue: { colors: ['#EFF6FF', '#DBEAFE', '#BFDBFE'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  };
}

try {
  const typographyModule = require('../../../theme/typography');
  typography = typographyModule.typography || {
    titleMedium: { fontSize: 16, fontWeight: '500' },
    bodySmall: { fontSize: 14, fontWeight: '400' },
    overline: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    headlineMedium: { fontSize: 20, fontWeight: '600' },
    labelMedium: { fontSize: 14, fontWeight: '500' },
    titleSmall: { fontSize: 14, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '400' },
    labelSmall: { fontSize: 11, fontWeight: '500' },
  };
  fontWeights = typographyModule.fontWeights || {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
} catch (error) {
  console.warn('Typography theme not found, using defaults');
  typography = {
    titleMedium: { fontSize: 16, fontWeight: '500' },
    bodySmall: { fontSize: 14, fontWeight: '400' },
    overline: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    headlineMedium: { fontSize: 20, fontWeight: '600' },
    labelMedium: { fontSize: 14, fontWeight: '500' },
    titleSmall: { fontSize: 14, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '400' },
    labelSmall: { fontSize: 11, fontWeight: '500' },
  };
  fontWeights = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
}
import * as Haptics from 'expo-haptics';
import { EventLogger } from '../../../utils/EventLogger';

const { width: screenWidth } = Dimensions.get('window');

interface ActivityItem {
  id: string;
  name: string;
  status: 'success' | 'error' | 'running';
  timestamp: Date;
  executionTime?: number;
  automationType?: string;
}

interface TimelineItemProps {
  activity: ActivityItem;
  isLast: boolean;
  index: number;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
}

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const getActivityIcon = (type?: string): string => {
  switch (type) {
    case 'webhook': return 'webhook';
    case 'email': return 'email';
    case 'sms': return 'message-text';
    case 'notification': return 'bell';
    case 'automation': return 'robot';
    default: return 'lightning-bolt';
  }
};

const TimelineItem: React.FC<TimelineItemProps> = ({ 
  activity, 
  isLast, 
  index,
  onDelete,
  onRetry,
}) => {
  const theme = useSafeTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [timeAgo, setTimeAgo] = useState(getRelativeTime(activity.timestamp));

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(getRelativeTime(activity.timestamp));
    }, 60000);
    return () => clearInterval(interval);
  }, [activity.timestamp]);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for status indicator
    if (activity.status === 'running') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          // Swipe right - retry action
          Animated.timing(translateX, {
            toValue: screenWidth,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            if (onRetry) onRetry(activity.id);
            translateX.setValue(0);
          });
        } else if (gestureState.dx < -100) {
          // Swipe left - delete action
          Animated.timing(translateX, {
            toValue: -screenWidth,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            if (onDelete) onDelete(activity.id);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getStatusColor = () => {
    switch (activity.status) {
      case 'success': return '#4CAF50';
      case 'error': return '#FF5252';
      case 'running': return '#2196F3';
      default: return '#757575';
    }
  };

  const getStatusGradient = (): keyof typeof gradients => {
    switch (activity.status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'running': return 'ocean';
      default: return 'primary';
    }
  };

  return (
    <Animated.View
      style={[
        styles.timelineItem,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateX },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Timeline connector */}
      {!isLast && (
        <View style={styles.timelineConnector} />
      )}

      {/* Status indicator with pulse */}
      <View style={styles.statusContainer}>
        <Animated.View
          style={[
            styles.statusDot,
            {
              backgroundColor: getStatusColor(),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        {activity.status === 'running' && (
          <Animated.View
            style={[
              styles.statusPulse,
              {
                backgroundColor: getStatusColor(),
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.3],
                  outputRange: [0.4, 0],
                }),
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}
      </View>

      {/* Activity content */}
      <View style={[styles.activityContent, { backgroundColor: theme.colors?.surface || '#fff' }]}>
        <View style={styles.activityHeader}>
          <LinearGradient
            colors={gradients[getStatusGradient()].colors}
            start={gradients[getStatusGradient()].start}
            end={gradients[getStatusGradient()].end}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons
              name={getActivityIcon(activity.automationType)}
              size={20}
              color="#FFFFFF"
            />
          </LinearGradient>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityName, { color: theme.colors?.text || '#000' }]}>
              {activity.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timeText, { color: theme.colors?.textSecondary || '#666' }]}>
                {timeAgo}
              </Text>
              {activity.executionTime && (
                <>
                  <Text style={[styles.separator, { color: theme.colors?.textSecondary || '#666' }]}>
                    •
                  </Text>
                  <Text style={[styles.executionTime, { color: theme.colors?.textSecondary || '#666' }]}>
                    {activity.executionTime}ms
                  </Text>
                </>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {activity.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Swipe action hints */}
      <View style={styles.swipeActions}>
        <View style={[styles.retryAction, { backgroundColor: '#2196F3' }]}>
          <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
        </View>
        <View style={[styles.deleteAction, { backgroundColor: '#FF5252' }]}>
          <MaterialCommunityIcons name="delete" size={24} color="#FFFFFF" />
        </View>
      </View>
    </Animated.View>
  );
};

export const RecentActivityWidgetEnhanced: React.FC = () => {
  const theme = useSafeTheme();
  const { data: activities, isLoading, error } = useGetRecentActivityQuery();
  const containerScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.spring(containerScale, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    EventLogger.debug('RecentActivityWidgetEnhanced', 'Delete activity:', id);
  };

  const handleRetry = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    EventLogger.debug('RecentActivityWidgetEnhanced', 'Retry activity:', id);
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={subtleGradients.lightGray.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
            Recent Activity
          </Text>
        </View>
        <EnhancedLoadingSkeleton 
          variant="list" 
          count={3} 
          showAnimation={true}
        />
      </LinearGradient>
    );
  }

  if (error || !activities || activities.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: theme.colors?.surface || '#fff' }]}>
        <MaterialCommunityIcons 
          name="history" 
          size={48} 
          color={theme.colors?.textSecondary || '#999'} 
        />
        <Text style={[styles.emptyText, { color: theme.colors?.textSecondary || '#666' }]}>
          No recent activity
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors?.textSecondary || '#999' }]}>
          Your automation runs will appear here
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: containerScale }] }}>
      <LinearGradient
        colors={subtleGradients.lightBlue.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
        )}
        
        <View style={[styles.content, styles.glassContent]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.overline, { color: theme.colors?.primary || '#6366F1' }]}>
                ACTIVITY
              </Text>
              <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
                Recent Runs
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => {
                console.log('DEBUG: RecentActivity View All pressed');
                try {
                  require('expo-haptics').impactAsync(require('expo-haptics').ImpactFeedbackStyle.Light);
                } catch (error) {
                  // Haptics not available
                }
                // Navigate to activity screen or call onViewAll if available
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.viewAllText, { color: theme.colors?.primary || '#6366F1' }]}>
                View All
              </Text>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color={theme.colors?.primary || '#6366F1'} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.activityList}
            showsVerticalScrollIndicator={false}
          >
            {activities.slice(0, 5).map((activity, index) => (
              <TimelineItem
                key={activity.id}
                activity={activity}
                isLast={index === Math.min(activities.length - 1, 4)}
                index={index}
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  glassContent: {
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.3)',
      android: 'rgba(255, 255, 255, 0.9)',
    }),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    ...typography.titleMedium,
    marginTop: 12,
  },
  emptySubtext: {
    ...typography.bodySmall,
    marginTop: 4,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  overline: {
    ...typography.overline,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: fontWeights.bold,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
  },
  viewAllText: {
    ...typography.labelMedium,
    fontWeight: fontWeights.medium,
  },
  activityList: {
    maxHeight: 300,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 16,
    paddingLeft: 40,
  },
  timelineConnector: {
    position: 'absolute',
    left: 19,
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  statusContainer: {
    position: 'absolute',
    left: 10,
    top: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusPulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  activityContent: {
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...typography.titleSmall,
    fontWeight: fontWeights.medium,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...typography.caption,
  },
  separator: {
    marginHorizontal: 6,
    ...typography.caption,
  },
  executionTime: {
    ...typography.caption,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.semibold,
    fontSize: 10,
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: -1,
  },
  retryAction: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteAction: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default RecentActivityWidgetEnhanced;