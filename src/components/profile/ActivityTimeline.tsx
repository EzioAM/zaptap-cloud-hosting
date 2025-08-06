import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableAnimated } from '../automation/AnimationHelpers';
import { ANIMATION_CONFIG } from '../../constants/animations';

interface ActivityItem {
  id: string;
  type: 'automation_created' | 'automation_shared' | 'automation_run' | 'achievement_unlocked' | 'profile_updated';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
  metadata?: {
    automationName?: string;
    achievementName?: string;
    runCount?: number;
    [key: string]: any;
  };
  dismissible?: boolean;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onActivityPress?: (activity: ActivityItem) => void;
  onDismissActivity?: (activityId: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const ACTIVITY_COLORS = {
  automation_created: '#4CAF50',
  automation_shared: '#2196F3',
  automation_run: '#9C27B0',
  achievement_unlocked: '#FF6B00',
  profile_updated: '#607D8B',
};

const ACTIVITY_ICONS = {
  automation_created: 'plus-circle',
  automation_shared: 'share-variant',
  automation_run: 'play-circle',
  achievement_unlocked: 'trophy',
  profile_updated: 'account-edit',
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  return date.toLocaleDateString();
};

const getTimeGroup = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
};

const AnimatedActivityItem: React.FC<{
  activity: ActivityItem;
  index: number;
  isLast: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
}> = ({ activity, index, isLast, onPress, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const dismissAnim = useRef(new Animated.Value(0)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;
  
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const delay = index * 100;
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
        // Animate connecting line
        Animated.timing(lineAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION * 0.8,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, [index]);

  const handleDismiss = () => {
    if (!activity.dismissible) return;
    
    setIsDismissed(true);
    Animated.parallel([
      Animated.timing(dismissAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (isDismissed) return null;

  return (
    <Animated.View
      style={[
        styles.activityItemContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
            {
              translateX: dismissAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -300],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.timelineConnector}>
        {/* Timeline dot */}
        <View style={[styles.timelineDot, { backgroundColor: activity.color }]}>
          <MaterialCommunityIcons
            name={activity.icon as any}
            size={16}
            color="white"
          />
        </View>
        
        {/* Connecting line */}
        {!isLast && (
          <Animated.View
            style={[
              styles.timelineLine,
              {
                backgroundColor: activity.color,
                scaleY: lineAnim,
              },
            ]}
          />
        )}
      </View>

      <PressableAnimated
        onPress={onPress}
        style={styles.activityCard}
        hapticType="light"
      >
        <LinearGradient
          colors={[`${activity.color}15`, `${activity.color}05`]}
          style={styles.activityCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.activityCardContent}>
            <View style={styles.activityHeader}>
              <View style={styles.activityTitleContainer}>
                <Text style={[styles.activityTitle, { color: activity.color }]}>
                  {activity.title}
                </Text>
                <Text style={styles.activityTimestamp}>
                  {formatTimeAgo(activity.timestamp)}
                </Text>
              </View>
              
              {activity.dismissible && (
                <TouchableOpacity
                  onPress={handleDismiss}
                  style={styles.dismissButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.activityDescription}>
              {activity.description}
            </Text>

            {/* Metadata */}
            {activity.metadata && (
              <View style={styles.activityMetadata}>
                {activity.metadata.automationName && (
                  <View style={[styles.metadataTag, { borderColor: activity.color }]}>
                    <MaterialCommunityIcons name="puzzle" size={14} color={activity.color} />
                    <Text style={[styles.metadataText, { color: activity.color }]}>
                      {activity.metadata.automationName}
                    </Text>
                  </View>
                )}
                
                {activity.metadata.achievementName && (
                  <View style={[styles.metadataTag, { borderColor: activity.color }]}>
                    <MaterialCommunityIcons name="trophy" size={14} color={activity.color} />
                    <Text style={[styles.metadataText, { color: activity.color }]}>
                      {activity.metadata.achievementName}
                    </Text>
                  </View>
                )}
                
                {activity.metadata.runCount && (
                  <View style={[styles.metadataTag, { borderColor: activity.color }]}>
                    <MaterialCommunityIcons name="repeat" size={14} color={activity.color} />
                    <Text style={[styles.metadataText, { color: activity.color }]}>
                      {activity.metadata.runCount} runs
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </PressableAnimated>
    </Animated.View>
  );
};

const TimeGroupHeader: React.FC<{ group: string }> = ({ group }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.timeGroupHeader, { opacity: fadeAnim }]}>
      <View style={styles.timeGroupLine} />
      <Text style={styles.timeGroupText}>{group}</Text>
      <View style={styles.timeGroupLine} />
    </Animated.View>
  );
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  onActivityPress,
  onDismissActivity,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const [groupedActivities, setGroupedActivities] = useState<{ [key: string]: ActivityItem[] }>({});

  useEffect(() => {
    const grouped = activities.reduce((groups, activity) => {
      const group = getTimeGroup(activity.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(activity);
      return groups;
    }, {} as { [key: string]: ActivityItem[] });

    setGroupedActivities(grouped);
  }, [activities]);

  const handleDismissActivity = (activityId: string) => {
    onDismissActivity?.(activityId);
  };

  if (activities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="timeline-clock" size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>No Activity Yet</Text>
        <Text style={styles.emptyStateDescription}>
          Your activity timeline will appear here as you use the app
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
        
        if (isCloseToBottom && !isLoadingMore) {
          onLoadMore?.();
        }
      }}
      scrollEventThrottle={400}
    >
      <View style={styles.timeline}>
        {Object.entries(groupedActivities).map(([group, groupActivities], groupIndex) => (
          <View key={group}>
            <TimeGroupHeader group={group} />
            {groupActivities.map((activity, activityIndex) => (
              <AnimatedActivityItem
                key={activity.id}
                activity={activity}
                index={groupIndex * 10 + activityIndex}
                isLast={
                  groupIndex === Object.keys(groupedActivities).length - 1 &&
                  activityIndex === groupActivities.length - 1
                }
                onPress={() => onActivityPress?.(activity)}
                onDismiss={() => handleDismissActivity(activity.id)}
              />
            ))}
          </View>
        ))}
        
        {/* Load more indicator */}
        {isLoadingMore && (
          <View style={styles.loadingMore}>
            <Animated.View style={styles.loadingDot}>
              <MaterialCommunityIcons name="loading" size={24} color="#666" />
            </Animated.View>
            <Text style={styles.loadingText}>Loading more activities...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timeline: {
    paddingBottom: 20,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 20,
  },
  timeGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  timeGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  activityItemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineConnector: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 8,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    marginTop: 8,
    opacity: 0.3,
    transformOrigin: 'top',
  },
  activityCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activityCardGradient: {
    padding: 16,
  },
  activityCardContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityTitleContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  dismissButton: {
    padding: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  activityMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  metadataText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingDot: {
    marginRight: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});