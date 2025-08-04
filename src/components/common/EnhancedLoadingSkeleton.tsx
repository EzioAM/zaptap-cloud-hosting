import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface EnhancedLoadingSkeletonProps {
  variant?: 'card' | 'list' | 'profile' | 'automation' | 'stats';
  count?: number;
  width?: number | string;
  height?: number;
  borderRadius?: number;
  showAnimation?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const EnhancedLoadingSkeleton: React.FC<EnhancedLoadingSkeletonProps> = ({
  variant = 'card',
  count = 1,
  width = '100%',
  height = 120,
  borderRadius = 8,
  showAnimation = true,
}) => {
  const { theme } = useTheme();
  const shimmerTranslateX = useSharedValue(-screenWidth);

  React.useEffect(() => {
    if (showAnimation) {
      shimmerTranslateX.value = withRepeat(
        withTiming(screenWidth, {
          duration: 1500,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [showAnimation, shimmerTranslateX]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerTranslateX.value }],
    };
  });

  const baseStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius,
  };

  const shimmerStyle = {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: interpolate(
      shimmerTranslateX.value,
      [-screenWidth, 0, screenWidth],
      [0, 0.3, 0]
    ),
  };

  const renderVariant = () => {
    switch (variant) {
      case 'automation':
        return (
          <View style={[styles.automationCard, baseStyle]}>
            <View style={styles.automationHeader}>
              <View style={[styles.automationIcon, baseStyle]} />
              <View style={[styles.automationTitle, baseStyle]} />
              <View style={[styles.automationActions, baseStyle]} />
            </View>
            <View style={[styles.automationDescription, baseStyle]} />
            <View style={styles.automationFooter}>
              <View style={[styles.automationChip, baseStyle]} />
              <View style={[styles.automationChip, baseStyle]} />
              <View style={[styles.automationChip, baseStyle]} />
            </View>
            {showAnimation && (
              <Animated.View style={[shimmerStyle, animatedStyle]} />
            )}
          </View>
        );

      case 'stats':
        return (
          <View style={styles.statsContainer}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={[styles.statCard, baseStyle]}>
                <View style={[styles.statIcon, baseStyle]} />
                <View style={[styles.statNumber, baseStyle]} />
                <View style={[styles.statLabel, baseStyle]} />
                {showAnimation && (
                  <Animated.View style={[shimmerStyle, animatedStyle]} />
                )}
              </View>
            ))}
          </View>
        );

      case 'list':
        return (
          <View style={[styles.listItem, baseStyle]}>
            <View style={[styles.listItemIcon, baseStyle]} />
            <View style={styles.listItemContent}>
              <View style={[styles.listItemTitle, baseStyle]} />
              <View style={[styles.listItemSubtitle, baseStyle]} />
            </View>
            <View style={[styles.listItemAction, baseStyle]} />
            {showAnimation && (
              <Animated.View style={[shimmerStyle, animatedStyle]} />
            )}
          </View>
        );

      case 'profile':
        return (
          <View style={[styles.profileCard, baseStyle]}>
            <View style={[styles.profileAvatar, baseStyle]} />
            <View style={[styles.profileName, baseStyle]} />
            <View style={[styles.profileEmail, baseStyle]} />
            <View style={styles.profileStats}>
              <View style={[styles.profileStatItem, baseStyle]} />
              <View style={[styles.profileStatItem, baseStyle]} />
              <View style={[styles.profileStatItem, baseStyle]} />
            </View>
            {showAnimation && (
              <Animated.View style={[shimmerStyle, animatedStyle]} />
            )}
          </View>
        );

      default: // 'card'
        return (
          <View style={[{ width, height }, baseStyle]}>
            {showAnimation && (
              <Animated.View style={[shimmerStyle, animatedStyle]} />
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.skeletonItem}>
          {renderVariant()}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonItem: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  // Automation Card Skeleton
  automationCard: {
    padding: 16,
    marginHorizontal: 16,
    height: 140,
  },
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  automationIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  automationTitle: {
    flex: 1,
    height: 18,
    marginRight: 12,
  },
  automationActions: {
    width: 80,
    height: 24,
  },
  automationDescription: {
    height: 14,
    marginBottom: 16,
    width: '80%',
  },
  automationFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  automationChip: {
    width: 60,
    height: 20,
  },
  // Stats Container Skeleton
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    height: 100,
  },
  statIcon: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  statNumber: {
    width: 40,
    height: 20,
    marginBottom: 4,
  },
  statLabel: {
    width: 60,
    height: 12,
  },
  // List Item Skeleton
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    height: 72,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    height: 16,
    marginBottom: 6,
    width: '70%',
  },
  listItemSubtitle: {
    height: 12,
    width: '50%',
  },
  listItemAction: {
    width: 24,
    height: 24,
  },
  // Profile Card Skeleton
  profileCard: {
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    height: 200,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    width: 120,
    height: 18,
    marginBottom: 6,
  },
  profileEmail: {
    width: 160,
    height: 14,
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 16,
  },
  profileStatItem: {
    width: 60,
    height: 40,
  },
});

export default EnhancedLoadingSkeleton;